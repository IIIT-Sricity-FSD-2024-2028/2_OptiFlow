import { LoggerMiddleware } from './logger.middleware';
import { LoggingService } from '../logging/logging.service';
import { EventEmitter } from 'events';
import { Request, Response } from 'express';

describe('LoggerMiddleware', () => {
  let middleware: LoggerMiddleware;
  let loggingService: LoggingService;
  let logRequestSpy: jest.SpyInstance;

  beforeEach(() => {
    loggingService = new LoggingService();
    logRequestSpy = jest
      .spyOn(loggingService, 'logRequest')
      .mockResolvedValue();
    middleware = new LoggerMiddleware(loggingService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should call next and log request on response finish with correct level for 200', (done) => {
    const req = {
      method: 'GET',
      originalUrl: '/companies',
    } as unknown as Request;

    const resEmitter = Object.assign(new EventEmitter(), { statusCode: 200 });
    const res = resEmitter as unknown as Response;

    const next = jest.fn(() => {
      resEmitter.emit('finish');

      setTimeout(() => {
        expect(logRequestSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'INFO',
            method: 'GET',
            path: '/companies',
            statusCode: 200,
          }),
        );
        done();
      }, 10);
    });

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should log request with WARN level for 404', (done) => {
    const req = {
      method: 'GET',
      originalUrl: '/subscriptions/invalid',
    } as unknown as Request;

    const resEmitter = Object.assign(new EventEmitter(), { statusCode: 404 });
    const res = resEmitter as unknown as Response;

    const next = jest.fn(() => {
      resEmitter.emit('finish');

      setTimeout(() => {
        expect(logRequestSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'WARN',
            method: 'GET',
            path: '/subscriptions/invalid',
            statusCode: 404,
          }),
        );
        done();
      }, 10);
    });

    middleware.use(req, res, next);
  });

  it('should log request with ERROR level for 500', (done) => {
    const req = {
      method: 'POST',
      originalUrl: '/plans',
    } as unknown as Request;

    const resEmitter = Object.assign(new EventEmitter(), { statusCode: 500 });
    const res = resEmitter as unknown as Response;

    const next = jest.fn(() => {
      resEmitter.emit('finish');

      setTimeout(() => {
        expect(logRequestSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            level: 'ERROR',
            method: 'POST',
            path: '/plans',
            statusCode: 500,
          }),
        );
        done();
      }, 10);
    });

    middleware.use(req, res, next);
  });
});
