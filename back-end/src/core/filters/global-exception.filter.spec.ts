import { GlobalExceptionFilter } from './global-exception.filter';
import { LoggingService } from '../logging/logging.service';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

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
  });

  it('should handle unexpected 500 errors and include stack in logError', () => {
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
        message: 'Database connection lost',
      }),
    );
  });
});
