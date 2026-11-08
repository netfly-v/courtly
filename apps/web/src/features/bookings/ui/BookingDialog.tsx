import { useEffect, useRef } from 'react';
import type { CreateBookingDtoDurationHours } from '@/shared/api/generated/model';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

interface DurationOption {
  hours: CreateBookingDtoDurationHours;
  label: string;
  disabled: boolean;
  reason?: string;
}

interface BookingDialogProps {
  open: boolean;
  title: string;
  description: string;
  options: DurationOption[];
  error?: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (hours: CreateBookingDtoDurationHours) => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const BookingDialog = ({
  open,
  title,
  description,
  options,
  error,
  pending,
  onOpenChange,
  onBook,
  onCloseAutoFocus,
}: BookingDialogProps) => {
  const errorMessage = useRef<HTMLParagraphElement>(null);

  // A pressed button turns disabled while the request runs, so focus would drop to the page.
  useEffect(() => {
    if (error) {
      errorMessage.current?.focus();
    }
  }, [error]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {options.map(option => (
            <div key={option.hours} className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="lg"
                disabled={pending || option.disabled}
                aria-describedby={option.reason && `duration-${option.hours}-reason`}
                onClick={() => onBook(option.hours)}
              >
                {option.label}
              </Button>
              {option.reason && (
                <p id={`duration-${option.hours}-reason`} className="text-sm text-muted-foreground">
                  {option.reason}
                </p>
              )}
            </div>
          ))}
        </div>
        <p
          ref={errorMessage}
          role="alert"
          tabIndex={-1}
          className="min-h-5 text-sm text-destructive outline-none"
        >
          {error}
        </p>
      </DialogContent>
    </Dialog>
  );
};
