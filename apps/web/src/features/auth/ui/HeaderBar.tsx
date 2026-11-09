import { cn } from 'cn';
import Link from 'next/link';
import { Button } from '@/shared/ui/button';

interface NavLink {
  href: string;
  label: string;
  active: boolean;
}

interface HeaderBarProps {
  homeHref: string;
  links: NavLink[];
  userName?: string;
  loggingOut: boolean;
  logoutError?: string;
  onLogout: () => void;
}

export const HeaderBar = ({
  homeHref,
  links,
  userName,
  loggingOut,
  logoutError,
  onLogout,
}: HeaderBarProps) => (
  <header className="border-b bg-card">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link href={homeHref} className="text-lg font-semibold text-primary">
          Courtly
        </Link>
        <nav aria-label="Main" className="flex items-center gap-4 text-sm">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={cn('whitespace-nowrap text-muted-foreground hover:text-foreground', {
                'font-medium text-foreground': link.active,
              })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {userName && (
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
        )}
        <Button variant="ghost" size="sm" disabled={loggingOut} onClick={onLogout}>
          Log out
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
