import Link from 'next/link';
import { Button } from '@/shared/ui/button';

interface HeaderBarProps {
  userName?: string;
  loggingOut: boolean;
  logoutError?: string;
  onLogout: () => void;
}

export const HeaderBar = ({ userName, loggingOut, logoutError, onLogout }: HeaderBarProps) => (
  <header className="border-b bg-card">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
      <Link href="/" className="text-lg font-semibold text-primary">
        Courtly
      </Link>
      <div className="flex items-center gap-3">
        {logoutError && (
          <span role="alert" className="text-sm text-destructive">
            {logoutError}
          </span>
        )}
        {userName && <span className="text-sm text-muted-foreground">{userName}</span>}
        <Button variant="ghost" size="sm" disabled={loggingOut} onClick={onLogout}>
          Log out
        </Button>
      </div>
    </div>
  </header>
);
