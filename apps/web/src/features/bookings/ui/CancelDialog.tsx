import { useEffect, useRef } from 'react';
import { Button } from '@/shared/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface CancelDialogProps {
  open: boolean;
  summary: string;
  error?: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const CancelDialog = ({
  open,
  summary,
  error,
  pending,
  onOpenChange,
  onConfirm,
  onCloseAutoFocus,
}: CancelDialogProps) => {
  const errorMessage = useRef<HTMLParagraphElement>(null);

  // A pressed button turns disabled while the request runs, so focus would drop to the page.
  useEffect(() => {
    if (error) {
      errorMessage.current?.focus();
    }
  }, [error]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
          <AlertDialogDescription>{summary}</AlertDialogDescription>
        </AlertDialogHeader>
        <p
          ref={errorMessage}
          role="alert"
          tabIndex={-1}
          className="min-h-5 text-sm text-destructive outline-none"
        >
          {error}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep booking</AlertDialogCancel>
          {/* Not AlertDialogAction: that closes the dialog at once, before an error could show. */}
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            Cancel booking
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
