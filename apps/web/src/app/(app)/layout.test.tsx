import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { AdminCourtsPage } from '@/features/admin/containers/AdminCourtsPage';
import { AdminDayPage } from '@/features/admin/containers/AdminDayPage';
import { CourtBookingPage } from '@/features/bookings/containers/CourtBookingPage';
import {
  type AdminCourtDto,
  type AdminDayDto,
  type ApiErrorDto,
  type AvailabilityChangedEventDto,
  type AvailabilityDto,
  type CourtDto,
  type FacilityDto,
  SlotStatus,
  type UserDto,
} from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import AppLayout from './layout';

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => '/courts/c1',
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// jsdom has no EventSource.
class FakeEventSource extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static all: FakeEventSource[] = [];
  readyState = FakeEventSource.CONNECTING;

  constructor(readonly url: string) {
    super();
    FakeEventSource.all.push(this);
  }

  close() {
    this.readyState = FakeEventSource.CLOSED;
  }

  open() {
    this.readyState = FakeEventSource.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  send(data: AvailabilityChangedEventDto) {
    this.dispatchEvent(new MessageEvent('availability.changed', { data: JSON.stringify(data) }));
  }

  fail(readyState: number) {
    this.readyState = readyState;
    this.dispatchEvent(new Event('error'));
  }
}
vi.stubGlobal('EventSource', FakeEventSource);

// Effects run twice, as in next dev: a stream the first run left open would show up.
configure({ reactStrictMode: true });

const liveStreams = () =>
  FakeEventSource.all.filter(source => source.readyState !== FakeEventSource.CLOSED);

const stream = () => {
  const live = liveStreams();
  expect(live).toHaveLength(1);
  return live[0]!;
};

// With Date: faking only the timers would undo vi.setSystemTime.
const fakeTimeouts = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });

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
const anna: UserDto = { id: 'u1', email: 'anna@courtly.dev', name: 'Anna Silva', role: 'USER' };

interface ServerState {
  status: SlotStatus;
  loggedIn: boolean;
}

