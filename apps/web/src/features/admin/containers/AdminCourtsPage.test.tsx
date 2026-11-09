import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type {
  AdminCourtDto,
  ApiErrorDto,
  CourtDto,
  CreateCourtDto,
  FacilityDto,
  UpdateCourtDto,
} from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { AdminCourtsPage } from './AdminCourtsPage';

const facility: FacilityDto = { timezone: 'Europe/Lisbon', bookingDaysAhead: 30 };

const padel: AdminCourtDto = {
  id: 'c1',
  name: 'Padel 1',
  sport: 'PADEL',
  hourlyPriceCents: 2450,
  openHour: 8,
  closeHour: 23,
  isActive: true,
  upcomingBookingsCount: 3,
};

const pickleball: AdminCourtDto = {
  id: 'c2',
  name: 'Pickleball',
  sport: 'PICKLEBALL',
  hourlyPriceCents: 1250,
  openHour: 9,
  closeHour: 24,
  isActive: false,
  upcomingBookingsCount: 0,
};

const serveCourts = (courts: AdminCourtDto[]) =>
  server.use(
    http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
    http.get<never, never, AdminCourtDto[]>('/api/admin/courts', () => HttpResponse.json(courts))
  );

const cellsOf = (name: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${name}`) }))
    .getAllByRole('cell')
    .map(cell => cell.textContent);

describe('AdminCourtsPage', () => {
  it('lists every court with its upcoming bookings and status', async () => {
    serveCourts([padel, pickleball]);
    renderWithClient(<AdminCourtsPage />);

    await screen.findByRole('row', { name: /^Padel 1/ });
    expect(cellsOf('Padel 1')).toEqual([
      'Padel 1',
      'Padel',
      '08:00–23:00',
      '€24.50 / hour',
      '3',
      'Active',
      'Edit Padel 1Turn off Padel 1',
    ]);
    expect(cellsOf('Pickleball')).toEqual([
      'Pickleball',
      'Pickleball',
      '09:00–24:00',
      '€12.50 / hour',
      '0',
      'Turned off',
      'Edit PickleballTurn on Pickleball',
    ]);
  });

  it('says under each field what is wrong and adds nothing', async () => {
    let added = false;
    serveCourts([padel]);
    server.use(
      http.post('/api/courts', () => {
        added = true;
        return HttpResponse.json({}, { status: 201 });
      })
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Add court' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Add court' }));

    await waitFor(() =>
      expect(within(dialog).getByLabelText('Name')).toHaveAccessibleDescription('Enter a name')
    );
    expect(within(dialog).getByLabelText('Sport')).toHaveAccessibleDescription('Choose a sport');
    const price = within(dialog).getByLabelText('Price per hour (€)');
    expect(price).toHaveAccessibleDescription('Enter a price, like 24.00');
    expect(price).toBeInvalid();
    await user.type(price, '1.005');
    await user.selectOptions(within(dialog).getByLabelText('Closes at'), '06:00');
    await waitFor(() =>
      expect(within(dialog).getByLabelText('Closes at')).toHaveAccessibleDescription(
        /^Must be after opening/
      )
    );
    expect(price).toHaveAccessibleDescription('Enter a price, like 24.00');
    expect(added).toBe(false);
  });

  it('adds a court and shows it in the list', async () => {
    const courts = [padel];
    let sent: CreateCourtDto | undefined;
    serveCourts(courts);
    server.use(
      http.post<never, CreateCourtDto, CourtDto>('/api/courts', async ({ request }) => {
        sent = await request.json();
        const court = { id: 'c3', isActive: true, ...sent };
        courts.push({ ...court, upcomingBookingsCount: 0 });
        return HttpResponse.json(court, { status: 201 });
      })
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Add court' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), '  Padel 3  ');
    await user.selectOptions(within(dialog).getByLabelText('Sport'), 'Tennis');
    await user.type(within(dialog).getByLabelText('Price per hour (€)'), '19,99');
    await user.selectOptions(within(dialog).getByLabelText('Opens at'), '09:00');
    await user.selectOptions(within(dialog).getByLabelText('Closes at'), '24:00 (midnight)');
    await user.click(within(dialog).getByRole('button', { name: 'Add court' }));

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('Added Padel 3.');
    await waitFor(() => expect(notice).toHaveFocus());
    expect(sent).toEqual({
      name: 'Padel 3',
      sport: 'TENNIS',
      hourlyPriceCents: 1999,
      openHour: 9,
      closeHour: 24,
    });
    expect(await screen.findByRole('row', { name: /^Padel 3/ })).toBeInTheDocument();
  });

  it.each([
    [
      1,
      '1 upcoming booking falls outside these hours (it ends Mon 20 Jul, 22:00). Choose hours that still fit it.',
    ],
    [
      2,
      '2 upcoming bookings fall outside these hours (the last one ends Mon 20 Jul, 22:00). Choose hours that still fit them.',
    ],
  ])(
    'edits the hours and explains when %i upcoming bookings fall outside them',
    async (count, text) => {
      const courts = [padel];
      const sent: UpdateCourtDto[] = [];
      serveCourts(courts);
      server.use(
        http.patch<{ id: string }, UpdateCourtDto, CourtDto | ApiErrorDto>(
          '/api/courts/:id',
          async ({ request }) => {
            const changes = await request.json();
            sent.push(changes);
            if ((changes.closeHour ?? 23) < 22) {
              return HttpResponse.json(
                {
                  statusCode: 409,
                  code: 'COURT_HAS_BOOKINGS_OUTSIDE_HOURS',
                  message: 'Some upcoming bookings fall outside the new opening hours',
                  details: { count, lastEndsAt: '2026-07-20T21:00:00.000Z' },
                },
                { status: 409 }
              );
            }
            courts[0] = { ...padel, ...changes };
            return HttpResponse.json(courts[0]);
          }
        )
      );
      const user = userEvent.setup();
      renderWithClient(<AdminCourtsPage />);

      await user.click(await screen.findByRole('button', { name: 'Edit Padel 1' }));
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByLabelText('Name')).toHaveValue('Padel 1');
      expect(within(dialog).getByLabelText('Price per hour (€)')).toHaveValue('24.50');
      expect(within(dialog).getByLabelText('Opens at')).toHaveDisplayValue('08:00');
      await user.selectOptions(within(dialog).getByLabelText('Closes at'), '21:00');
      await user.click(within(dialog).getByRole('button', { name: 'Save' }));

      expect(await within(dialog).findByText(text)).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: 'Edit Padel 1' })).toHaveFocus();

      await user.click(screen.getByRole('button', { name: 'Edit Padel 1' }));
      expect(screen.queryByText(text)).not.toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText('Closes at'), '22:00');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByRole('status')).toHaveTextContent('Saved Padel 1.');
      expect(sent).toEqual([
        { openHour: 8, closeHour: 21 },
        { openHour: 8, closeHour: 22 },
      ]);
      await waitFor(() => expect(cellsOf('Padel 1')[2]).toBe('08:00–22:00'));
    }
  );

  it('says in the form when saving fails on the server', async () => {
    serveCourts([padel]);
    server.use(
      http.patch(
        '/api/courts/:id',
        () => new HttpResponse('Internal Server Error', { status: 500 })
      )
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Padel 1' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Closes at'), '21:00');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Something went wrong. Please try again.')).toHaveRole(
      'alert'
    );
  });

  it('sends only the fields the admin changed', async () => {
    const courts = [padel];
    const sent: UpdateCourtDto[] = [];
    serveCourts(courts);
    server.use(
      http.patch<{ id: string }, UpdateCourtDto, CourtDto>(
        '/api/courts/:id',
        async ({ request }) => {
          const changes = await request.json();
          sent.push(changes);
          courts[0] = { ...courts[0]!, ...changes };
          return HttpResponse.json(courts[0]);
        }
      )
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Padel 1' }));
    const price = screen.getByLabelText('Price per hour (€)');
    await user.clear(price);
    await user.type(price, '26');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(cellsOf('Padel 1')[3]).toBe('€26.00 / hour'));

    await user.click(screen.getByRole('button', { name: 'Edit Padel 1' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([{ hourlyPriceCents: 2600 }]);
  });

  it.each([
    [3, ' Its 3 upcoming bookings stay valid.'],
    [1, ' Its 1 upcoming booking stays valid.'],
    [0, ''],
  ])(
    'turns a court with %i upcoming bookings off after confirming, and back on',
    async (count, staysValid) => {
      const courts = [{ ...padel, upcomingBookingsCount: count }];
      const sent: UpdateCourtDto[] = [];
      serveCourts(courts);
      server.use(
        http.patch<{ id: string }, UpdateCourtDto, CourtDto>(
          '/api/courts/:id',
          async ({ request }) => {
            const changes = await request.json();
            sent.push(changes);
            courts[0] = { ...courts[0]!, ...changes };
            return HttpResponse.json(courts[0]);
          }
        )
      );
      const user = userEvent.setup();
      renderWithClient(<AdminCourtsPage />);

      await user.click(await screen.findByRole('button', { name: 'Turn off Padel 1' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveTextContent(
        `Turn off Padel 1?Players won't see it and can't book it.${staysValid}`
      );
      await user.click(within(dialog).getByRole('button', { name: 'Turn off' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        `Turned off Padel 1.${staysValid}`
      );
      await waitFor(() => expect(cellsOf('Padel 1')[5]).toBe('Turned off'));

      await user.click(screen.getByRole('button', { name: 'Turn on Padel 1' }));

      await waitFor(() => expect(cellsOf('Padel 1')[5]).toBe('Active'));
      expect(screen.getByRole('status')).toHaveTextContent('Turned on Padel 1.');
      expect(sent).toEqual([{ isActive: false }, { isActive: true }]);
    }
  );

  it('keeps the confirmation open and says why when turning off fails', async () => {
    serveCourts([padel]);
    server.use(
      http.patch<{ id: string }, UpdateCourtDto, ApiErrorDto>('/api/courts/:id', () =>
        HttpResponse.json(
          { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
          { status: 500 }
        )
      )
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Turn off Padel 1' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Turn off' }));

    const message = await within(dialog).findByText('Something went wrong. Please try again.');
    expect(message).toHaveRole('alert');
    expect(message).toHaveFocus();
  });

  it("shows the server's reason when a court can't be turned on", async () => {
    serveCourts([pickleball]);
    server.use(
      http.patch<{ id: string }, UpdateCourtDto, ApiErrorDto>('/api/courts/:id', () =>
        HttpResponse.json(
          { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' },
          { status: 401 }
        )
      )
    );
    const user = userEvent.setup();
    renderWithClient(<AdminCourtsPage />);

    await user.click(await screen.findByRole('button', { name: 'Turn on Pickleball' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Please log in');
  });

  it('tells a user that the page is for admins', async () => {
    server.use(
      http.get<never, never, FacilityDto>('/api/facility', () => HttpResponse.json(facility)),
      http.get<never, never, ApiErrorDto>('/api/admin/courts', () =>
        HttpResponse.json(
          { statusCode: 403, code: 'FORBIDDEN', message: 'You are not allowed to do this' },
          { status: 403 }
        )
      )
    );
    renderWithClient(<AdminCourtsPage />);

    expect(
      await screen.findByText('This page is for admins. Log in with an admin account to see it.')
    ).toBeInTheDocument();
  });
});
