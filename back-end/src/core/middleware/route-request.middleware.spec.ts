/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { RouteRequestMiddleware } from './route-request.middleware';

describe('RouteRequestMiddleware', () => {
  let middleware: RouteRequestMiddleware;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    middleware = new RouteRequestMiddleware();
    mockRequest = {};
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set X-Route-Processed header to users and call next()', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Route-Processed',
      'users',
    );
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
