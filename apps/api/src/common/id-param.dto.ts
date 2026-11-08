import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// A bad id gets a 400 here; otherwise Postgres fails to parse it and the client sees a 500.
export class IdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;
}
