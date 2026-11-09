import { QueryClient } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AdminBookingDto,
  AdminDayDto,
  ApiErrorDto,
  FacilityDto,
} from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { AdminDayPage } from './AdminDayPage';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const facility: FacilityDto = { timezone: 'Europe/Lisbon', bookingDaysAhead: 30 };

const booking = (overrides: Partial<AdminBookingDto> = {}): AdminBookingDto => ({
  id: 'b1',
  court: { id: 'c1', name: 'Padel 1', sport: 'PADEL', isActive: true },
  startsAt: '2026-07-15T09:00:00.000Z',
  endsAt: '2026-07-15T11:00:00.000Z',
  totalPriceCents: 4800,
  status: 'ACTIVE',
  cancelledAt: null,
  user: { name: 'Anna Silva', email: 'anna@courtly.dev' },
  ...overrides,
});

const emptyTotals = { activeCount: 0, cancelledCount: 0, revenueCents: 0 };

const serveDays = (days: Record<string, Omit<AdminDayDto, 'date'>>) =>
  server.use(
    http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
    http.get<never, never, AdminDayDto>('/api/admin/bookings', ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? '';
      return HttpResponse.json({ date, ...(days[date] ?? { bookings: [], totals: emptyTotals }) });
    })
  );

const dayHeading = () => screen.getByRole('heading', { level: 2 });

