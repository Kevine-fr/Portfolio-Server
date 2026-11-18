import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { statusFromError } from '../common/mongo-errors';

/**
 * Mesure la durée et le code de chaque requête HTTP dans l'histogramme
 * `http_request_duration_seconds` (labels: method, route, status_code).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
    @InjectMetric('http_requests_total')
    private readonly counter: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const stopTimer = this.histogram.startTimer();

    const record = (statusCode: number) => {
      // req.route?.path = modèle ("/projects/:id") -> évite l'explosion de cardinalité
      const route: string =
        req.route?.path ??
        (typeof req.originalUrl === 'string'
          ? req.originalUrl.split('?')[0]
          : req.url) ??
        'unknown';
      const labels = { method: req.method, route, status_code: statusCode };
      stopTimer(labels);
      this.counter.inc(labels);
    };

    return next.handle().pipe(
      tap({
        next: () => record(res.statusCode),
        // On error the response has not been written yet: res.statusCode is
        // still 200, so derive the real status from the exception instead.
        error: (err) => record(statusFromError(err)),
      }),
    );
  }
}