const serveCourt = (state: ServerState) =>
  server.use(
    http.get<never, never, UserDto | ApiErrorDto>('/api/auth/me', () =>
      state.loggedIn
        ? HttpResponse.json(anna)
        : HttpResponse.json(
            { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' },
            { status: 401 }
          )
    ),
    http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
    http.get<never, never, AvailabilityDto>('/api/courts/:id/availability', ({ request }) =>
      HttpResponse.json({
        court,
        date: new URL(request.url).searchParams.get('date') ?? '',
        slots: [
          {
            startsAt: '2026-07-15T10:00:00.000Z',
            endsAt: '2026-07-15T11:00:00.000Z',
            status: state.status,
            bookedByMe: false,
          },
        ],
      })
    )
  );

const renderCourtPage = () =>
  renderWithClient(
    <AppLayout>
      <CourtBookingPage courtId="c1" />
    </AppLayout>
  );

describe('live updates', () => {
  beforeEach(() => {
    FakeEventSource.all = [];
    // 08:30 in Lisbon.
    vi.setSystemTime(new Date('2026-07-15T07:30:00Z'));
    window.history.replaceState(null, '', '/courts/c1');
  });

  it('shows a slot as booked when someone else books it', async () => {
    const state: ServerState = { status: SlotStatus.AVAILABLE, loggedIn: true };
    serveCourt(state);
    renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    expect(stream().url).toBe('/api/events');
    stream().open();

    state.status = SlotStatus.BOOKED;
    stream().send({ courtId: 'c1', date: '2026-07-15' });

    expect(await screen.findByText('Booked')).toBeInTheDocument();
  });

  it('loads the slots again when the stream comes back after a drop', async () => {
    const state: ServerState = { status: SlotStatus.AVAILABLE, loggedIn: true };
    serveCourt(state);
    renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    stream().open();

    stream().fail(FakeEventSource.CONNECTING);
    state.status = SlotStatus.BOOKED;
    stream().open();

    expect(await screen.findByText('Booked')).toBeInTheDocument();
  });

  it('sends the user to the login page when the stream is refused after the session ends', async () => {
    const state: ServerState = { status: SlotStatus.AVAILABLE, loggedIn: true };
    serveCourt(state);
    renderCourtPage();
    await screen.findByText('Anna Silva');
    stream().open();

    state.loggedIn = false;
    stream().fail(FakeEventSource.CLOSED);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/login'));
  });

  it('opens a new stream a few seconds after the server refused one', async () => {
    serveCourt({ status: SlotStatus.AVAILABLE, loggedIn: true });
    renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    stream().open();
    fakeTimeouts();

    stream().fail(FakeEventSource.CLOSED);
    await vi.advanceTimersByTimeAsync(4_000);
    expect(liveStreams()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(liveStreams()).toHaveLength(1);
  });

  it('leaves a dropped stream to the browser, which reconnects it by itself', async () => {
    serveCourt({ status: SlotStatus.AVAILABLE, loggedIn: true });
    renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    stream().open();
    fakeTimeouts();

    stream().fail(FakeEventSource.CONNECTING);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(liveStreams()).toHaveLength(1);
  });

  it('opens no stream when the user leaves while it waits to reconnect', async () => {
    serveCourt({ status: SlotStatus.AVAILABLE, loggedIn: true });
    const { unmount } = renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    stream().open();
    fakeTimeouts();

    stream().fail(FakeEventSource.CLOSED);
    unmount();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(liveStreams()).toHaveLength(0);
  });

  it.each([
    [SlotStatus.BOOKED, 'This time has just been booked'],
    [SlotStatus.PAST, 'This time has already started'],
  ])('says in the open dialog why the time is gone when it comes back %s', async (status, text) => {
    const state: ServerState = { status: SlotStatus.AVAILABLE, loggedIn: true };
    serveCourt(state);
    const user = userEvent.setup();
    renderCourtPage();
    await user.click(await screen.findByRole('button', { name: '11:00 Free' }));
    stream().open();

    state.status = status;
    stream().send({ courtId: 'c1', date: '2026-07-15' });

    expect(await within(screen.getByRole('dialog')).findByText(text)).toBeInTheDocument();
  });

  it('shows the admin a booking made on the day they are looking at', async () => {
    const day: AdminDayDto = {
      date: '2026-07-15',
      bookings: [],
      totals: { activeCount: 0, cancelledCount: 0, revenueCents: 0 },
    };
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () =>
        HttpResponse.json({ ...anna, name: 'Vitalii', role: 'ADMIN' })
      ),
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, AdminDayDto>('/api/admin/bookings', () => HttpResponse.json(day))
    );
    window.history.replaceState(null, '', '/admin');
    renderWithClient(
      <AppLayout>
        <AdminDayPage />
      </AppLayout>
    );
    await screen.findByText('No bookings on Wed 15 Jul 2026.');
    stream().open();

    day.bookings = [
      {
        id: 'b1',
        court: { id: 'c1', name: 'Padel 1', sport: 'PADEL', isActive: true },
        startsAt: '2026-07-15T10:00:00.000Z',
        endsAt: '2026-07-15T11:00:00.000Z',
        totalPriceCents: 2400,
        status: 'ACTIVE',
        cancelledAt: null,
        user: { name: 'Ben Costa', email: 'ben@courtly.dev' },
      },
    ];
    stream().send({ courtId: 'c1', date: '2026-07-15' });

    expect(await screen.findByText('Ben Costa')).toBeInTheDocument();
  });

  it('updates the upcoming bookings count on the admin courts page after a live event', async () => {
    const courtRow: AdminCourtDto = { ...court, upcomingBookingsCount: 2 };
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () =>
        HttpResponse.json({ ...anna, name: 'Vitalii', role: 'ADMIN' })
      ),
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, AdminCourtDto[]>('/api/admin/courts', () =>
        HttpResponse.json([courtRow])
      )
    );
    window.history.replaceState(null, '', '/admin/courts');
    renderWithClient(
      <AppLayout>
        <AdminCourtsPage />
      </AppLayout>
    );
    await screen.findByRole('row', { name: /^Padel 1/ });
    stream().open();

    courtRow.upcomingBookingsCount = 3;
    stream().send({ courtId: 'c1', date: '2026-07-16' });

    await waitFor(() =>
      expect(within(screen.getByRole('row', { name: /^Padel 1/ })).getByText('3')).toBeVisible()
    );
  });

  it('lets the stream go while the tab is hidden and opens it again when the tab is back', async () => {
    serveCourt({ status: SlotStatus.AVAILABLE, loggedIn: true });
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    onTestFinished(() => hidden.mockRestore());
    renderCourtPage();
    await screen.findByRole('button', { name: '11:00 Free' });
    stream().open();

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(liveStreams()).toHaveLength(0);

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(liveStreams()).toHaveLength(1);
  });
});
