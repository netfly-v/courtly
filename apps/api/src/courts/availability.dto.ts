import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';
import { CourtDto } from './court.dto.js';
import { type Slot, SlotStatus } from './slots.js';

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-11-09', description: 'A day in the facility time zone' })
  @Matches(/^20\d{2}-\d{2}-\d{2}$/, { message: 'date must be a day like 2026-11-09' })
  @IsISO8601({ strict: true }, { message: 'date must be a real calendar day' })
  date: string;
}

export class SlotDto {
  @ApiProperty({ format: 'date-time', example: '2026-11-09T10:00:00.000Z' })
  startsAt: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-09T11:00:00.000Z' })
  endsAt: string;

  @ApiProperty({ enum: SlotStatus, enumName: 'SlotStatus' })
  status: SlotStatus;

  @ApiProperty({ description: 'The slot is part of your own booking' })
  bookedByMe: boolean;
}

export class AvailabilityDto {
  @ApiProperty({ type: CourtDto })
  court: CourtDto;

  @ApiProperty({ example: '2026-11-09' })
  date: string;

  @ApiProperty({ type: [SlotDto] })
  slots: SlotDto[];
}

export const toSlotDto = (slot: Slot): SlotDto => ({
  startsAt: slot.startsAt.toISOString(),
  endsAt: slot.endsAt.toISOString(),
  status: slot.status,
  bookedByMe: slot.bookedByMe,
});
