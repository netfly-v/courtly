'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { ApiError } from '@/shared/api/fetcher';
import { getGetMeQueryKey, useLogin } from '@/shared/api/generated';
import { type LoginDto, Role } from '@/shared/api/generated/model';
import { loginSchema } from '../login-schema';
import { LoginForm } from '../ui/LoginForm';

// Must match the demo users in apps/api/prisma/seed.ts.
const DEMO_PASSWORD = 'courtly-demo';
const DEMO_ACCOUNTS = [
  { name: 'Anna Silva', initials: 'AS', email: 'anna@courtly.dev', role: 'User' },
  { name: 'Ben Costa', initials: 'BC', email: 'ben@courtly.dev', role: 'User' },
  { name: 'Vitalii', initials: 'V', email: 'admin@courtly.dev', role: 'Admin' },
];

const toErrorMessage = (error: ApiError | null) => {
  if (!error) {
    return undefined;
  }
  if (error.status >= 400 && error.status < 500) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

export const LoginPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<LoginDto>({
    resolver: yupResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const login = useLogin({
    mutation: {
      onSuccess: user => {
        queryClient.clear();
        queryClient.setQueryData(getGetMeQueryKey(), user);
        router.replace(user.role === Role.ADMIN ? '/admin' : '/');
      },
    },
  });

  const logIn = (data: LoginDto) => login.mutate({ data });
  // Stays on while the page after login is loading, so nobody clicks twice.
  const pending = login.isPending || login.isSuccess;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm
        form={form}
        demoAccounts={DEMO_ACCOUNTS}
        error={toErrorMessage(login.error)}
        pending={pending}
        onSubmit={logIn}
        onDemoLogin={email => logIn({ email, password: DEMO_PASSWORD })}
      />
    </main>
  );
};
