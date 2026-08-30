/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-return */
import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggingService } from '../logging/logging.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let loggingService: LoggingService;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    loggingService = {
      logError: jest.fn(),
    } as any;

    filter = new GlobalExceptionFilter(loggingService);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'POST',
      originalUrl: '/plans',
      url: '/plans',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('should catch HttpException and log error and send json response', () => {
    const exception = new BadRequestException('Validation failed');

    filter.catch(exception, mockHost);

    expect(loggingService.logError).toHaveBeenCalledWith(
      'POST',
      '/plans',
      400,
      'Validation failed',
      undefined,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/plans',
        message: 'Validation failed',
      }),
    );
  });

  it('should handle validation errors with array of messages', () => {
    const exception = new BadRequestException({
      message: ['name should not be empty', 'price must be a number'],
    });

    filter.catch(exception, mockHost);

    expect(loggingService.logError).toHaveBeenCalledWith(
      'POST',
      '/plans',
      400,
      'name should not be empty, price must be a number',
      undefined,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/plans',
        message: ['name should not be empty', 'price must be a number'],
      }),
    );
  });

  it('should handle unexpected 500 errors and include stack in logError while returning safe client response', () => {
    const error = new Error('Database connection lost');

    filter.catch(error, mockHost);

    expect(loggingService.logError).toHaveBeenCalledWith(
      'POST',
      '/plans',
      500,
      'Database connection lost',
      expect.any(String),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/plans',
        message: 'Internal server error',
      }),
    );
  });

  it('should handle Prisma P2002 unique constraint error as 409 Conflict', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`email`)',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: ['email'] },
      },
    );

    filter.catch(prismaError, mockHost);

    expect(loggingService.logError).toHaveBeenCalledWith(
      'POST',
      '/plans',
      409,
      expect.stringContaining('P2002'),
      undefined,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        path: '/plans',
        message: expect.stringContaining('email'),
      }),
    );
  });

  it('should handle Prisma P2025 not found error as 404 Not Found', () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      'An operation failed because it depends on one or more records that were required but not found.',
      {
        code: 'P2025',
        clientVersion: '6.19.3',
        meta: { cause: 'Record to delete does not exist.' },
      },
    );

    filter.catch(prismaError, mockHost);

    expect(loggingService.logError).toHaveBeenCalledWith(
      'POST',
      '/plans',
      404,
      expect.stringContaining('P2025'),
      undefined,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/plans',
        message: 'Requested record was not found',
      }),
    );
  });
});
