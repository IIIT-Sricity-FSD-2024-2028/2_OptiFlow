import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface RequestLogEntry {
  timestamp?: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

export interface ErrorLogEntry {
  timestamp?: string;
  method: string;
  path: string;
  statusCode: number;
  message: string;
  stack?: string;
}

@Injectable()
export class LoggingService implements NestLoggerService {
  private readonly logsDir: string;

  constructor() {
    this.logsDir = this.resolveLogsDirectory();
    this.ensureLogsDirectory();
  }

  /**
   * Resolves the logs directory relative to the backend project root,
   * regardless of the current working directory.
   */
  private resolveLogsDirectory(): string {
    let currentDir = __dirname;
    while (currentDir !== path.parse(currentDir).root) {
      const packageJsonPath = path.join(currentDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkgContent = fs.readFileSync(packageJsonPath, 'utf8');
          const pkg = JSON.parse(pkgContent) as { name?: string };
          if (pkg.name === 'back-end') {
            return path.join(currentDir, 'logs');
          }
        } catch {
          // ignore error and continue searching upwards
        }
      }
      currentDir = path.dirname(currentDir);
    }
    // Fallback: assuming structure back-end/(src|dist)/core/logging
    return path.resolve(__dirname, '../../..', 'logs');
  }

  private ensureLogsDirectory(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (err) {
      console.error('[LoggingService] Failed to create logs directory:', err);
    }
  }

  public getLogsDirectory(): string {
    return this.logsDir;
  }

  /**
   * Helper to format UTC Date as YYYY-MM-DD for daily rotation.
   */
  private getDateString(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  /**
   * Sanitizes sensitive fields from any string, object, or array before logging.
   */
  public sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      let sanitized = data;

      // 1. Redact Bearer tokens
      sanitized = sanitized.replace(
        /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi,
        'Bearer [REDACTED]',
      );

      // 2. Redact JWT tokens (header.payload.signature)
      sanitized = sanitized.replace(
        /\beyJ[A-Za-z0-9\-_%]+\.[A-Za-z0-9\-_%]+\.[A-Za-z0-9\-_%]+\b/gi,
        '[REDACTED_JWT]',
      );

      // 3. Redact common sensitive key-value pairs (JSON or query/plain strings)
      const sensitiveKeys = [
        'password',
        'passwordhash',
        'token',
        'accesstoken',
        'refreshtoken',
        'authorization',
        'secret',
        'apikey',
        'api_key',
        'databaseurl',
        'database_url',
        'cookie',
      ];
      const sensitiveKeyPattern = sensitiveKeys.join('|');

      // Match "key": "value" or key="value" or key=value or key: value
      const kvRegex = new RegExp(
        `(["']?(?:${sensitiveKeyPattern})["']?\\s*[:=]\\s*["']?)(?:Bearer\\s+)?((?!\\[REDACTED)[^"',\\s{}]+)(["']?)`,
        'gi',
      );
      sanitized = sanitized.replace(
        kvRegex,
        (match: string, p1: string, _p2: string, p3: string) => {
          if (
            p1.toLowerCase().includes('authorization') &&
            match.toLowerCase().includes('bearer')
          ) {
            return `${p1}Bearer [REDACTED]${p3}`;
          }
          return `${p1}[REDACTED]${p3}`;
        },
      );

      return sanitized;
    }

    if (Array.isArray(data)) {
      return data.map((item: unknown) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sensitiveKeyRegex =
        /^(password|passwordhash|token|accesstoken|refreshtoken|authorization|secret|apikey|api_key|databaseurl|database_url|cookie)$/i;

      const obj = data as Record<string, unknown>;
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveKeyRegex.test(key)) {
          sanitizedObj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitizedObj[key] = this.sanitize(value);
        } else if (typeof value === 'string') {
          sanitizedObj[key] = this.sanitize(value);
        } else {
          sanitizedObj[key] = value;
        }
      }
      return sanitizedObj;
    }

    return data;
  }

  /**
   * Appends a log line asynchronously to the target file.
   * Fails safe without throwing unhandled exceptions.
   */
  private async appendToFile(filePath: string, line: string): Promise<void> {
    try {
      this.ensureLogsDirectory();
      await fs.promises.appendFile(filePath, line + '\n', 'utf8');
    } catch (err) {
      // Safe fallback: never crash the application because logging failed
      console.error(`[LoggingService] Failed writing to ${filePath}:`, err);
    }
  }

  /**
   * Logs a completed HTTP request to the daily application log.
   * Format: <ISO_TIMESTAMP> <LEVEL> <METHOD> <PATH> <STATUS> <DURATION>ms
   */
  public async logRequest(entry: RequestLogEntry): Promise<void> {
    const timestamp = entry.timestamp || new Date().toISOString();
    const sanitizedPath = String(this.sanitize(entry.path));
    const line = `${timestamp} ${entry.level} ${entry.method} ${sanitizedPath} ${entry.statusCode} ${entry.durationMs}ms`;

    const filePath = this.getApplicationLogPath(new Date(timestamp));
    await this.appendToFile(filePath, line);
  }

  /**
   * Logs an HTTP exception / error to the daily error log.
   * Format: <ISO_TIMESTAMP> ERROR <METHOD> <PATH> <STATUS> message="<MESSAGE>" [stack="<STACK>"]
   */
  public async logError(entry: ErrorLogEntry): Promise<void> {
    const timestamp = entry.timestamp || new Date().toISOString();
    const sanitizedPath = String(this.sanitize(entry.path));
    const sanitizedMessage = String(
      this.sanitize(entry.message || 'Unknown error'),
    );

    // Clean up quotes and newlines in message for single-line format
    const cleanedMessage = sanitizedMessage
      .replace(/"/g, "'")
      .replace(/\r?\n/g, ' ');

    let line = `${timestamp} ERROR ${entry.method} ${sanitizedPath} ${entry.statusCode} message="${cleanedMessage}"`;

    if (entry.statusCode >= 500 && entry.stack) {
      const sanitizedStack = String(this.sanitize(entry.stack));
      const cleanedStack = sanitizedStack
        .replace(/"/g, "'")
        .replace(/\r?\n/g, ' \\n ');
      line += ` stack="${cleanedStack}"`;
    }

    const filePath = this.getErrorLogPath(new Date(timestamp));
    await this.appendToFile(filePath, line);
  }

  // Nest LoggerService compatibility methods
  public log(message: unknown, ...optionalParams: unknown[]) {
    const sanitized = this.sanitize(message);
    console.log(`[LOG] ${String(sanitized)}`, ...optionalParams);
  }

  public info(message: unknown, ...optionalParams: unknown[]) {
    const sanitized = this.sanitize(message);
    console.log(`[INFO] ${String(sanitized)}`, ...optionalParams);
  }

  public warn(message: unknown, ...optionalParams: unknown[]) {
    const sanitized = this.sanitize(message);
    console.warn(`[WARN] ${String(sanitized)}`, ...optionalParams);
  }

  public error(message: unknown, trace?: string, ...optionalParams: unknown[]) {
    const sanitized = this.sanitize(message);
    const sanitizedTrace = trace ? String(this.sanitize(trace)) : undefined;
    console.error(
      `[ERROR] ${String(sanitized)}`,
      sanitizedTrace,
      ...optionalParams,
    );
  }
}
