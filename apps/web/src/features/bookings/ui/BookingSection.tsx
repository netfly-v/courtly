import { type ReactNode, type Ref, useId } from 'react';
import { BookingRow, type BookingView } from './BookingRow';

interface BookingSectionProps {
  title: string;
  bookings: BookingView[];
  empty: ReactNode;
  onCancel: (id: string, button: HTMLButtonElement) => void;
  focusId?: string;
  focusRef?: Ref<HTMLHeadingElement>;
}

export const BookingSection = ({
  title,
  bookings,
  empty,
  onCancel,
  focusId,
  focusRef,
}: BookingSectionProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {bookings.length === 0 && empty}
      {bookings.length > 0 && (
        <ul className="flex flex-col gap-3">
          {bookings.map(booking => (
            <li key={booking.id}>
              <BookingRow
                booking={booking}
                headingRef={booking.id === focusId ? focusRef : undefined}
                onCancel={onCancel}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
