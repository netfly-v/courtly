import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { SessionUser } from '../auth/session.js';
import { errorResponse, errorResponses } from '../common/api-error.dto.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { Role } from '../generated/prisma/client.js';
import { BookingDto } from './booking.dto.js';
import { BookingsService } from './bookings.service.js';
import { CreateBookingDto } from './create-booking.dto.js';
import { MyBookingsQueryDto } from './my-bookings-query.dto.js';

@ApiTags('bookings')
@ApiCookieAuth()
@Roles(Role.USER)
@ApiUnauthorizedResponse(errorResponse(401, 'UNAUTHENTICATED', 'Please log in'))
@ApiForbiddenResponse(errorResponse(403, 'FORBIDDEN', 'You are not allowed to do this'))
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Book a court for 1 or 2 hours',
    description:
      'Users only, admins get 403. ' +
      'The start must be on the hour, in the future, inside opening hours ' +
      'and on a day no later than today + 30 in the facility time zone. ' +
      'The price is fixed when the booking is made.',
  })
  @ApiCreatedResponse({ type: BookingDto })
  @ApiBadRequestResponse(
    errorResponse(400, 'VALIDATION_FAILED', 'Some fields are not valid', {
      durationHours: ['durationHours must be 1 or 2'],
    })
  )
  @ApiNotFoundResponse(errorResponse(404, 'COURT_NOT_FOUND', 'Court not found'))
  @ApiConflictResponse(errorResponse(409, 'SLOT_TAKEN', 'This time has just been booked'))
  @ApiUnprocessableEntityResponse(
    errorResponses(422, {
      COURT_INACTIVE: 'This court is not taking new bookings',
      SLOT_NOT_ALIGNED: 'Bookings start on the hour',
      BOOKING_IN_PAST: 'This time has already started',
      BOOKING_TOO_FAR_AHEAD: 'Bookings open 30 days ahead',
      OUTSIDE_OPENING_HOURS: 'The court is closed at this time',
    })
  )
  createBooking(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateBookingDto
  ): Promise<BookingDto> {
    return this.bookings.createBooking(user, body);
  }

  @Get('me')
  @ApiOperation({
    summary: 'List my upcoming or past bookings',
    description:
      'upcoming: not ended yet (in progress too), soonest first. ' +
      'past: ended, latest first. ' +
      'Cancelled bookings stay in both lists.',
  })
  @ApiOkResponse({ type: [BookingDto] })
  listMyBookings(
    @CurrentUser() user: SessionUser,
    @Query() { scope }: MyBookingsQueryDto
  ): Promise<BookingDto[]> {
    return this.bookings.listMyBookings(user, scope);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel my booking',
    description:
      'Possible until 2 hours before the start, including that exact moment. ' +
      'The booking stays in the lists as CANCELLED. A booking of another user gives 404.',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse(errorResponse(404, 'BOOKING_NOT_FOUND', 'Booking not found'))
  @ApiConflictResponse(errorResponse(409, 'BOOKING_ALREADY_CANCELLED', 'Already cancelled'))
  @ApiUnprocessableEntityResponse(
    errorResponse(
      422,
      'CANCELLATION_WINDOW_CLOSED',
      'Bookings can be cancelled up to 2 hours before the start',
      { cancellableUntil: '2026-11-10T08:00:00.000Z' }
    )
  )
  cancelBooking(
    @CurrentUser() user: SessionUser,
    @Param() { id }: IdParamDto
  ): Promise<BookingDto> {
    return this.bookings.cancelBooking(user, id);
  }
}
