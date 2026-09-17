import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import type { AuthenticatedUser } from '../auth/session-guard';
import { TrialCasesService } from './trial-cases-service';

@ApiTags('trial-cases')
@ApiCookieAuth()
@Controller('trial-cases')
export class TrialCasesController {
  constructor(private readonly trialCasesService: TrialCasesService) {}

  @Get(':trialCaseId/schedulable-sessions')
  @ApiOperation({
    summary: 'List future class sessions that can be booked for this trial case',
  })
  listSchedulableSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
  ) {
    return this.trialCasesService.listSchedulableSessions(user, trialCaseId);
  }

  @Post(':trialCaseId/schedule')
  @ApiOperation({
    summary: 'Book an existing class session onto a pending trial case',
  })
  schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
    @Body() body: unknown,
  ) {
    return this.trialCasesService.schedule(user, trialCaseId, body);
  }
}
