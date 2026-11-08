import type { Metadata } from 'next';
import { CourtBookingPage } from '@/features/bookings/containers/CourtBookingPage';

export const metadata: Metadata = { title: 'Book a court' };

const CourtPage = async ({ params }: PageProps<'/courts/[id]'>) => {
  const { id } = await params;
  return <CourtBookingPage courtId={id} />;
};

export default CourtPage;
