import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { SessionUser } from '../auth/session.js';
import { errorResponse } from '../common/api-error.dto.js';
import { DayQueryDto, invalidDayResponse } from '../common/day-query.dto.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { Role } from '../generated/prisma/client.js';
import { AvailabilityDto } from './availability.dto.js';
import { CourtDto } from './court.dto.js';
import { CourtsService } from './courts.service.js';
import { CreateCourtDto } from './create-court.dto.js';
import { UpdateCourtDto } from './update-court.dto.js';

const notFound = errorResponse(404, 'COURT_NOT_FOUND', 'Court not found');
const forbidden = errorResponse(403, 'FORBIDDEN', 'You are not allowed to do this');
const badRequest = errorResponse(400, 'VALIDATION_FAILED', 'Some fields are not valid', {
  closeHour: ['closeHour must be later than openHour'],
});

@ApiTags('courts')
@ApiCookieAuth()
@ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
@Controller('courts')
export class CourtsController {
  constructor(private readonly courts: CourtsService) {}

  @Get()
  @ApiOperation({
    summary: 'List courts',
    description: 'Users get active courts only. Admins get all courts, including turned-off ones.',
  })
  @ApiOkResponse({ type: [CourtDto] })
  list(@CurrentUser() user: SessionUser): Promise<CourtDto[]> {
    return this.courts.list(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get one court',
    description: 'Users get 404 for a turned-off court. Admins can still open it.',
  })
  @ApiOkResponse({ type: CourtDto })
  @ApiNotFoundResponse(notFound)
  get(@Param() { id }: IdParamDto, @CurrentUser() user: SessionUser): Promise<CourtDto> {
    return this.courts.get(id, user);
  }

  @Get(':id/availability')
  @ApiOperation({
    summary: 'Get the slots of a court for one day',
    description:
      'One-hour slots from opening to closing on a day in the facility time zone. ' +
      'Each slot is AVAILABLE, BOOKED or PAST, and bookedByMe marks your own bookings.',
  })
  @ApiOkResponse({ type: AvailabilityDto })
  @ApiBadRequestResponse(invalidDayResponse)
  @ApiNotFoundResponse(notFound)
  availability(
    @Param() { id }: IdParamDto,
    @Query() { date }: DayQueryDto,
    @CurrentUser() user: SessionUser
  ): Promise<AvailabilityDto> {
    return this.courts.availability(id, date, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Add a court',
    description: 'Admin only. A new court is active and takes bookings right away.',
  })
  @ApiCreatedResponse({ type: CourtDto })
  @ApiBadRequestResponse(badRequest)
  @ApiForbiddenResponse(forbidden)
  create(@Body() body: CreateCourtDto): Promise<CourtDto> {
    return this.courts.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Change a court or turn it off',
    description:
      'Admin only. Send only the fields you want to change. ' +
      'A turned-off court keeps its bookings but takes no new ones. ' +
      'New opening hours must still fit every upcoming booking.',
  })
  @ApiOkResponse({ type: CourtDto })
  @ApiBadRequestResponse(badRequest)
  @ApiForbiddenResponse(forbidden)
  @ApiNotFoundResponse(notFound)
  @ApiConflictResponse(
    errorResponse(
      409,
      'COURT_HAS_BOOKINGS_OUTSIDE_HOURS',
      'Some upcoming bookings fall outside the new opening hours',
      { count: 1, lastEndsAt: '2026-11-20T22:00:00.000Z' }
    )
  )
  update(@Param() { id }: IdParamDto, @Body() body: UpdateCourtDto): Promise<CourtDto> {
    return this.courts.update(id, body);
  }
}
