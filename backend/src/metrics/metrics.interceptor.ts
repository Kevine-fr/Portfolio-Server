import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Mesure la durée et le code de chaque requête HTTP dans l'histogramme
 * `http_request_duration_seconds` (labels: method, route, status_code).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const stopTimer = this.histogram.startTimer();

    const record = () => {
      // req.route?.path = modèle ("/projects/:id") -> évite l'explosion de cardinalité
      const route: string =
        req.route?.path ??
        (typeof req.originalUrl === 'string'
          ? req.originalUrl.split('?')[0]
          : req.url) ??
        'unknown';
      stopTimer({
        method: req.method,
        route,
        status_code: res.statusCode,
      });
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
