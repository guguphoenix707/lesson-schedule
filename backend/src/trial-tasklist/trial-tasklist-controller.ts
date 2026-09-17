import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import type { AuthenticatedUser } from '../auth/session-guard';
import { TrialTasklistService } from './trial-tasklist-service';

@ApiTags('trial-tasklist')
@ApiCookieAuth()
@Controller('trial-tasklist')
export class TrialTasklistController {
  constructor(private readonly trialTasklistService: TrialTasklistService) {}

  @Get()
  @ApiOperation({
    summary: 'List trial cases whose students are owned by the current admin',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.trialTasklistService.listForAdmin(user);
  }
}
