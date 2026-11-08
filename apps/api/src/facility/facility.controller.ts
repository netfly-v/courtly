import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { errorResponse } from '../common/api-error.dto.js';
import type { Environment } from '../config/environment.js';
import { FacilityDto } from './facility.dto.js';

@ApiTags('facility')
@ApiCookieAuth()
@Controller('facility')
export class FacilityController {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  @Get()
  @ApiOkResponse({ type: FacilityDto })
  @ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
  get(): FacilityDto {
    return { timezone: this.config.get('FACILITY_TIMEZONE', { infer: true }) };
  }
}
