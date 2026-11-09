import type { ReactNode } from 'react';
import { AppHeader } from '@/features/auth/containers/AppHeader';
import { LiveUpdates } from '@/features/live-updates/containers/LiveUpdates';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <>
    <AppHeader />
    <LiveUpdates />
    <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
  </>
);

export default AppLayout;
