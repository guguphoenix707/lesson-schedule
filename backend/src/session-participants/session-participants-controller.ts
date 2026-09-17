import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import type { AuthenticatedUser } from '../auth/session-guard';
import { SessionParticipantsService } from './session-participants-service';

@ApiTags('session-participants')
@ApiCookieAuth()
@Controller('session-participants')
export class SessionParticipantsController {
  constructor(
    private readonly sessionParticipantsService: SessionParticipantsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List scheduled trial bookings for the current teacher, including sessions not yet ended',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionParticipantsService.listPendingForTeacher(user);
  }

  @Get(':participantId')
  @ApiOperation({
    summary: 'Get one pending trial booking the current teacher must record',
  })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.sessionParticipantsService.getPendingForTeacher(
      user,
      participantId,
    );
  }

  @Post(':participantId/attendance')
  @ApiOperation({
    summary: 'Record present or absent for a pending trial booking',
  })
  recordAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() body: unknown,
  ) {
    return this.sessionParticipantsService.recordAttendanceForTeacher(
      user,
      participantId,
      body,
    );
  }
}
