import { ApiProperty } from '@nestjs/swagger';
import { Role, type User } from '../generated/prisma/client.js';

export class UserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'admin@courtly.dev' })
  email: string;

  @ApiProperty({ example: 'Vitalii' })
  name: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.ADMIN })
  role: Role;
}

// No spread: the UserDto return type still accepts a whole User, passwordHash included.
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});
