import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { ApiErrorDto, LoginDto, UserDto } from '@/shared/api/generated/model';
import { createQueryClient } from '@/shared/api/query-client';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { AppHeader } from './AppHeader';
import { LoginPage } from './LoginPage';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/' }));

const anna: UserDto = { id: 'u1', email: 'anna@courtly.dev', name: 'Anna Silva', role: 'USER' };

const logIn = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
};

describe('LoginPage', () => {
  it.each([
    ['a user', anna, '/'],
    ['an admin', { ...anna, name: 'Vitalii', email: 'admin@courtly.dev', role: 'ADMIN' }, '/admin'],
  ] as const)('logs in %s and opens their home page', async (_name, account, home) => {
    let sent: LoginDto | undefined;
    server.use(
      http.post<never, LoginDto, UserDto>('/api/auth/login', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(account);
      })
    );
    renderWithClient(<LoginPage />);

    await logIn(account.email, 'courtly-demo');

    await waitFor(() => expect(replace).toHaveBeenCalledWith(home));
    expect(sent).toEqual({ email: account.email, password: 'courtly-demo' });
  });

  it('shows the message from the API when the password is wrong', async () => {
    server.use(
      http.post<never, LoginDto, ApiErrorDto>('/api/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Wrong email or password' },
          { status: 401 }
        )
      )
    );
    renderWithClient(<LoginPage />);

    await logIn('anna@courtly.dev', 'wrong');

    expect(await screen.findByText('Wrong email or password')).toHaveRole('alert');
    expect(replace).not.toHaveBeenCalled();
  });

  it('says under each field what is wrong and sends nothing', async () => {
    let requests = 0;
    server.use(
      http.post<never, LoginDto, UserDto>('/api/auth/login', () => {
        requests += 1;
        return HttpResponse.json(anna);
      })
    );
    const user = userEvent.setup();
    renderWithClient(<LoginPage />);
    const email = screen.getByLabelText('Email');

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(email).toHaveAccessibleDescription('Enter your email'));
    expect(email).toBeInvalid();
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Enter your password');
    expect(screen.getByLabelText('Password')).toBeInvalid();
    await user.type(email, 'anna@courtly');
    await waitFor(() =>
      expect(email).toHaveAccessibleDescription('Enter a valid email, like anna@courtly.dev')
    );
    expect(requests).toBe(0);
  });

  it('shows the typed password on request and hides it again, without sending the form', async () => {
    const user = userEvent.setup();
    renderWithClient(<LoginPage />);
    const password = screen.getByLabelText('Password');
    await user.type(password, 'courtly-demo');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Email')).toBeValid();
  });

  it('forgets the last user, so going back after logout does not show their name', async () => {
    server.use(http.get<never, never, UserDto>('/api/auth/me', () => HttpResponse.json(anna)));
    const client = createQueryClient();
    const header = renderWithClient(<AppHeader />, client);
    expect(await screen.findByText('Anna Silva')).toBeInTheDocument();
    header.unmount();
    renderWithClient(<LoginPage />, client).unmount();
    server.use(
      http.get<never, never, ApiErrorDto>('/api/auth/me', () =>
        HttpResponse.json(
          { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Please log in' },
          { status: 401 }
        )
      )
    );

    renderWithClient(<AppHeader />, client);

    expect(screen.queryByText('Anna Silva')).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it.each([
    ['the API is down', () => new HttpResponse('Internal Server Error', { status: 500 })],
    ['the network fails', () => HttpResponse.error()],
  ])('shows a general message when %s', async (_case, answer) => {
    server.use(http.post('/api/auth/login', answer));
    renderWithClient(<LoginPage />);

    await logIn('anna@courtly.dev', 'courtly-demo');

    expect(await screen.findByText('Something went wrong. Please try again.')).toHaveRole('alert');
  });
});
