'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ApiError } from '@/shared/api/fetcher';
import { getGetMeQueryKey, useLogin } from '@/shared/api/generated';
import { type LoginDto, Role } from '@/shared/api/generated/model';
import { loginSchema } from '../login-schema';
import { LoginForm } from '../ui/LoginForm';

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
        queryClient.setQueryData(getGetMeQueryKey(), user);
        router.replace(user.role === Role.ADMIN ? '/admin' : '/');
      },
    },
  });

  // Stays on while the page after login is loading, so nobody clicks twice.
  const pending = login.isPending || login.isSuccess;

  // Every logout and ended session lands here; Back must not show the last user's data.
  useEffect(() => {
    queryClient.clear();
  }, [queryClient]);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm
        form={form}
        error={toErrorMessage(login.error)}
        pending={pending}
        onSubmit={data => login.mutate({ data })}
      />
    </main>
  );
};
