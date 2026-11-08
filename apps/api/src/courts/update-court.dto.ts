import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateCourtDto } from './create-court.dto.js';

// Plain IsOptional lets `null` reach Prisma (a 500); this way `null` fails validation (a 400).
export class UpdateCourtDto extends PartialType(CreateCourtDto, { skipNullProperties: false }) {
  @ApiPropertyOptional({ description: 'false hides the court from users' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
