import type { ReactNode } from 'react';
import { CourtDrawing } from '@/entities/court/ui/CourtDrawing';
import { Sport } from '@/shared/api/generated/model';
import { LogoMark } from './LogoMark';

const Wordmark = () => (
  <span className="flex items-center gap-2 text-xl font-semibold tracking-tight">
    <LogoMark className="size-9 rounded-[9px] ring-1 ring-white/25" />
    Courtly
  </span>
);

export const LoginLayout = ({ children }: { children: ReactNode }) => (
  <main className="grid min-h-screen lg:grid-cols-2">
    <aside className="hidden flex-col justify-between gap-10 bg-brand p-10 text-brand-foreground lg:flex">
      <Wordmark />
      <CourtDrawing
        sport={Sport.TENNIS}
        variant="outline"
        className="mx-auto w-full max-w-lg text-brand-foreground/35"
      />
      <div className="flex max-w-md flex-col gap-3">
        <p className="text-3xl font-semibold tracking-tight">Book a court in a few clicks.</p>
        <p className="text-brand-foreground/75">
          See free times for every court, book one or two hours, and watch the slots change live
          when someone else books.
        </p>
      </div>
    </aside>
    <div className="flex flex-col items-center justify-center gap-8 p-4 sm:p-8">
      <div className="lg:hidden">
        <Wordmark />
      </div>
      {children}
    </div>
  </main>
);
