import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly mongo: Connection) {}

  // Liveness — under the global prefix: GET /api/v1/health
  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      mongo: this.mongo.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}