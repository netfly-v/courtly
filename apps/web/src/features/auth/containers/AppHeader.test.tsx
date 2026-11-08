import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { ApiErrorDto, UserDto } from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { AppHeader } from './AppHeader';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const anna: UserDto = { id: 'u1', email: 'anna@courtly.dev', name: 'Anna Silva', role: 'USER' };

describe('AppHeader', () => {
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
