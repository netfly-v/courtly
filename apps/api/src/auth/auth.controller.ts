import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorDto } from '../common/api-error.dto.js';
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
  @ApiOkResponse({ type: UserDto, description: 'Sets the session cookie' })
  @ApiBadRequestResponse({
    type: ApiErrorDto,
    example: {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are not valid',
      details: { email: ['email must be a valid email address'] },
    },
  })
  @ApiUnauthorizedResponse({
    type: ApiErrorDto,
    example: { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Wrong email or password' },
  })
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
  @ApiNoContentResponse({ description: 'Clears the session cookie' })
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({
    type: ApiErrorDto,
    example: { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' },
  })
  me(@CurrentUser() user: SessionUser): Promise<UserDto> {
    return this.auth.getUser(user.id);
  }

  private cookieOptions() {
    return sessionCookieOptions(this.config.get('COOKIE_SECURE', { infer: true }) === 'true');
  }
}
