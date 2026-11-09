import { cn } from 'cn';
import type { Sport } from '@/shared/api/generated/model';
import { SPORT_FILL } from './sport-tone';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CourtPlan {
  surface: Box;
  lines: string;
  net?: string;
  walls?: string;
  zone?: Box;
}

// Drawn to scale from real court sizes, in the 120 × 70 viewBox.
const PLANS: Record<Sport, CourtPlan> = {
  TENNIS: {
    surface: { x: 10, y: 11.92, width: 100, height: 46.16 },
    lines:
      'M10 17.68H110M10 52.32H110M33.07 17.68V52.32M86.93 17.68V52.32M33.07 35H86.93M10 35H11.5M110 35H108.5',
    net: 'M60 9V61',
  },
  PADEL: {
    surface: { x: 10, y: 10, width: 100, height: 50 },
    lines: 'M25.25 10V60M94.75 10V60M25.25 35H94.75',
    net: 'M60 8V62',
    walls: 'M30 10H10V60H30M90 10H110V60H90',
  },
  PICKLEBALL: {
    surface: { x: 10, y: 12.27, width: 100, height: 45.46 },
    lines: 'M44.09 12.27V57.73M75.91 12.27V57.73M10 35H44.09M75.91 35H110',
    net: 'M60 9V61',
    zone: { x: 44.09, y: 12.27, width: 31.82, height: 45.46 },
  },
  BADMINTON: {
    surface: { x: 10, y: 12.24, width: 100, height: 45.52 },
    lines:
      'M10 15.67H110M10 54.33H110M15.67 12.24V57.76M104.33 12.24V57.76M45.22 12.24V57.76M74.78 12.24V57.76M10 35H45.22M74.78 35H110',
    net: 'M60 9V61',
  },
  SQUASH: {
    surface: { x: 21.92, y: 10, width: 76.16, height: 50 },
    lines: 'M55.58 10V60M55.58 35H98.08M55.58 22.5H68.08V10M55.58 47.5H68.08V60',
    walls: 'M21.92 10V60',
  },
};

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  vectorEffect: 'non-scaling-stroke',
} as const;

interface CourtDrawingProps {
  sport: Sport;
  variant?: 'filled' | 'outline';
  className?: string;
}

export const CourtDrawing = ({ sport, variant = 'filled', className }: CourtDrawingProps) => {
  const plan = PLANS[sport];
  const filled = variant === 'filled';

  return (
    <svg
      viewBox="0 0 120 70"
      preserveAspectRatio={filled ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden
      className={cn('block', { 'text-white': filled }, className)}
    >
      {filled && <rect width="120" height="70" className={SPORT_FILL[sport]} />}
      {filled && <rect {...plan.surface} className="fill-white/10" />}
      {plan.zone && <rect {...plan.zone} className="fill-current opacity-15" />}
      <rect {...plan.surface} {...stroke} strokeWidth={1.5} />
      <path d={plan.lines} {...stroke} strokeWidth={1.5} />
      {plan.net && <path d={plan.net} {...stroke} strokeWidth={2.5} />}
      {plan.walls && <path d={plan.walls} {...stroke} strokeWidth={4} />}
    </svg>
  );
};
