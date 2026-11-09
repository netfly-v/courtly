import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ApiErrorDto,
  AvailabilityDto,
  BookingDto,
  CourtDto,
  CreateBookingDto,
  FacilityDto,
  SlotDto,
} from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { CourtBookingPage } from './CourtBookingPage';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const facility: FacilityDto = { timezone: 'Europe/Lisbon', bookingDaysAhead: 30 };
const court: CourtDto = {
  id: 'c1',
  name: 'Padel 1',
  sport: 'PADEL',
  hourlyPriceCents: 2400,
  openHour: 8,
  closeHour: 12,
  isActive: true,
};

const hourUtc = (hour: number) => `2026-07-15T${String(hour).padStart(2, '0')}:00:00.000Z`;

const slot = (startHourUtc: number, overrides: Partial<SlotDto> = {}): SlotDto => ({
  startsAt: hourUtc(startHourUtc),
  endsAt: hourUtc(startHourUtc + 1),
  status: 'AVAILABLE',
  bookedByMe: false,
  ...overrides,
});

const serveSlots = (slots: () => SlotDto[], dates: string[] = [], courtDto = court) =>
  server.use(
    http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
    http.get<{ id: string }, never, AvailabilityDto>(
      '/api/courts/:id/availability',
      ({ request }) => {
        const date = new URL(request.url).searchParams.get('date') ?? '';
        dates.push(date);
        return HttpResponse.json({ court: courtDto, date, slots: slots() });
      }
    )
  );

const booking: BookingDto = {
  id: 'b1',
  court: { id: 'c1', name: 'Padel 1', sport: 'PADEL', isActive: true },
  startsAt: hourUtc(9),
  endsAt: hourUtc(11),
  totalPriceCents: 4800,
  status: 'ACTIVE',
  cancelledAt: null,
  cancellableUntil: hourUtc(7),
};

