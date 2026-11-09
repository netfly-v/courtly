import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiErrorDto, BookingDto, FacilityDto } from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { MyBookingsPage } from './MyBookingsPage';

const facility: FacilityDto = { timezone: 'Europe/Lisbon', bookingDaysAhead: 30 };
// 08:30 in Lisbon.
const NOW = '2026-07-15T07:30:00.000Z';

const booking = (overrides: Partial<BookingDto> = {}): BookingDto => ({
  id: 'b1',
  court: { id: 'c1', name: 'Padel 1', sport: 'PADEL', isActive: true },
  startsAt: '2026-07-15T12:00:00.000Z',
  endsAt: '2026-07-15T13:00:00.000Z',
  totalPriceCents: 2400,
  status: 'ACTIVE',
  cancelledAt: null,
  cancellableUntil: '2026-07-15T10:00:00.000Z',
  ...overrides,
});

const serveBookings = (upcoming: () => BookingDto[], past: BookingDto[] = []) =>
  server.use(
    http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
    http.get<never, never, BookingDto[]>('/api/bookings/me', ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('scope') === 'past' ? past : upcoming()
      )
    )
  );

describe('MyBookingsPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(NOW));
  });

  it('lists upcoming and past bookings in the facility time zone', async () => {
    serveBookings(
      () => [
        booking({
          id: 'b0',
          startsAt: '2026-07-15T07:00:00.000Z',
          endsAt: '2026-07-15T08:00:00.000Z',
          cancellableUntil: '2026-07-15T05:00:00.000Z',
        }),
        booking(),
      ],
      [
        booking({
          id: 'p2',
          court: { id: 'c3', name: 'Tennis Hard', sport: 'TENNIS', isActive: true },
          startsAt: '2026-07-14T16:00:00.000Z',
          endsAt: '2026-07-14T17:00:00.000Z',
          totalPriceCents: 1600,
          cancellableUntil: '2026-07-14T14:00:00.000Z',
        }),
        booking({
          id: 'p1',
          court: { id: 'c2', name: 'Tennis Clay', sport: 'TENNIS', isActive: true },
          startsAt: '2026-07-10T17:00:00.000Z',
          endsAt: '2026-07-10T19:00:00.000Z',
          totalPriceCents: 3600,
          status: 'CANCELLED',
          cancelledAt: '2026-07-09T10:00:00.000Z',
        }),
      ]
    );
    renderWithClient(<MyBookingsPage />);

    const upcoming = await screen.findByRole('region', { name: 'Upcoming' });
    const [inProgress, later] = within(upcoming).getAllByRole('listitem');
    expect(inProgress).toHaveTextContent('Padel · Wed 15 Jul, 08:00–09:00');
    expect(inProgress).toHaveTextContent('In progress');
    expect(within(inProgress!).queryByRole('button')).not.toBeInTheDocument();
    expect(later).toHaveTextContent('Padel · Wed 15 Jul, 13:00–14:00');
    expect(later).toHaveTextContent('€24.00');
    expect(
      within(later!).getByRole('button', { name: 'Cancel booking' })
    ).toHaveAccessibleDescription('You can cancel until Wed 15 Jul, 11:00');
    const past = screen.getByRole('region', { name: 'Past' });
    const [played, cancelled] = within(past).getAllByRole('listitem');
    expect(played).toHaveTextContent('Tennis · Tue 14 Jul, 17:00–18:00');
    expect(played).not.toHaveTextContent(/In progress|Cancelled/);
    expect(cancelled).toHaveTextContent('Tennis · Fri 10 Jul, 18:00–20:00');
    expect(cancelled).toHaveTextContent('Cancelled');
    expect(within(past).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('All times are in Europe/Lisbon time.')).toBeInTheDocument();
  });

  it('cancels a booking after confirmation', async () => {
    let cancelledId: string | undefined;
    const current = () => booking(cancelledId ? { status: 'CANCELLED', cancelledAt: NOW } : {});
    serveBookings(() => [current()]);
    server.use(
      http.post<{ id: string }, never, BookingDto>('/api/bookings/:id/cancel', ({ params }) => {
        cancelledId = params.id;
        return HttpResponse.json(current());
      })
    );
    const user = userEvent.setup();
    renderWithClient(<MyBookingsPage />);

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('Padel 1, Wed 15 Jul, 13:00–14:00');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('Cancelled: Padel 1, Wed 15 Jul, 13:00–14:00.');
    await waitFor(() => expect(notice).toHaveFocus());
    expect(cancelledId).toBe('b1');
    const upcoming = screen.getByRole('region', { name: 'Upcoming' });
    expect(await within(upcoming).findByText('Cancelled')).toBeInTheDocument();
    expect(
      within(upcoming).queryByRole('button', { name: 'Cancel booking' })
    ).not.toBeInTheDocument();
  });

  it('allows cancelling until exactly 2 hours before the start', async () => {
    serveBookings(() => [
      booking({ id: 'b1', cancellableUntil: NOW }),
      booking({ id: 'b2', cancellableUntil: '2026-07-15T07:29:59.999Z' }),
    ]);
    renderWithClient(<MyBookingsPage />);

    await screen.findByRole('region', { name: 'Upcoming' });
    const [onTime, tooLate] = screen.getAllByRole('button', { name: 'Cancel booking' });
    expect(onTime).toBeEnabled();
    expect(onTime).toHaveAccessibleDescription('You can cancel until Wed 15 Jul, 08:30');
    expect(tooLate).toBeDisabled();
    expect(tooLate).toHaveAccessibleDescription(
      'Too late to cancel: bookings can be cancelled up to 2 hours before the start'
    );
  });

  it("shows the server's reason when the cancellation is refused", async () => {
    serveBookings(() => [booking()]);
    server.use(
      http.post<{ id: string }, never, ApiErrorDto>('/api/bookings/:id/cancel', () =>
        HttpResponse.json(
          {
            statusCode: 422,
            code: 'CANCELLATION_WINDOW_CLOSED',
            message: 'Bookings can be cancelled up to 2 hours before the start',
          },
          { status: 422 }
        )
      )
    );
    const user = userEvent.setup();
    renderWithClient(<MyBookingsPage />);

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));

    const message = await within(dialog).findByText(
      'Bookings can be cancelled up to 2 hours before the start'
    );
    expect(message).toHaveRole('alert');
    expect(message).toHaveFocus();
  });

  it('keeps the dialog open while cancelling, so a refusal still shows', async () => {
    serveBookings(() => [booking()]);
    const answer = Promise.withResolvers<void>();
    server.use(
      http.post<{ id: string }, never, ApiErrorDto>('/api/bookings/:id/cancel', async () => {
        await answer.promise;
        return HttpResponse.json(
          {
            statusCode: 422,
            code: 'CANCELLATION_WINDOW_CLOSED',
            message: 'Bookings can be cancelled up to 2 hours before the start',
          },
          { status: 422 }
        );
      })
    );
    const user = userEvent.setup();
    renderWithClient(<MyBookingsPage />);

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    const confirm = within(screen.getByRole('alertdialog')).getByRole('button', {
      name: 'Cancel booking',
    });
    await user.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    await user.keyboard('{Escape}');
    answer.resolve();

    expect(
      await within(screen.getByRole('alertdialog')).findByText(
        'Bookings can be cancelled up to 2 hours before the start'
      )
    ).toHaveRole('alert');
  });

  it('tells an admin that bookings are for players', async () => {
    const forbidden: ApiErrorDto = {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You are not allowed to do this',
    };
    server.use(
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, ApiErrorDto>('/api/bookings/me', () =>
        HttpResponse.json(forbidden, { status: 403 })
      )
    );
    renderWithClient(<MyBookingsPage />);

    expect(
      await screen.findByText(
        'Bookings are for players. Log in with a user account to book a court.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
