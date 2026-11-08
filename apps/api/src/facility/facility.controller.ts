import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { BOOKING_DAYS_AHEAD } from '../bookings/booking-rules.js';
import { errorResponse } from '../common/api-error.dto.js';
import type { Environment } from '../config/environment.js';
import { FacilityDto } from './facility.dto.js';

@ApiTags('facility')
@ApiCookieAuth()
@Controller('facility')
export class FacilityController {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  @Get()
  @ApiOperation({
    summary: 'Get the facility time zone and booking horizon',
    description:
      'Show every time in this time zone, not in the browser one. ' +
      'Users can book days from today up to today + bookingDaysAhead.',
  })
  @ApiOkResponse({ type: FacilityDto })
  @ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
  getFacility(): FacilityDto {
    return {
      timezone: this.config.get('FACILITY_TIMEZONE', { infer: true }),
      bookingDaysAhead: BOOKING_DAYS_AHEAD,
    };
  }
}
