import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators.js';
import { errorResponse } from '../common/api-error.dto.js';
import { DayQueryDto, invalidDayResponse } from '../common/day-query.dto.js';
import { Role } from '../generated/prisma/client.js';
import { AdminDayDto } from './admin-day.dto.js';
import { AdminService } from './admin.service.js';

@ApiTags('admin')
@ApiCookieAuth()
@Roles(Role.ADMIN)
@ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
@ApiForbiddenResponse(errorResponse(403, 'FORBIDDEN', 'You are not allowed to do this'))
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('bookings')
  @ApiOperation({
    summary: 'List all bookings of a day with the revenue',
    description:
      'Admin only. Bookings that start on this day in the facility time zone, ' +
      'turned-off courts included, earliest first, then by court name. ' +
      'Cancelled bookings are listed but not part of the revenue.',
  })
  @ApiOkResponse({ type: AdminDayDto })
  @ApiBadRequestResponse(invalidDayResponse)
  listDayBookings(@Query() { date }: DayQueryDto): Promise<AdminDayDto> {
    return this.admin.listDayBookings(date);
  }
}
