import { HttpStatus, Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/session.js';
import { ApiError } from '../common/api-error.js';
import { type Prisma, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isRecordNotFound, violatesConstraint } from '../prisma/prisma-errors.js';
import { type CourtDto, toCourtDto } from './court.dto.js';
import type { CreateCourtDto } from './create-court.dto.js';
import type { UpdateCourtDto } from './update-court.dto.js';

// The DB checks openHour < closeHour, also against the stored hour when a PATCH sends only one.
const OPENING_HOURS_CHECK = 'courts_opening_hours_check';

const courtNotFound = () =>
  new ApiError(HttpStatus.NOT_FOUND, 'COURT_NOT_FOUND', 'Court not found');

const closesBeforeOpening = () =>
  new ApiError(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Some fields are not valid', {
    closeHour: ['closeHour must be later than openHour'],
  });

const visibleTo = (user: SessionUser): Prisma.CourtWhereInput =>
  user.role === Role.ADMIN ? {} : { isActive: true };

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: SessionUser): Promise<CourtDto[]> {
    const courts = await this.prisma.court.findMany({
      where: visibleTo(user),
      orderBy: { name: 'asc' },
    });
    return courts.map(toCourtDto);
  }

  async get(id: string, user: SessionUser): Promise<CourtDto> {
    const court = await this.prisma.court.findFirst({ where: { id, ...visibleTo(user) } });
    if (!court) {
      throw courtNotFound();
    }
    return toCourtDto(court);
  }

  async create(data: CreateCourtDto): Promise<CourtDto> {
    try {
      return toCourtDto(await this.prisma.court.create({ data }));
    } catch (error) {
      if (violatesConstraint(error, OPENING_HOURS_CHECK)) {
        throw closesBeforeOpening();
      }
      throw error;
    }
  }

  async update(id: string, changes: UpdateCourtDto): Promise<CourtDto> {
    try {
      return toCourtDto(await this.prisma.court.update({ where: { id }, data: changes }));
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw courtNotFound();
      }
      if (violatesConstraint(error, OPENING_HOURS_CHECK)) {
        throw closesBeforeOpening();
      }
      throw error;
    }
  }
}