describe('AdminDayPage', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-07-15T07:30:00Z'));
    window.history.replaceState(null, '', '/admin');
  });

  it('lists the bookings of the day in the facility time zone with the totals', async () => {
    serveDays({
      '2026-07-15': {
        bookings: [
          booking(),
          booking({
            id: 'b2',
            court: { id: 'c2', name: 'Padel 2', sport: 'PADEL', isActive: false },
            startsAt: '2026-07-15T12:00:00.000Z',
            endsAt: '2026-07-15T13:00:00.000Z',
            totalPriceCents: 2400,
            status: 'CANCELLED',
            cancelledAt: '2026-07-14T10:00:00.000Z',
            user: { name: 'Ben Costa', email: 'ben@courtly.dev' },
          }),
        ],
        totals: { activeCount: 1, cancelledCount: 1, revenueCents: 4800 },
      },
    });
    renderWithClient(<AdminDayPage />);

    const [, first, second] = await screen.findAllByRole('row');
    expect(
      within(first!)
        .getAllByRole('cell')
        .map(cell => cell.textContent)
    ).toEqual(['10:00–12:00', 'Active', 'Padel 1', 'Anna Silvaanna@courtly.dev', '€48.00']);
    expect(
      within(second!)
        .getAllByRole('cell')
        .map(cell => cell.textContent)
    ).toEqual([
      '13:00–14:00',
      'Cancelled',
      'Padel 2Turned off',
      'Ben Costaben@courtly.dev',
      '€24.00',
    ]);
    expect(screen.getAllByRole('term').map(term => term.textContent)).toEqual([
      'Active bookings',
      'Cancelled',
      'Expected revenue',
    ]);
    expect(screen.getAllByRole('definition').map(value => value.textContent)).toEqual([
      '1',
      '1',
      '€48.00',
    ]);
    expect(dayHeading()).toHaveTextContent('Today, Wed 15 Jul 2026');
  });

  it('opens today in the facility time zone and moves between days', async () => {
    // 00:30 on 15 July in Lisbon, but still 14 July in New York and in UTC.
    vi.setSystemTime(new Date('2026-07-14T23:30:00Z'));
    serveDays({
      '2026-07-15': { bookings: [booking()], totals: emptyTotals },
      '2026-07-14': {
        bookings: [booking({ id: 'b0', user: { name: 'Ben Costa', email: 'ben@courtly.dev' } })],
        totals: emptyTotals,
      },
    });
    const user = userEvent.setup();
    renderWithClient(<AdminDayPage />);

    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
    expect(dayHeading()).toHaveTextContent('Today, Wed 15 Jul 2026');

    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(await screen.findByText('No bookings on Thu 16 Jul 2026.')).toBeInTheDocument();
    expect(window.location.search).toBe('?date=2026-07-16');

    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(await screen.findByText('Ben Costa')).toBeInTheDocument();
    expect(dayHeading()).toHaveTextContent('Tue 14 Jul 2026');

    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
    expect(dayHeading()).toHaveTextContent('Today, Wed 15 Jul 2026');
  });

  it('jumps to a day picked in the calendar, where today is the facility day', async () => {
    // 00:30 on 15 July in Lisbon, but still 14 July in New York.
    vi.setSystemTime(new Date('2026-07-14T23:30:00Z'));
    serveDays({ '2026-06-20': { bookings: [booking()], totals: emptyTotals } });
    const user = userEvent.setup();
    renderWithClient(<AdminDayPage />);
    await screen.findByText('No bookings on Wed 15 Jul 2026.');

    await user.click(screen.getByRole('button', { name: 'Pick a day' }));
    const calendar = screen.getByRole('dialog', { name: 'Pick a day' });
    expect(
      within(calendar).getByRole('button', { name: 'Today, Wednesday, July 15th, 2026, selected' })
    ).toHaveFocus();
    await user.click(within(calendar).getByRole('button', { name: 'Go to the Previous Month' }));
    await user.click(within(calendar).getByRole('button', { name: 'Saturday, June 20th, 2026' }));

    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
    expect(dayHeading()).toHaveTextContent('Sat 20 Jun 2026');
    expect(window.location.search).toBe('?date=2026-06-20');
    expect(screen.getByRole('button', { name: 'Pick a day' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Pick a day' }));
    expect(
      screen.getByRole('button', { name: 'Saturday, June 20th, 2026, selected' })
    ).toHaveFocus();
  });

  it.each([
    ['a past day', '2026-07-01', 'Wed 1 Jul 2026'],
    ['a day that does not exist', '2026-07-32', 'Today, Wed 15 Jul 2026'],
    ['a year the API refuses', '1999-07-01', 'Today, Wed 15 Jul 2026'],
  ])('opens the day from the URL, or today for %s', async (_case, urlDate, heading) => {
    window.history.replaceState(null, '', `/admin?date=${urlDate}`);
    serveDays({});
    renderWithClient(<AdminDayPage />);

    await screen.findByText(/^No bookings on/);
    expect(dayHeading()).toHaveTextContent(heading);
  });

  it('moves to the next day across a daylight saving change in the browser zone', async () => {
    // 1 November 2026 has 25 hours in New York, where the tests run.
    window.history.replaceState(null, '', '/admin?date=2026-11-01');
    serveDays({});
    const user = userEvent.setup();
    renderWithClient(<AdminDayPage />);
    await screen.findByText('No bookings on Sun 1 Nov 2026.');

    await user.click(screen.getByRole('button', { name: 'Next day' }));

    expect(await screen.findByText('No bookings on Mon 2 Nov 2026.')).toBeInTheDocument();
  });

  it('does not say a day is empty while it is still loading', async () => {
    const nextDay = Promise.withResolvers<void>();
    serveDays({
      '2026-07-16': {
        bookings: [booking()],
        totals: { activeCount: 1, cancelledCount: 0, revenueCents: 4800 },
      },
    });
    server.use(
      http.get('/api/admin/bookings', async ({ request }) => {
        if (new URL(request.url).searchParams.get('date') === '2026-07-16') {
          await nextDay.promise;
        }
      })
    );
    const user = userEvent.setup();
    renderWithClient(<AdminDayPage />);
    await screen.findByText('No bookings on Wed 15 Jul 2026.');

    await user.click(screen.getByRole('button', { name: 'Next day' }));

    expect(dayHeading()).toHaveTextContent('Thu 16 Jul 2026');
    expect(screen.queryByText(/^No bookings on/)).not.toBeInTheDocument();
    expect(screen.getByText('Active bookings').closest('[aria-busy]')).toHaveAttribute(
      'aria-busy',
      'true'
    );
    nextDay.resolve();
    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
  });

  it('keeps the day navigation when a day fails to load', async () => {
    serveDays({ '2026-07-16': { bookings: [booking()], totals: emptyTotals } });
    server.use(
      http.get<never, never, ApiErrorDto>('/api/admin/bookings', ({ request }) => {
        if (new URL(request.url).searchParams.get('date') === '2026-07-15') {
          return HttpResponse.json(
            { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
            { status: 500 }
          );
        }
      })
    );
    const user = userEvent.setup();
    renderWithClient(
      <AdminDayPage />,
      new QueryClient({ defaultOptions: { queries: { retry: false } } })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the bookings. Please try again.'
    );
    await user.click(screen.getByRole('button', { name: 'Next day' }));

    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
  });

  it('goes back to today when the header link opens the page without a day', async () => {
    window.history.replaceState(null, '', '/admin?date=2026-07-01');
    serveDays({});
    const { rerender } = renderWithClient(<AdminDayPage />);
    await screen.findByText('No bookings on Wed 1 Jul 2026.');

    window.history.replaceState(null, '', '/admin');
    rerender(<AdminDayPage />);

    expect(await screen.findByText('No bookings on Wed 15 Jul 2026.')).toBeInTheDocument();
  });

  it('tells a user that the page is for admins', async () => {
    server.use(
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, ApiErrorDto>('/api/admin/bookings', () =>
        HttpResponse.json(
          { statusCode: 403, code: 'FORBIDDEN', message: 'You are not allowed to do this' },
          { status: 403 }
        )
      )
    );
    renderWithClient(<AdminDayPage />);

    expect(
      await screen.findByText('This page is for admins. Log in with an admin account to see it.')
    ).toBeInTheDocument();
  });
});
