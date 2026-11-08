import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { SessionUser } from '../auth/session.js';
import { errorResponse } from '../common/api-error.dto.js';
import { IdParamDto } from '../common/id-param.dto.js';
import { Role } from '../generated/prisma/client.js';
import { AvailabilityDto, AvailabilityQueryDto } from './availability.dto.js';
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
  @ApiOkResponse({ type: [CourtDto], description: 'Users get active courts only' })
  list(@CurrentUser() user: SessionUser): Promise<CourtDto[]> {
    return this.courts.list(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: CourtDto })
  @ApiNotFoundResponse({ ...notFound, description: 'Also for an inactive court, unless admin' })
  get(@Param() { id }: IdParamDto, @CurrentUser() user: SessionUser): Promise<CourtDto> {
    return this.courts.get(id, user);
  }

  @Get(':id/availability')
  @ApiOkResponse({ type: AvailabilityDto, description: 'One-hour slots of the day' })
  @ApiBadRequestResponse(
    errorResponse(400, 'VALIDATION_FAILED', 'Some fields are not valid', {
      date: ['date must be a real calendar day'],
    })
  )
  @ApiNotFoundResponse(notFound)
  availability(
    @Param() { id }: IdParamDto,
    @Query() { date }: AvailabilityQueryDto,
    @CurrentUser() user: SessionUser
  ): Promise<AvailabilityDto> {
    return this.courts.availability(id, date, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiCreatedResponse({ type: CourtDto })
  @ApiBadRequestResponse(badRequest)
  @ApiForbiddenResponse(forbidden)
  create(@Body() body: CreateCourtDto): Promise<CourtDto> {
    return this.courts.create(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOkResponse({ type: CourtDto })
  @ApiBadRequestResponse(badRequest)
  @ApiForbiddenResponse(forbidden)
  @ApiNotFoundResponse(notFound)
  update(@Param() { id }: IdParamDto, @Body() body: UpdateCourtDto): Promise<CourtDto> {
    return this.courts.update(id, body);
  }
}
