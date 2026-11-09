'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useGetMe, useLogout } from '@/shared/api/generated';
import { Role } from '@/shared/api/generated/model';
import { HeaderBar } from '../ui/HeaderBar';

const navLinks = (role: Role | undefined, pathname: string) => {
  if (role === Role.ADMIN) {
    return [
      { href: '/admin', label: 'Bookings', active: pathname === '/admin' },
      { href: '/admin/courts', label: 'Courts', active: pathname === '/admin/courts' },
    ];
  }
  if (role === Role.USER) {
    return [
      { href: '/', label: 'Courts', active: pathname === '/' || pathname.startsWith('/courts/') },
      { href: '/bookings', label: 'My bookings', active: pathname === '/bookings' },
    ];
  }
  return [];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map(part => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
      homeHref={me.data?.role === Role.ADMIN ? '/admin' : '/'}
      links={navLinks(me.data?.role, pathname)}
      userName={me.data?.name}
      userInitials={me.data && initials(me.data.name)}
      loggingOut={logout.isPending}
      logoutError={logout.isError ? 'Could not log out. Please try again.' : undefined}
      onLogout={() => logout.mutate()}
    />
  );
};
