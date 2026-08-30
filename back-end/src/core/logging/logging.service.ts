import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggingService {
  private readonly logsDir: string;
  private readonly sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'authorization',
    'secret',
    'apikey',
    'databaseurl',
    'database_url',
    'cookie',
    'credential',
    'bearer',
  ];

  constructor() {
    this.logsDir = this.resolveLogsDir();
    this.ensureLogsDirExists();
  }

  private resolveLogsDir(): string {
    let current = __dirname;
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, 'package.json'))) {
        return path.join(current, 'logs');
      }
      current = path.dirname(current);
    }
    return path.resolve(process.cwd(), 'logs');
  }

  public ensureLogsDirExists(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch {
      // Non-blocking fallback
    }
  }

  public getLogsDir(): string {
    return this.logsDir;
  }

  public getDateString(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  public getApplicationLogPath(date: Date = new Date()): string {
    return path.join(
      this.logsDir,
      `application-${this.getDateString(date)}.log`,
    );
  }

  public getErrorLogPath(date: Date = new Date()): string {
    return path.join(this.logsDir, `error-${this.getDateString(date)}.log`);
  }

  private async appendToFile(filePath: string, line: string): Promise<void> {
    try {
      this.ensureLogsDirExists();
      await fs.promises.appendFile(filePath, line + '\n', 'utf8');
    } catch (err) {
      // Must not crash application if logging fails
      console.error(
        `[LoggingService] Failed to write to log file: ${filePath}`,
        err,
      );
    }
  }

  public sanitizeString(content: string): string {
    if (!content) return content;
    let sanitized = content;

    // JWT token pattern: eyJ...
    sanitized = sanitized.replace(
      /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
      '[REDACTED_JWT]',
    );

    // Bearer token pattern
    sanitized = sanitized.replace(
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      'Bearer [REDACTED]',
    );

    // Database connection URL passwords: protocol://user:pass@host
    sanitized = sanitized.replace(
      /(postgres|postgresql|mysql|mongodb|mongodb\+srv):\/\/([^:]+):([^@]+)@/gi,
      '$1://$2:[REDACTED]@',
    );

    // Sensitive key-value assignments in query parameters, text, or json-like strings
    const pattern = new RegExp(
      `("?(?:${this.sensitiveKeys.join('|')})"?[\\s]*[:=][\\s]*["']?)([^"'\\s,&}{]+)(["']?)`,
      'gi',
    );
    sanitized = sanitized.replace(pattern, '$1[REDACTED]$3');

    return sanitized;
  }

  public sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return this.sanitizeString(obj);
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.sanitizeObject(item));
    }

    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some((s) => lowerKey.includes(s));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public async logApplicationRequest(
    method: string,
    reqPath: string,
    statusCode: number,
    durationMs: number,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    let level = 'INFO';
    if (statusCode >= 400 && statusCode < 500) {
      level = 'WARN';
    } else if (statusCode >= 500) {
      level = 'ERROR';
    }

    const sanitizedPath = this.sanitizeString(reqPath);
    const line = `${timestamp} ${level} ${method.toUpperCase()} ${sanitizedPath} ${statusCode} ${durationMs}ms`;
    await this.appendToFile(this.getApplicationLogPath(), line);
  }

  public async logError(
    method: string,
    reqPath: string,
    statusCode: number,
    message: string,
    stack?: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const sanitizedPath = this.sanitizeString(reqPath);
    let sanitizedMessage = this.sanitizeString(message || '');
    sanitizedMessage = sanitizedMessage
      .replace(/[\r\n]+/g, ' ')
      .replace(/"/g, "'");

    let line = `${timestamp} ERROR ${method.toUpperCase()} ${sanitizedPath} ${statusCode} message="${sanitizedMessage}"`;

    if (statusCode >= 500 && stack) {
      let sanitizedStack = this.sanitizeString(stack);
      sanitizedStack = sanitizedStack
        .replace(/[\r\n]+/g, ' \\n ')
        .replace(/"/g, "'");
      line += ` stack="${sanitizedStack}"`;
    }

    await this.appendToFile(this.getErrorLogPath(), line);
  }

  public async info(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const sanitized = this.sanitizeString(message);
    const line = `${timestamp} INFO ${sanitized}`;
    await this.appendToFile(this.getApplicationLogPath(), line);
  }

  public async warn(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const sanitized = this.sanitizeString(message);
    const line = `${timestamp} WARN ${sanitized}`;
    await this.appendToFile(this.getApplicationLogPath(), line);
  }

  public async error(message: string, stack?: string): Promise<void> {
    const timestamp = new Date().toISOString();
    let sanitizedMessage = this.sanitizeString(message);
    sanitizedMessage = sanitizedMessage
      .replace(/[\r\n]+/g, ' ')
      .replace(/"/g, "'");
    let line = `${timestamp} ERROR message="${sanitizedMessage}"`;
    if (stack) {
      let sanitizedStack = this.sanitizeString(stack);
      sanitizedStack = sanitizedStack
        .replace(/[\r\n]+/g, ' \\n ')
        .replace(/"/g, "'");
      line += ` stack="${sanitizedStack}"`;
    }
    await this.appendToFile(this.getErrorLogPath(), line);
  }
}
