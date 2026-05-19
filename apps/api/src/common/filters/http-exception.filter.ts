import type { ArgumentsHost, ExceptionFilter} from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const objectPayload = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};
    const message = typeof objectPayload.message === 'string'
      ? objectPayload.message
      : Array.isArray(objectPayload.message)
        ? 'Validation failed'
        : status === 500
          ? 'Internal server error'
          : String(payload ?? 'Request failed');
    const code = typeof objectPayload.code === 'string'
      ? objectPayload.code
      : status === 400
        ? ERROR_CODES.VALIDATION_FAILED
        : status === 403
          ? ERROR_CODES.FORBIDDEN
          : status === 500
            ? ERROR_CODES.INTERNAL_SERVER_ERROR
            : `HTTP_${status}`;

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details: objectPayload.details ?? (Array.isArray(objectPayload.message) ? objectPayload.message : undefined),
      },
      meta: {
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
