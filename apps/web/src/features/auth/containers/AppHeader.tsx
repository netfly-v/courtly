'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGetMe, useLogout } from '@/shared/api/generated';
import { Role } from '@/shared/api/generated/model';
import { HeaderBar } from '../ui/HeaderBar';

// Admins can't book, so they get no My bookings page.
const navLinks = (role: Role | undefined, pathname: string) => {
  const courts = {
    href: '/',
    label: 'Courts',
    active: pathname === '/' || pathname.startsWith('/courts/'),
  };
  if (role !== Role.USER) {
    return [courts];
  }
  return [courts, { href: '/bookings', label: 'My bookings', active: pathname === '/bookings' }];
};

export const AppHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
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
      links={navLinks(me.data?.role, pathname)}
      userName={me.data?.name}
      loggingOut={logout.isPending}
      logoutError={logout.isError ? 'Could not log out. Please try again.' : undefined}
      onLogout={() => logout.mutate()}
    />
  );
};
