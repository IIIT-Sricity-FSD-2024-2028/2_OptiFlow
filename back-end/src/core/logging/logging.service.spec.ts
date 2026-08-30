import { Test, TestingModule } from '@nestjs/testing';
import { LoggingService } from './logging.service';
import * as fs from 'fs';

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingService],
    }).compile();

    service = module.get<LoggingService>(LoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Directory & Paths', () => {
    it('should resolve logs directory to back-end/logs', () => {
      const logsDir = service.getLogsDir();
      expect(logsDir).toBeDefined();
      expect(logsDir).toContain('logs');
    });

    it('should format date string as YYYY-MM-DD', () => {
      const d = new Date('2026-08-27T10:00:00Z');
      expect(service.getDateString(d)).toBe('2026-08-27');
    });

    it('should format application and error log paths with current date', () => {
      const d = new Date('2026-08-27T10:00:00Z');
      const appPath = service.getApplicationLogPath(d);
      const errPath = service.getErrorLogPath(d);
      expect(appPath).toContain('application-2026-08-27.log');
      expect(errPath).toContain('error-2026-08-27.log');
    });
  });

  describe('Sensitive Data Sanitization', () => {
    it('should sanitize passwords, tokens, secrets, and auth headers in strings', () => {
      const raw =
        'password="Secret123" token="xyz.123" authorization="Bearer abcdef"';
      const sanitized = service.sanitizeString(raw);
      expect(sanitized).not.toContain('Secret123');
      expect(sanitized).not.toContain('abcdef');
      expect(sanitized).toContain('password="[REDACTED]"');
    });

    it('should sanitize database URLs in strings', () => {
      const raw =
        'Connected to postgres://user:superSecretPass@localhost:5432/mydb';
      const sanitized = service.sanitizeString(raw);
      expect(sanitized).not.toContain('superSecretPass');
      expect(sanitized).toContain(
        'postgres://user:[REDACTED]@localhost:5432/mydb',
      );
    });

    it('should sanitize nested objects containing sensitive keys', () => {
      const rawObj = {
        name: 'Test Plan',
        password: 'myPassword!',
        nested: {
          refreshToken: 'refresh-12345',
          apiKey: 'key-98765',
          safeField: 'safeValue',
        },
      };
      const sanitized = service.sanitizeObject(rawObj) as Record<
        string,
        Record<string, unknown> | string
      >;
      expect(sanitized.name).toBe('Test Plan');
      expect(sanitized.password).toBe('[REDACTED]');
      const nested = sanitized.nested as Record<string, unknown>;
      expect(nested.refreshToken).toBe('[REDACTED]');
      expect(nested.apiKey).toBe('[REDACTED]');
      expect(nested.safeField).toBe('safeValue');
    });
  });

  describe('File Logging Operations', () => {
    it('should write application log entry formatted correctly', async () => {
      const today = new Date();
      const appLogPath = service.getApplicationLogPath(today);

      await service.logApplicationRequest('GET', '/companies', 200, 18);

      expect(fs.existsSync(appLogPath)).toBe(true);
      const content = fs.readFileSync(appLogPath, 'utf8');
      expect(content).toMatch(/INFO GET \/companies 200 18ms/);
    });

    it('should write error log entry formatted correctly for 4xx and 5xx', async () => {
      const today = new Date();
      const errLogPath = service.getErrorLogPath(today);

      await service.logError('POST', '/plans', 400, 'name should not be empty');
      await service.logError(
        'GET',
        '/subscriptions/123',
        500,
        'Database connection failed',
        'Error: Database connection failed at query...',
      );

      expect(fs.existsSync(errLogPath)).toBe(true);
      const content = fs.readFileSync(errLogPath, 'utf8');
      expect(content).toMatch(
        /ERROR POST \/plans 400 message="name should not be empty"/,
      );
      expect(content).toMatch(
        /ERROR GET \/subscriptions\/123 500 message="Database connection failed" stack=".*"/,
      );
    });
  });
});
