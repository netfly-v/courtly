'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  centsToEuros,
  eurosToCents,
  formatHour,
  formatHourlyPrice,
  formatOpeningHours,
  formatSport,
} from '@/entities/court/format';
import { formatDayOf, formatTime } from '@/entities/facility/time';
import type { ApiError } from '@/shared/api/fetcher';
import {
  getListAdminCourtsQueryKey,
  useCreateCourt,
  useGetFacility,
  useListAdminCourts,
  useUpdateCourt,
} from '@/shared/api/generated';
import {
  type AdminCourtDto,
  type CreateCourtDto,
  Sport,
  type UpdateCourtDto,
} from '@/shared/api/generated/model';
import { Button } from '@/shared/ui/button';
import { type CourtFormValues, courtFormSchema } from '../court-form-schema';
import { toErrorMessage } from '../error-message';
import { CourtFormDialog } from '../ui/CourtFormDialog';
import { CourtsTable } from '../ui/CourtsTable';
import { TurnOffDialog } from '../ui/TurnOffDialog';

const SPORT_OPTIONS = Object.values(Sport).map(sport => ({
  value: sport,
  label: formatSport(sport),
}));
const hourOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => {
    const hour = from + index;
    return { value: String(hour), label: hour === 24 ? '24:00 (midnight)' : formatHour(hour) };
  });
const OPEN_HOUR_OPTIONS = hourOptions(0, 23);
const CLOSE_HOUR_OPTIONS = hourOptions(1, 24);

const NEW_COURT: Partial<CourtFormValues> = {
  name: '',
  hourlyPrice: '',
  openHour: 8,
  closeHour: 22,
};

const toCourtDto = (values: CourtFormValues): CreateCourtDto => ({
  name: values.name,
  sport: values.sport,
  hourlyPriceCents: eurosToCents(values.hourlyPrice),
  openHour: values.openHour,
  closeHour: values.closeHour,
});

// Sending the full DTO would undo edits another admin made to other fields.
const changedFields = (dto: CreateCourtDto, court: AdminCourtDto): UpdateCourtDto => ({
  ...(dto.name !== court.name && { name: dto.name }),
  ...(dto.sport !== court.sport && { sport: dto.sport }),
  ...(dto.hourlyPriceCents !== court.hourlyPriceCents && {
    hourlyPriceCents: dto.hourlyPriceCents,
  }),
  // The API checks one new hour against the stored other one, so both go together.
  ...((dto.openHour !== court.openHour || dto.closeHour !== court.closeHour) && {
    openHour: dto.openHour,
    closeHour: dto.closeHour,
  }),
});

const staysValid = (count: number) =>
  count === 1
    ? 'Its 1 upcoming booking stays valid.'
    : `Its ${count} upcoming bookings stay valid.`;

const formErrorMessage = (error: ApiError | null, timeZone: string) => {
  const count = error?.details?.count;
  const lastEndsAt = error?.details?.lastEndsAt;
  if (
    error?.code !== 'COURT_HAS_BOOKINGS_OUTSIDE_HOURS' ||
    typeof count !== 'number' ||
    typeof lastEndsAt !== 'string'
  ) {
    return toErrorMessage(error);
  }
  const ends = `${formatDayOf(lastEndsAt, timeZone)}, ${formatTime(lastEndsAt, timeZone)}`;
  if (count === 1) {
    return `1 upcoming booking falls outside these hours (it ends ${ends}). Choose hours that still fit it.`;
  }
  return `${count} upcoming bookings fall outside these hours (the last one ends ${ends}). Choose hours that still fit them.`;
};

const turnOffDescription = (court: AdminCourtDto | undefined) => {
  const hidden = "Players won't see it and can't book it.";
  if (!court?.upcomingBookingsCount) {
    return hidden;
  }
  return `${hidden} ${staysValid(court.upcomingBookingsCount)}`;
};

