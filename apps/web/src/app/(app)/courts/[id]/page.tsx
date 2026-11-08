import type { Metadata } from 'next';
import { CourtBookingPage } from '@/features/bookings/containers/CourtBookingPage';

export const metadata: Metadata = { title: 'Book a court' };

// Not Next's global PageProps: it comes from `next typegen`, which CI's lint step runs before.
const CourtPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return <CourtBookingPage courtId={id} />;
};

export default CourtPage;
