import type { Sport } from '@/shared/api/generated/model';
import { Badge } from '@/shared/ui/badge';
import { formatSport } from '../format';
import { SPORT_TINT } from './sport-tone';

export const SportBadge = ({ sport }: { sport: Sport }) => (
  <Badge variant="secondary" className={SPORT_TINT[sport]}>
    {formatSport(sport)}
  </Badge>
);
