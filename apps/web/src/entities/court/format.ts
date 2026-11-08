import type { Sport } from '@/shared/api/generated/model';

const SPORT_LABELS: Record<Sport, string> = {
  PADEL: 'Padel',
  TENNIS: 'Tennis',
  SQUASH: 'Squash',
  PICKLEBALL: 'Pickleball',
  BADMINTON: 'Badminton',
};

const euros = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export const formatSport = (sport: Sport) => SPORT_LABELS[sport];

export const formatHourlyPrice = (cents: number) => `${euros.format(cents / 100)} / hour`;

export const formatOpeningHours = (openHour: number, closeHour: number) =>
  `${formatHour(openHour)}–${formatHour(closeHour)}`;
