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
    summary:
      'Book or reschedule an existing class session onto a trial case',
  })
  schedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
    @Body() body: unknown,
  ) {
    return this.trialCasesService.schedule(user, trialCaseId, body);
  }

  @Get(':trialCaseId')
  @ApiOperation({
    summary: 'Get follow-up context for an owned trial case',
  })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
  ) {
    return this.trialCasesService.getFollowup(user, trialCaseId);
  }

  @Post(':trialCaseId/followup-draft')
  @ApiOperation({
    summary: 'Save the admin communication draft without changing trial status',
  })
  saveFollowupDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
    @Body() body: unknown,
  ) {
    return this.trialCasesService.saveFollowupDraft(user, trialCaseId, body);
  }

  @Post(':trialCaseId/follow-ups')
  @ApiOperation({
    summary: 'Record a follow-up result on a pending or in-progress trial case',
  })
  createFollowUp(
    @CurrentUser() user: AuthenticatedUser,
    @Param('trialCaseId', ParseUUIDPipe) trialCaseId: string,
    @Body() body: unknown,
  ) {
    return this.trialCasesService.createFollowUp(user, trialCaseId, body);
  }
}
