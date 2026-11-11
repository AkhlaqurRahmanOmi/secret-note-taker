import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Paginated } from '../pagination/paginated';

export type SuccessResponse<T> = { data: T } | Paginated<T>;

/** Wraps results as { data }; Paginated results are already { data, meta }. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next
      .handle()
      .pipe(map((value) => (value instanceof Paginated ? value : { data: value ?? (null as T) })));
  }
}
