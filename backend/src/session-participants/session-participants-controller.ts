import { Controller, Get } from '@nestjs/common';
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
    summary: 'List ended trial bookings the current teacher must record',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionParticipantsService.listPendingForTeacher(user);
  }
}
