import { Badge } from '@/shared/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

interface CourtCardProps {
  name: string;
  sport: string;
  openingHours: string;
  price: string;
  badge?: string;
}

export const CourtCard = ({ name, sport, openingHours, price, badge }: CourtCardProps) => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>
        <h2>{name}</h2>
      </CardTitle>
      <CardDescription>{sport}</CardDescription>
      {badge && (
        <CardAction>
          <Badge variant="secondary">{badge}</Badge>
        </CardAction>
      )}
    </CardHeader>
    <CardContent className="mt-auto flex items-center justify-between">
      <span className="text-muted-foreground">{openingHours}</span>
      <span className="font-medium">{price}</span>
    </CardContent>
  </Card>
);
