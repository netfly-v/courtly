import { cn } from 'cn';

export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden className={cn('shrink-0', className)}>
    <rect width="32" height="32" rx="9" className="fill-brand" />
    <rect
      x="7"
      y="9.5"
      width="18"
      height="13"
      rx="1"
      fill="none"
      className="stroke-brand-foreground"
      strokeWidth="1.8"
    />
    <path
      d="M16 7.5v17M11 9.5v13M21 9.5v13M11 16h10"
      className="stroke-brand-foreground"
      strokeWidth="1.8"
    />
  </svg>
);
