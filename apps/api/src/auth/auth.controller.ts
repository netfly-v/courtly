import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { errorResponse } from '../common/api-error.dto.js';
import type { Environment } from '../config/environment.js';
import { AuthService } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';
import { LoginDto } from './login.dto.js';
import { SESSION_COOKIE, sessionCookieOptions, type SessionUser } from './session.js';
import { UserDto } from './user.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Environment, true>
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in with email and password',
    description: 'Public. Sets an httpOnly session cookie for 8 hours and returns the user.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiBadRequestResponse(
    errorResponse(400, 'VALIDATION_FAILED', 'Some fields are not valid', {
      email: ['email must be a valid email address'],
    })
  )
  @ApiUnauthorizedResponse(errorResponse(401, 'INVALID_CREDENTIALS', 'Wrong email or password'))
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<UserDto> {
    const { token, user } = await this.auth.login(body.email, body.password);
    response.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return user;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Log out',
    description: 'Public, so a user with an expired session can still log out.',
  })
  @ApiNoContentResponse({ description: 'Clears the session cookie' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Get the logged-in user',
    description:
      'Reads the user from the session cookie. ' +
      'Use it to find out who is logged in and with which role.',
  })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
  getMe(@CurrentUser() user: SessionUser): Promise<UserDto> {
    return this.auth.getUser(user.id);
  }

  private cookieOptions() {
    return sessionCookieOptions(this.config.get('COOKIE_SECURE', { infer: true }) === 'true');
  }
}
