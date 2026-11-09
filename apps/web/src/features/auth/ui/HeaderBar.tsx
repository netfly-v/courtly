import { cn } from 'cn';
import { LogOutIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { LogoMark } from './LogoMark';

interface NavLink {
  href: string;
  label: string;
  active: boolean;
}

interface HeaderBarProps {
  homeHref: string;
  links: NavLink[];
  userName?: string;
  userInitials?: string;
  loggingOut: boolean;
  logoutError?: string;
  onLogout: () => void;
}

export const HeaderBar = ({
  homeHref,
  links,
  userName,
  userInitials,
  loggingOut,
  logoutError,
  onLogout,
}: HeaderBarProps) => (
  <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-3 sm:gap-8">
        <Link
          href={homeHref}
          className="flex items-center gap-2 rounded-lg text-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoMark className="size-8" />
          <span className="sr-only sm:not-sr-only">Courtly</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={cn(
                'rounded-full px-3 py-1.5 whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                {
                  'bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary':
                    link.active,
                }
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {userName && (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            >
              {userInitials}
            </span>
            <span className="sr-only text-sm font-medium sm:not-sr-only">{userName}</span>
          </span>
        )}
        <Button variant="ghost" size="sm" disabled={loggingOut} onClick={onLogout}>
          <LogOutIcon aria-hidden />
          <span className="sr-only sm:not-sr-only">Log out</span>
        </Button>
      </div>
    </div>
    {logoutError && (
      <p role="alert" className="mx-auto max-w-5xl px-4 pb-2 text-right text-sm text-destructive">
        {logoutError}
      </p>
    )}
  </header>
);
