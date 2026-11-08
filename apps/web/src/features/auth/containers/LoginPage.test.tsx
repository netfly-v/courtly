import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { ApiErrorDto, LoginDto, UserDto } from '@/shared/api/generated/model';
import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';
import { LoginPage } from './LoginPage';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const anna: UserDto = { id: 'u1', email: 'anna@courtly.dev', name: 'Anna Silva', role: 'USER' };

describe('LoginPage', () => {
  it('logs in with a demo account and opens the courts', async () => {
    let sent: LoginDto | undefined;
    server.use(
      http.post<never, LoginDto, UserDto>('/api/auth/login', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(anna);
      })
    );
    const user = userEvent.setup();
    renderWithClient(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Log in as Anna Silva' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(sent).toEqual({ email: 'anna@courtly.dev', password: 'courtly-demo' });
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
    const user = userEvent.setup();
    renderWithClient(<LoginPage />);

    await user.type(screen.getByLabelText('Email'), 'anna@courtly.dev');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

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

  it.each([
    ['the API is down', () => new HttpResponse('Internal Server Error', { status: 500 })],
    ['the network fails', () => HttpResponse.error()],
  ])('shows a general message when %s', async (_case, answer) => {
    server.use(http.post('/api/auth/login', answer));
    const user = userEvent.setup();
    renderWithClient(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Log in as Vitalii' }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toHaveRole('alert');
  });
});
