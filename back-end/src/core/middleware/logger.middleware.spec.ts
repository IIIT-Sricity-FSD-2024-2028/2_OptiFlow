import { LoggerMiddleware } from './logger.middleware';
import { LoggingService } from '../logging/logging.service';
import { EventEmitter } from 'events';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let loggingService: LoggingService;

  beforeEach(() => {
    loggingService = {
      logApplicationRequest: jest.fn(),
    } as any;
    middleware = new LoggerMiddleware(loggingService);
  });

  it('should call next and attach finish listener to log completed request', () => {
    const req = {
      method: 'GET',
      originalUrl: '/companies',
    } as any;

    const res = new EventEmitter() as any;
    res.statusCode = 200;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(loggingService.logApplicationRequest).not.toHaveBeenCalled();

    // Emit finish event
    res.emit('finish');

    expect(loggingService.logApplicationRequest).toHaveBeenCalledWith(
      'GET',
      '/companies',
      200,
      expect.any(Number),
    );
  });
});
