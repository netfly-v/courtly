'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGetMe, useLogout } from '@/shared/api/generated';
import { HeaderBar } from '../ui/HeaderBar';

export const AppHeader = () => {
  const router = useRouter();
  const me = useGetMe();
  const logout = useLogout({ mutation: { onSuccess: () => router.replace('/login') } });
  const sessionExpired = me.error?.status === 401;

  useEffect(() => {
    if (sessionExpired) {
      router.replace('/login');
    }
  }, [sessionExpired, router]);

  return (
    <HeaderBar
      userName={me.data?.name}
      loggingOut={logout.isPending}
      logoutError={logout.isError ? 'Could not log out. Please try again.' : undefined}
      onLogout={() => logout.mutate()}
    />
  );
};
