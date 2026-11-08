import Link from 'next/link';
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
  href?: string;
}

const CourtCardBody = ({
  name,
  sport,
  openingHours,
  price,
  badge,
}: Omit<CourtCardProps, 'href'>) => (
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

export const CourtCard = ({ href, ...court }: CourtCardProps) => {
  if (!href) {
    return <CourtCardBody {...court} />;
  }
  return (
    <Link
      href={href}
      className="block h-full rounded-xl transition-shadow outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CourtCardBody {...court} />
    </Link>
  );
};
