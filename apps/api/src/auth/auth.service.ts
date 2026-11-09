import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiError } from '../common/api-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { verifyPassword } from './password.js';
import { notLoggedIn, type SessionTokenPayload } from './session.js';
import { toUserDto, type UserDto } from './user.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // An unknown email skips scrypt and answers faster: an accepted timing leak.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Wrong email or password');
    }
    const payload: SessionTokenPayload = { sub: user.id };
    return { token: await this.jwt.signAsync(payload), user: toUserDto(user) };
  }

  async getUser(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw notLoggedIn();
    }
    return toUserDto(user);
  }
}
