import { Request, Response, NextFunction } from 'express';
import { ApiResponseError } from '../types';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  const response: ApiResponseError = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Requested route ${req.method} ${req.originalUrl} does not exist.`,
    },
  };
  res.status(404).json(response);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const response: ApiResponseError = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof Error) {
    process.stderr.write(`[Unhandled Error] ${err.name}: ${err.message}\n${err.stack ?? ''}\n`);
    const response: ApiResponseError = {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred. Please retry shortly.',
      },
    };
    res.status(500).json(response);
    return;
  }

  const response: ApiResponseError = {
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown fatal error occurred.',
    },
  };
  res.status(500).json(response);
}
