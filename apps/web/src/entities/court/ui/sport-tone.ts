import type { Sport } from '@/shared/api/generated/model';

// Written out in full: Tailwind only generates classes it can find in the code.
export const SPORT_BACKGROUND: Record<Sport, string> = {
  PADEL: 'bg-sport-padel',
  TENNIS: 'bg-sport-tennis',
  SQUASH: 'bg-sport-squash',
  PICKLEBALL: 'bg-sport-pickleball',
  BADMINTON: 'bg-sport-badminton',
};

export const SPORT_FILL: Record<Sport, string> = {
  PADEL: 'fill-sport-padel',
  TENNIS: 'fill-sport-tennis',
  SQUASH: 'fill-sport-squash',
  PICKLEBALL: 'fill-sport-pickleball',
  BADMINTON: 'fill-sport-badminton',
};

export const SPORT_TINT: Record<Sport, string> = {
  PADEL: 'bg-sport-padel/10 text-sport-padel',
  TENNIS: 'bg-sport-tennis/10 text-sport-tennis',
  SQUASH: 'bg-sport-squash/10 text-sport-squash',
  PICKLEBALL: 'bg-sport-pickleball/10 text-sport-pickleball',
  BADMINTON: 'bg-sport-badminton/10 text-sport-badminton',
};
