import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user';
import type { AuthenticatedUser } from '../auth/session-guard';
import { StudentsService } from './students-service';

@ApiTags('students')
@ApiCookieAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get(':studentId')
  @ApiOperation({ summary: 'Get one owned student and their trial course' })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentsService.getForUser(user, studentId);
  }
}
