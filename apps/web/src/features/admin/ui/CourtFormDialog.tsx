import { useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';
import type { CourtFormValues } from '../court-form-schema';

interface Option {
  value: string;
  label: string;
}

interface CourtFormDialogProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  form: UseFormReturn<CourtFormValues>;
  sportOptions: Option[];
  openHourOptions: Option[];
  closeHourOptions: Option[];
  error?: string;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CourtFormValues) => void;
  onCloseAutoFocus: (event: Event) => void;
}

const FieldMessage = ({ id, message }: { id: string; message?: string }) => (
  <p id={id} className="min-h-5 text-sm text-destructive">
    {message}
  </p>
);

export const CourtFormDialog = ({
  open,
  title,
  description,
  submitLabel,
  form,
  sportOptions,
  openHourOptions,
  closeHourOptions,
  error,
  pending,
  onOpenChange,
  onSubmit,
  onCloseAutoFocus,
}: CourtFormDialogProps) => {
  const { errors } = form.formState;
  const errorMessage = useRef<HTMLParagraphElement>(null);

  // Save turns disabled while the request runs, so focus would drop to the page.
  useEffect(() => {
    if (error) {
      errorMessage.current?.focus();
    }
  }, [error]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-1.5"
          noValidate
          onSubmit={event => void form.handleSubmit(onSubmit)(event)}
        >
          <Label htmlFor="court-name">Name</Label>
          <Input
            id="court-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            aria-describedby="court-name-error"
            {...form.register('name')}
          />
          <FieldMessage id="court-name-error" message={errors.name?.message} />

          <Label htmlFor="court-sport">Sport</Label>
          <NativeSelect
            id="court-sport"
            className="w-full"
            aria-invalid={Boolean(errors.sport)}
            aria-describedby="court-sport-error"
            {...form.register('sport')}
          >
            <NativeSelectOption value="">Choose a sport</NativeSelectOption>
            {sportOptions.map(option => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldMessage id="court-sport-error" message={errors.sport?.message} />

          <Label htmlFor="court-price">Price per hour (€)</Label>
          <Input
            id="court-price"
            // Text, not number: a mouse wheel over a focused number field changes the price.
            inputMode="decimal"
            aria-invalid={Boolean(errors.hourlyPrice)}
            aria-describedby="court-price-error"
            {...form.register('hourlyPrice')}
          />
          <FieldMessage id="court-price-error" message={errors.hourlyPrice?.message} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="court-open">Opens at</Label>
              <NativeSelect
                id="court-open"
                className="w-full"
                aria-invalid={Boolean(errors.openHour)}
                aria-describedby="court-open-error court-form-error"
                {...form.register('openHour', { valueAsNumber: true, deps: ['closeHour'] })}
              >
                {openHourOptions.map(option => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldMessage id="court-open-error" message={errors.openHour?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="court-close">Closes at</Label>
              <NativeSelect
                id="court-close"
                className="w-full"
                aria-invalid={Boolean(errors.closeHour)}
                aria-describedby="court-close-error court-form-error"
                {...form.register('closeHour', { valueAsNumber: true })}
              >
                {closeHourOptions.map(option => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldMessage id="court-close-error" message={errors.closeHour?.message} />
            </div>
          </div>

          <p
            ref={errorMessage}
            id="court-form-error"
            role="alert"
            tabIndex={-1}
            className="min-h-5 text-sm text-destructive outline-none"
          >
            {error}
          </p>
          <Button type="submit" size="lg" disabled={pending}>
            {submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
