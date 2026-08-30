import * as fs from 'fs';
import { LoggingService } from './logging.service';

interface NestedSanitizeResult {
  email: string;
  password: string;
  nested: {
    accessToken: string;
    apiKey: string;
    normalField: string;
  };
  list: Array<{ token: string; name: string }>;
}

describe('LoggingService', () => {
  let service: LoggingService;

  beforeEach(() => {
    service = new LoggingService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resolve logs directory and ensure it exists', () => {
    const logsDir = service.getLogsDirectory();
    expect(logsDir).toBeDefined();
    expect(logsDir.endsWith('logs')).toBe(true);
    expect(fs.existsSync(logsDir)).toBe(true);
  });

  it('should generate correct daily application and error log paths', () => {
    const testDate = new Date('2026-08-27T12:00:00.000Z');
    const appLogPath = service.getApplicationLogPath(testDate);
    const errLogPath = service.getErrorLogPath(testDate);

    expect(appLogPath).toContain('application-2026-08-27.log');
    expect(errLogPath).toContain('error-2026-08-27.log');
  });

  describe('Sanitization', () => {
    it('should sanitize bearer tokens and JWTs in strings', () => {
      const input =
        'Authorization: Bearer secret-token-123 and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const sanitized = String(service.sanitize(input));

      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).toContain('[REDACTED_JWT]');
      expect(sanitized).not.toContain('secret-token-123');
    });

    it('should sanitize key-value pairs in strings', () => {
      const input =
        'user created with password="MySecretPassword123" and token=abc12345';
      const sanitized = String(service.sanitize(input));

      expect(sanitized).toContain('password="[REDACTED]"');
      expect(sanitized).toContain('token=[REDACTED]');
      expect(sanitized).not.toContain('MySecretPassword123');
    });

    it('should sanitize sensitive keys in objects and nested structures', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Password123!',
        nested: {
          accessToken: 'jwt-access-token',
          apiKey: 'super-secret-key',
          normalField: 'hello',
        },
        list: [{ token: 'token-in-list', name: 'Item 1' }],
      };

      const sanitized = service.sanitize(payload) as NestedSanitizeResult;
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.nested.accessToken).toBe('[REDACTED]');
      expect(sanitized.nested.apiKey).toBe('[REDACTED]');
      expect(sanitized.nested.normalField).toBe('hello');
      expect(sanitized.list[0].token).toBe('[REDACTED]');
      expect(sanitized.list[0].name).toBe('Item 1');
    });
  });

  describe('File Writing & Persistence', () => {
    it('should write application log entry and append subsequent entries', async () => {
      const testDate = new Date('2026-08-27T08:00:00.000Z');
      const logFile = service.getApplicationLogPath(testDate);

      // Clean test file if exists
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      await service.logRequest({
        timestamp: '2026-08-27T08:00:00.000Z',
        level: 'INFO',
        method: 'GET',
        path: '/companies',
        statusCode: 200,
        durationMs: 18,
      });

      await service.logRequest({
        timestamp: '2026-08-27T08:00:01.000Z',
        level: 'WARN',
        method: 'GET',
        path: '/subscriptions/invalid',
        statusCode: 404,
        durationMs: 12,
      });

      expect(fs.existsSync(logFile)).toBe(true);
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
      expect(lines[0]).toBe(
        '2026-08-27T08:00:00.000Z INFO GET /companies 200 18ms',
      );
      expect(lines[1]).toBe(
        '2026-08-27T08:00:01.000Z WARN GET /subscriptions/invalid 404 12ms',
      );

      // Cleanup
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    });

    it('should write error log entry and include stack for 500 errors', async () => {
      const testDate = new Date('2026-08-27T08:00:00.000Z');
      const logFile = service.getErrorLogPath(testDate);

      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }

      await service.logError({
        timestamp: '2026-08-27T08:00:00.000Z',
        method: 'POST',
        path: '/plans',
        statusCode: 400,
        message: 'name should not be empty',
      });

      await service.logError({
        timestamp: '2026-08-27T08:00:01.000Z',
        method: 'GET',
        path: '/subscriptions/123',
        statusCode: 500,
        message: 'Database connection failed',
        stack: 'Error: Database connection failed\n    at test.ts:10:5',
      });

      expect(fs.existsSync(logFile)).toBe(true);
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines.length).toBe(2);
      expect(lines[0]).toBe(
        '2026-08-27T08:00:00.000Z ERROR POST /plans 400 message="name should not be empty"',
      );
      expect(lines[1]).toContain(
        '2026-08-27T08:00:01.000Z ERROR GET /subscriptions/123 500 message="Database connection failed" stack=',
      );
      expect(lines[1]).toContain('Database connection failed');

      // Cleanup
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    });
  });
});
