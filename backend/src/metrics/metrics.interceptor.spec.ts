import { NotFoundException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';

function setup() {
  const stop = jest.fn();
  const histogram = { startTimer: jest.fn(() => stop) } as any;
  const counter = { inc: jest.fn() } as any;
  const interceptor = new MetricsInterceptor(histogram, counter);
  const ctx: any = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', route: { path: '/api/v1/projects/:id' }, originalUrl: '/api/v1/projects/1?x=1' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  };
  return { stop, counter, interceptor, ctx };
}

describe('MetricsInterceptor', () => {
  it('records the route template and status of successful requests', async () => {
    const { stop, interceptor, ctx } = setup();
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of('ok') }));
    expect(stop).toHaveBeenCalledWith({ method: 'GET', route: '/api/v1/projects/:id', status_code: 200 });
  });

  it('counts each request in http_requests_total with the same labels', async () => {
    const { counter, interceptor, ctx } = setup();
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of('ok') }));
    expect(counter.inc).toHaveBeenCalledWith({ method: 'GET', route: '/api/v1/projects/:id', status_code: 200 });
  });

  it('records the real status of failed requests (was always 200)', async () => {
    const { stop, interceptor, ctx } = setup();
    await expect(lastValueFrom(interceptor.intercept(ctx, { handle: () => throwError(() => new NotFoundException()) }))).rejects.toThrow();
    expect(stop).toHaveBeenCalledWith(expect.objectContaining({ status_code: 404 }));
  });

  it('ignores non-HTTP contexts', async () => {
    const { stop, interceptor } = setup();
    await lastValueFrom(interceptor.intercept({ getType: () => 'rpc' } as any, { handle: () => of(1) }));
    expect(stop).not.toHaveBeenCalled();
  });
});
