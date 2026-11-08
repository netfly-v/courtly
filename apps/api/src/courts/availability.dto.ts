import { ApiProperty } from '@nestjs/swagger';
import { CourtDto } from './court.dto.js';
import { type Slot, SlotStatus } from './slots.js';

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
