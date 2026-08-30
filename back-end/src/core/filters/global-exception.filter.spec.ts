import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggingService } from '../logging/logging.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ArgumentsHost,
} from '@nestjs/common';
import { Request, Response } from 'express';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggingService: LoggingService;
  let logErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    loggingService = new LoggingService();
    logErrorSpy = jest.spyOn(loggingService, 'logError').mockResolvedValue();
    filter = new GlobalExceptionFilter(loggingService);
  });

  const createMockHost = (
    req: Partial<Request>,
    res: Partial<Response>,
  ): ArgumentsHost => {
    return {
      switchToHttp: () => ({
        getRequest: () => req as Request,
        getResponse: () => res as Response,
      }),
    } as unknown as ArgumentsHost;
  };

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException (404 NotFound)', () => {
    const req = { originalUrl: '/subscriptions/nonexistent', method: 'GET' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createMockHost(req, res as unknown as Response);
    const exception = new NotFoundException('Subscription not found');

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/subscriptions/nonexistent',
        message: 'Subscription not found',
      }),
    );
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/subscriptions/nonexistent',
        statusCode: 404,
        message: 'Subscription not found',
      }),
    );
  });

  it('should handle validation errors (400 BadRequest with array message)', () => {
    const req = { originalUrl: '/plans', method: 'POST' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createMockHost(req, res as unknown as Response);
    const exception = new BadRequestException([
      'name should not be empty',
      'price must be a number',
    ]);

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/plans',
        message: 'name should not be empty, price must be a number',
      }),
    );
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/plans',
        statusCode: 400,
        message: 'name should not be empty, price must be a number',
      }),
    );
  });

  it('should handle 403 ForbiddenException', () => {
    const req = { originalUrl: '/governance', method: 'GET' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createMockHost(req, res as unknown as Response);
    const exception = new ForbiddenException('Forbidden resource');

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        path: '/governance',
        message: 'Forbidden resource',
      }),
    );
    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/governance',
        statusCode: 403,
        message: 'Forbidden resource',
      }),
    );
  });

  it('should handle unexpected 500 Error and log stack trace while not exposing stack in JSON response', () => {
    const req = { originalUrl: '/companies', method: 'GET' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createMockHost(req, res as unknown as Response);
    const exception = new Error('Database connection failed');

    filter.catch(exception, host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/companies',
        message: 'Database connection failed',
      }),
    );
    const jsonCalls = res.json.mock.calls as Array<[Record<string, unknown>]>;
    const responsePayload = jsonCalls[0][0];
    expect(responsePayload.stack).toBeUndefined();

    expect(logErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/companies',
        statusCode: 500,
        message: 'Database connection failed',
        stack: expect.any(String) as unknown as string,
      }),
    );
  });
});
