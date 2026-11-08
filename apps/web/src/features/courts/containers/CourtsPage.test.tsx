import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { getListCourtsQueryKey } from '@/shared/api/generated';
import type { CourtDto } from '@/shared/api/generated/model';
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

describe('CourtsPage', () => {
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
});
