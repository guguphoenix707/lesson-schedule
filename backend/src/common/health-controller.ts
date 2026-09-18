import { Controller, Get } from '@nestjs/common';

@Controller('common')
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
