import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// No examples here: one schema serves every error, each response sets its own example.
export class ApiErrorDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty({ description: 'Stable code for the client to check' })
  code: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Extra data that depends on the code',
  })
  details?: Record<string, unknown>;
}

export const errorResponse = (
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) => ({ type: ApiErrorDto, example: { statusCode, code, message, details } });
