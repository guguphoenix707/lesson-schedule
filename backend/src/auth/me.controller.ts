import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { SessionGuard, type AuthenticatedUser } from './session.guard';

type RequestWithUser = FastifyRequest & {
  user: AuthenticatedUser;
};

@Controller('api')
export class MeController {
  @Get('me')
  @UseGuards(SessionGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ description: 'Current staff session' })
  @ApiUnauthorizedResponse()
  me(@Req() request: RequestWithUser): AuthenticatedUser {
    return request.user;
  }
}
