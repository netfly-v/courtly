import { cn } from 'cn';
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'Courtly', template: '%s · Courtly' },
  description: 'Book a sports court',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={cn('font-sans', geist.variable)}>
    <body className="min-h-screen antialiased">
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
