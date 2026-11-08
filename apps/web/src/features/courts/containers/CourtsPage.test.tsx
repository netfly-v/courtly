import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGetMeQueryKey, getListCourtsQueryKey } from '@/shared/api/generated';
import type { CourtDto, UserDto } from '@/shared/api/generated/model';
import { createQueryClient } from '@/shared/api/query-client';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { CourtsPage } from './CourtsPage';

const courts: CourtDto[] = [
  {
    id: 'c1',
    name: 'Padel 1',
    sport: 'PADEL',
    hourlyPriceCents: 2000,
    openHour: 8,
    closeHour: 22,
    isActive: true,
  },
  {
    id: 'c2',
    name: 'Pickleball',
    sport: 'PICKLEBALL',
    hourlyPriceCents: 1250,
    openHour: 9,
    closeHour: 24,
    isActive: false,
  },
];

const user = (role: UserDto['role']): UserDto => ({
  id: 'u1',
  email: 'anna@courtly.dev',
  name: 'Anna Silva',
  role,
});

describe('CourtsPage', () => {
  // Only admins get turned-off courts from the API.
  beforeEach(() => {
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json(user('ADMIN')))
    );
  });

  it('lists the courts with their sport, opening hours and price', async () => {
    server.use(http.get<never, never, CourtDto[]>('/api/courts', () => HttpResponse.json(courts)));
    renderWithClient(<CourtsPage />);

    const [padel, pickleball] = await screen.findAllByRole('listitem');
    const padelCard = within(padel!);
    expect(padelCard.getByRole('heading', { name: 'Padel 1' })).toBeInTheDocument();
    expect(padelCard.getByText('Padel')).toBeInTheDocument();
    expect(padelCard.getByText('08:00–22:00')).toBeInTheDocument();
    expect(padelCard.getByText('€20.00 / hour')).toBeInTheDocument();
    expect(padelCard.queryByText('Turned off')).not.toBeInTheDocument();
    const pickleballCard = within(pickleball!);
    expect(pickleballCard.getByText('09:00–24:00')).toBeInTheDocument();
    expect(pickleballCard.getByText('€12.50 / hour')).toBeInTheDocument();
    expect(pickleballCard.getByText('Turned off')).toBeInTheDocument();
  });

  it('shows the courts when the first request fails with a network error', async () => {
    let requests = 0;
    server.use(
      http.get<never, never, CourtDto[]>('/api/courts', () => {
        requests += 1;
        return requests === 1 ? HttpResponse.error() : HttpResponse.json(courts);
      })
    );
    const client = createQueryClient();
    // Keeps our retry rule; React Query's 1 s retry delay would outlast findBy's 1 s timeout.
    client.setQueryDefaults(getListCourtsQueryKey(), { retryDelay: 0 });
    renderWithClient(<CourtsPage />, client);

    expect(await screen.findByRole('heading', { name: 'Padel 1' })).toBeInTheDocument();
  });

  it.each([
    ['a user', 'USER', '/courts/c1'],
    ['an admin', 'ADMIN', undefined],
  ] as const)('links a court to its booking page for %s', async (_who, role, href) => {
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json(user(role))),
      http.get<never, never, CourtDto[]>('/api/courts', () => HttpResponse.json([courts[0]!]))
    );
    // The login page puts the user into the cache, so the role is known on the first render.
    const client = createQueryClient();
    client.setQueryData(getGetMeQueryKey(), user(role));
    renderWithClient(<CourtsPage />, client);

    await screen.findByRole('heading', { name: 'Padel 1' });
    expect(screen.queryByRole('link')?.getAttribute('href')).toBe(href);
  });
});
