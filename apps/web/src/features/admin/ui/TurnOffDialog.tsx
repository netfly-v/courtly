import { useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

interface TurnOffDialogProps {
  open: boolean;
  title: string;
  description: string;
  error?: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const TurnOffDialog = ({
  open,
  title,
  description,
  error,
  pending,
  onOpenChange,
  onConfirm,
  onCloseAutoFocus,
}: TurnOffDialogProps) => {
  const errorMessage = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) {
      errorMessage.current?.focus();
    }
  }, [error]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
          <AlertDialogCancel disabled={pending}>Keep it on</AlertDialogCancel>
          {/* Not AlertDialogAction: that closes the dialog at once, before an error could show. */}
          <Button disabled={pending} onClick={onConfirm}>
            Turn off
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
