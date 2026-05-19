import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
// Reflector must be a value import for Nest `emitDecoratorMetadata` / DI typing on this class.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- runtime class for DI
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { SKIP_RESPONSE_ENVELOPE_KEY } from '../decorators/skip-response-envelope.decorator';
import type { PaginatedResult } from '../utils/pagination.util';

function isPaginated<T>(data: unknown): data is PaginatedResult<T> {
  return typeof data === 'object' && data !== null && 'items' in data && 'meta' in data;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data: unknown) =>
        isPaginated(data) ? { success: true, data: data.items, meta: data.meta } : { success: true, data },
      ),
    );
  }
}