export const AdminCourtsPage = () => {
  const [editing, setEditing] = useState<AdminCourtDto>();
  const [formOpen, setFormOpen] = useState(false);
  const [turningOff, setTurningOff] = useState<AdminCourtDto>();
  const [turnOffOpen, setTurnOffOpen] = useState(false);
  const [notice, setNotice] = useState<string>();
  const openedBy = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const queryClient = useQueryClient();
  const facility = useGetFacility({ query: { staleTime: Infinity } });
  const courts = useListAdminCourts();
  const form = useForm<CourtFormValues>({
    resolver: yupResolver(courtFormSchema),
    mode: 'onTouched',
  });
  const refreshCourts = () => {
    void queryClient.invalidateQueries({ queryKey: getListAdminCourtsQueryKey() });
  };
  const createCourt = useCreateCourt({ mutation: { onSettled: refreshCourts } });
  const updateCourt = useUpdateCourt({ mutation: { onSettled: refreshCourts } });
  const toggleCourt = useUpdateCourt({ mutation: { onSettled: refreshCourts } });

  const openForm = (court: AdminCourtDto | undefined, button: HTMLButtonElement) => {
    openedBy.current = button;
    createCourt.reset();
    updateCourt.reset();
    toggleCourt.reset();
    setNotice(undefined);
    setEditing(court);
    form.reset(
      court
        ? {
            name: court.name,
            sport: court.sport,
            hourlyPrice: centsToEuros(court.hourlyPriceCents),
            openHour: court.openHour,
            closeHour: court.closeHour,
          }
        : NEW_COURT
    );
    setFormOpen(true);
  };

  const done = (message: string) => {
    setNotice(message);
    setFormOpen(false);
    setTurnOffOpen(false);
  };

  const submitCourt = (values: CourtFormValues) => {
    const dto = toCourtDto(values);
    // Not in the hooks: reset() drops these, so an old request can't close a new dialog.
    if (!editing) {
      createCourt.mutate({ data: dto }, { onSuccess: court => done(`Added ${court.name}.`) });
      return;
    }
    const changes = changedFields(dto, editing);
    if (Object.keys(changes).length === 0) {
      setFormOpen(false);
      return;
    }
    updateCourt.mutate(
      { id: editing.id, data: changes },
      { onSuccess: court => done(`Saved ${court.name}.`) }
    );
  };

  const toggle = (id: string, button: HTMLButtonElement) => {
    const court = courts.data?.find(item => item.id === id);
    if (!court) {
      return;
    }
    toggleCourt.reset();
    setNotice(undefined);
    if (!court.isActive) {
      toggleCourt.mutate(
        { id, data: { isActive: true } },
        { onSuccess: updated => setNotice(`Turned on ${updated.name}.`) }
      );
      return;
    }
    openedBy.current = button;
    setTurningOff(court);
    setTurnOffOpen(true);
  };

  const confirmTurnOff = () => {
    if (!turningOff) {
      return;
    }
    const count = turningOff.upcomingBookingsCount;
    toggleCourt.mutate(
      { id: turningOff.id, data: { isActive: false } },
      {
        onSuccess: court =>
          done(
            count ? `Turned off ${court.name}. ${staysValid(count)}` : `Turned off ${court.name}.`
          ),
      }
    );
  };

  // Radix returns focus to a trigger button, and these dialogs have none.
  const restoreFocus = (event: Event) => {
    event.preventDefault();
    const target = notice ? noticeRef.current : openedBy.current;
    (target?.isConnected ? target : heading.current)?.focus();
  };

  if (courts.error?.status === 403) {
    return <p>This page is for admins. Log in with an admin account to see it.</p>;
  }
  if ((!courts.data && courts.isError) || (!facility.data && facility.isError)) {
    return (
      <p role="alert" className="text-destructive">
        Could not load the courts. Please try again.
      </p>
    );
  }
  if (!courts.data || !facility.data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  const { timezone } = facility.data;
  const formMutation = editing ? updateCourt : createCourt;
  const turnOnError = toggleCourt.variables?.data.isActive ? toggleCourt.error : null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Courts
        </h1>
        <Button onClick={event => openForm(undefined, event.currentTarget)}>Add court</Button>
      </div>
      {notice && (
        <p
          ref={noticeRef}
          role="status"
          tabIndex={-1}
          className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm outline-none"
        >
          {notice}
        </p>
      )}
      {turnOnError && (
        <p role="alert" className="text-sm text-destructive">
          {toErrorMessage(turnOnError)}
        </p>
      )}
      <CourtsTable
        courts={courts.data.map(court => ({
          id: court.id,
          name: court.name,
          sport: formatSport(court.sport),
          openingHours: formatOpeningHours(court.openHour, court.closeHour),
          price: formatHourlyPrice(court.hourlyPriceCents),
          upcomingBookings: court.upcomingBookingsCount,
          status: court.isActive ? 'Active' : 'Turned off',
          active: court.isActive,
          toggleLabel: court.isActive ? 'Turn off' : 'Turn on',
        }))}
        onEdit={(id, button) =>
          openForm(
            courts.data.find(court => court.id === id),
            button
          )
        }
        onToggle={toggle}
      />
      <CourtFormDialog
        open={formOpen}
        title={editing ? `Edit ${editing.name}` : 'Add a court'}
        description={
          editing
            ? 'New hours must still fit upcoming bookings. A new price applies to new bookings only.'
            : 'A new court takes bookings right away.'
        }
        submitLabel={editing ? 'Save' : 'Add court'}
        form={form}
        sportOptions={SPORT_OPTIONS}
        openHourOptions={OPEN_HOUR_OPTIONS}
        closeHourOptions={CLOSE_HOUR_OPTIONS}
        error={formErrorMessage(formMutation.error, timezone)}
        pending={formMutation.isPending}
        // Stays open while saving, so a failed save can still show why.
        onOpenChange={open => !formMutation.isPending && setFormOpen(open)}
        onSubmit={submitCourt}
        onCloseAutoFocus={restoreFocus}
      />
      <TurnOffDialog
        open={turnOffOpen}
        title={`Turn off ${turningOff?.name ?? 'this court'}?`}
        description={turnOffDescription(turningOff)}
        error={turnOnError ? undefined : toErrorMessage(toggleCourt.error)}
        pending={toggleCourt.isPending}
        onOpenChange={open => !toggleCourt.isPending && setTurnOffOpen(open)}
        onConfirm={confirmTurnOff}
        onCloseAutoFocus={restoreFocus}
      />
    </section>
  );
};
