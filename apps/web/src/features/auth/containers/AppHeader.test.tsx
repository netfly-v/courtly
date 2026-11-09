import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiErrorDto, UserDto } from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { AppHeader } from './AppHeader';

const navigation = vi.hoisted(() => ({ replace: vi.fn(), pathname: '/' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: navigation.replace }),
  usePathname: () => navigation.pathname,
}));
const { replace } = navigation;

const anna: UserDto = { id: 'u1', email: 'anna@courtly.dev', name: 'Anna Silva', role: 'USER' };

describe('AppHeader', () => {
  beforeEach(() => {
    navigation.pathname = '/';
  });

  it('shows who is logged in and logs out', async () => {
    let loggedOut = false;
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json(anna)),
      http.post('/api/auth/logout', () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    const user = userEvent.setup();
    renderWithClient(<AppHeader />);

    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(loggedOut).toBe(true);
  });

  it('stays on the page and says so when logging out fails', async () => {
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json(anna)),
      http.post(
        '/api/auth/logout',
        () => new HttpResponse('Internal Server Error', { status: 500 })
      )
    );
    const user = userEvent.setup();
    renderWithClient(<AppHeader />);

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not log out. Please try again.'
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a user',
      'USER',
      '/',
      [
        ['Courts', '/'],
        ['My bookings', '/bookings'],
      ],
    ],
    [
      'an admin',
      'ADMIN',
      '/admin',
      [
        ['Bookings', '/admin'],
        ['Courts', '/admin/courts'],
      ],
    ],
  ] as const)('shows %s the pages they can use', async (_who, role, home, links) => {
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json({ ...anna, role }))
    );
    renderWithClient(<AppHeader />);

    await screen.findByText('Anna Silva');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map(link => [link.textContent, link.getAttribute('href')])
    ).toEqual(links);
    expect(screen.getByRole('link', { name: 'Courtly' })).toHaveAttribute('href', home);
  });

  it.each([
    ['/', 'USER', 'Courts'],
    ['/courts/c1', 'USER', 'Courts'],
    ['/bookings', 'USER', 'My bookings'],
    ['/admin', 'ADMIN', 'Bookings'],
    ['/admin/courts', 'ADMIN', 'Courts'],
  ] as const)('marks the link of %s as the current page', async (pathname, role, current) => {
    navigation.pathname = pathname;
    server.use(
      http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json({ ...anna, role }))
    );
    renderWithClient(<AppHeader />);

    await screen.findByText('Anna Silva');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    const marked = within(nav)
      .getAllByRole('link')
      .filter(link => link.getAttribute('aria-current') === 'page');
    expect(marked.map(link => link.textContent)).toEqual([current]);
  });

  it('sends the user to the login page when the session has expired', async () => {
    server.use(
      http.get<never, never, ApiErrorDto>('/api/auth/me', () =>
        HttpResponse.json(
          { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' },
          { status: 401 }
        )
      )
    );
    renderWithClient(<AppHeader />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});