describe('CourtBookingPage', () => {
  beforeEach(() => {
    // 08:30 in Lisbon.
    vi.setSystemTime(new Date('2026-07-15T07:30:00Z'));
    window.history.replaceState(null, '', '/courts/c1');
  });

  it('shows the slots of the day in the facility time zone with their status', async () => {
    serveSlots(() => [
      slot(7, { status: 'PAST' }),
      slot(8, { status: 'BOOKED', bookedByMe: true }),
      slot(9, { status: 'BOOKED' }),
      slot(10),
    ]);
    renderWithClient(<CourtBookingPage courtId="c1" />);

    const cells = await screen.findAllByRole('listitem');
    expect(cells.map(cell => cell.textContent)).toEqual([
      '08:00 Past',
      '09:00 Your booking',
      '10:00 Booked',
      '11:00 Free',
    ]);
    const grid = screen.getByRole('list');
    expect(
      within(grid)
        .getAllByRole('button')
        .map(button => button.textContent)
    ).toEqual(['11:00 Free']);
    expect(screen.getByText('All times are in Europe/Lisbon time.')).toBeInTheDocument();
  });

  it('starts on today in the facility time zone and offers days up to the booking horizon', async () => {
    // 00:30 on 15 July in Lisbon, but still 14 July in New York and in UTC.
    vi.setSystemTime(new Date('2026-07-14T23:30:00Z'));
    const dates: string[] = [];
    serveSlots(() => [slot(10)], dates);
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    const strip = await screen.findByRole('radiogroup', { name: 'Day' });
    const days = within(strip).getAllByRole('radio');
    expect(days).toHaveLength(31);
    expect(days[0]).toHaveTextContent('Today');
    expect(days[0]).toBeChecked();
    expect(days[1]).toHaveTextContent('Thu 16 Jul');
    expect(days[30]).toHaveTextContent('Fri 14 Aug');

    await user.click(days[1]!);

    expect(screen.getByRole('radio', { name: 'Thu 16 Jul' })).toBeChecked();
    expect(window.location.search).toBe('?date=2026-07-16');
    await waitFor(() => expect(dates).toEqual(['2026-07-15', '2026-07-16']));
  });

  it.each([
    ['a bookable day', '2026-07-20', 'Mon 20 Jul', '2026-07-20'],
    ['a day after the horizon', '2026-08-15', 'Today', '2026-07-15'],
    ['a day that does not exist', '2026-07-32', 'Today', '2026-07-15'],
  ])('opens the day from the URL, or today for %s', async (_case, urlDate, checked, requested) => {
    window.history.replaceState(null, '', `/courts/c1?date=${urlDate}`);
    const dates: string[] = [];
    serveSlots(() => [slot(10)], dates);
    renderWithClient(<CourtBookingPage courtId="c1" />);

    expect(await screen.findByRole('radio', { name: checked })).toBeChecked();
    expect(dates).toEqual([requested]);
  });

  it("keeps the old day's slots on screen but not bookable while the next day loads", async () => {
    let releaseNextDay = () => {};
    const nextDayAnswer = new Promise<void>(resolve => {
      releaseNextDay = resolve;
    });
    server.use(
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, AvailabilityDto>(
        '/api/courts/:id/availability',
        async ({ request }) => {
          const date = new URL(request.url).searchParams.get('date') ?? '';
          if (date !== '2026-07-15') {
            await nextDayAnswer;
          }
          return HttpResponse.json({ court, date, slots: [slot(10)] });
        }
      )
    );
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await screen.findByRole('button', { name: '11:00 Free' });
    await user.click(screen.getByRole('radio', { name: 'Thu 16 Jul' }));

    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '11:00 Free' })).toBeDisabled();
    releaseNextDay();
    await waitFor(() => expect(screen.getByRole('button', { name: '11:00 Free' })).toBeEnabled());
  });

  it('books 2 hours and shows the booking in the grid', async () => {
    let booked = false;
    let sent: CreateBookingDto | undefined;
    const mine = () => (booked ? { status: 'BOOKED' as const, bookedByMe: true } : {});
    serveSlots(() => [slot(9, mine()), slot(10, mine())]);
    server.use(
      http.post<never, CreateBookingDto, BookingDto>('/api/bookings', async ({ request }) => {
        sent = await request.json();
        booked = true;
        return HttpResponse.json(booking, { status: 201 });
      })
    );
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: '10:00 Free' }));
    await user.click(screen.getByRole('button', { name: 'Book 10:00–12:00 · €48.00' }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('Booked: Wed 15 Jul, 10:00–12:00 · €48.00. See my bookings');
    await waitFor(() => expect(notice).toHaveFocus());
    expect(screen.getByRole('link', { name: 'See my bookings' })).toHaveAttribute(
      'href',
      '/bookings'
    );
    expect(sent).toEqual({ courtId: 'c1', startsAt: hourUtc(9), durationHours: 2 });
    await waitFor(() => expect(screen.getAllByText('Your booking')).toHaveLength(2));
  });

  it.each([
    ['the next hour is taken', '08:00 Free', 'Book 08:00–10:00 · €48.00', '09:00 is not free'],
    [
      'the next slot does not start when this one ends',
      '10:00 Free',
      'Book 10:00–12:00 · €48.00',
      'Only 1 hour is possible at this time',
    ],
    [
      'the court closes after this hour',
      '12:00 Free',
      'Book 12:00–14:00 · €48.00',
      'The court closes at 13:00',
    ],
  ])('offers only 1 hour when %s', async (_case, slotName, twoHoursLabel, reason) => {
    serveSlots(() => [slot(7), slot(8, { status: 'BOOKED' }), slot(9), slot(11)], [], {
      ...court,
      closeHour: 13,
    });
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: slotName }));

    const twoHours = screen.getByRole('button', { name: twoHoursLabel });
    expect(twoHours).toBeDisabled();
    expect(twoHours).toHaveAccessibleDescription(reason);
  });

  it('returns focus to the slot when the dialog is closed', async () => {
    serveSlots(() => [slot(10)]);
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: '11:00 Free' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.getByRole('button', { name: '11:00 Free' })).toHaveFocus());
  });

  it('explains in the dialog that the time was just taken and refreshes the slots', async () => {
    let taken = false;
    serveSlots(() => [slot(9), slot(10, taken ? { status: 'BOOKED' } : {})]);
    server.use(
      http.post<never, CreateBookingDto, ApiErrorDto>('/api/bookings', () => {
        taken = true;
        return HttpResponse.json(
          { statusCode: 409, code: 'SLOT_TAKEN', message: 'This time has just been booked' },
          { status: 409 }
        );
      })
    );
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: '11:00 Free' }));
    await user.click(screen.getByRole('button', { name: 'Book 11:00–12:00 · €24.00' }));

    const dialog = screen.getByRole('dialog');
    const message = await within(dialog).findByText('This time has just been booked');
    expect(message).toHaveRole('alert');
    expect(message).toHaveFocus();
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'Book 11:00–12:00 · €24.00' })
      ).toBeDisabled()
    );
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Padel 1' })).toHaveFocus());
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('11:00 Booked');

    await user.click(screen.getByRole('button', { name: '10:00 Free' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeEmptyDOMElement();
  });

  it('keeps the dialog open while booking, so a refusal still shows', async () => {
    serveSlots(() => [slot(10)]);
    const answer = Promise.withResolvers<void>();
    server.use(
      http.post<never, CreateBookingDto, ApiErrorDto>('/api/bookings', async () => {
        await answer.promise;
        return HttpResponse.json(
          { statusCode: 409, code: 'SLOT_TAKEN', message: 'This time has just been booked' },
          { status: 409 }
        );
      })
    );
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: '11:00 Free' }));
    const book = screen.getByRole('button', { name: 'Book 11:00–12:00 · €24.00' });
    await user.click(book);
    await waitFor(() => expect(book).toBeDisabled());
    await user.keyboard('{Escape}');
    answer.resolve();

    expect(
      await within(screen.getByRole('dialog')).findByText('This time has just been booked')
    ).toHaveRole('alert');
  });

  it('shows a general message when the booking fails on the server', async () => {
    serveSlots(() => [slot(10)]);
    server.use(
      http.post('/api/bookings', () => new HttpResponse('Internal Server Error', { status: 500 }))
    );
    const user = userEvent.setup();
    renderWithClient(<CourtBookingPage courtId="c1" />);

    await user.click(await screen.findByRole('button', { name: '11:00 Free' }));
    await user.click(screen.getByRole('button', { name: 'Book 11:00–12:00 · €24.00' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toHaveRole('alert');
  });

  it('says the court is not available when it is turned off', async () => {
    server.use(
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, ApiErrorDto>('/api/courts/:id/availability', () =>
        HttpResponse.json(
          { statusCode: 404, code: 'COURT_NOT_FOUND', message: 'Court not found' },
          { status: 404 }
        )
      )
    );
    renderWithClient(<CourtBookingPage courtId="c1" />);

    expect(await screen.findByText('This court is not available.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See all courts' })).toHaveAttribute('href', '/');
  });
});
