'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getGetCourtAvailabilityQueryKey,
  getGetMeQueryKey,
  getListAdminCourtsQueryKey,
  getListDayBookingsQueryKey,
} from '@/shared/api/generated';
import type { AvailabilityChangedEventDto } from '@/shared/api/generated/model';

// The browser retries a dropped stream by itself, but gives up after an HTTP error:
// a 401, or the 500 the Next.js proxy answers while the API restarts.
const RECONNECT_MS = 5_000;

export const LiveUpdates = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    let source: EventSource | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let connectedBefore = false;

    const connect = () => {
      const current = new EventSource('/api/events');
      source = current;
      current.addEventListener('open', () => {
        // Events sent while the stream was down are lost.
        if (connectedBefore) {
          void queryClient.invalidateQueries();
        }
        connectedBefore = true;
      });
      current.addEventListener('availability.changed', event => {
        const { courtId, date } = JSON.parse(event.data as string) as AvailabilityChangedEventDto;
        // Also days not on screen: going back to one would show the old slots until its refetch.
        void queryClient.invalidateQueries({
          queryKey: getGetCourtAvailabilityQueryKey(courtId, { date }),
          refetchType: 'all',
        });
        void queryClient.invalidateQueries({
          queryKey: getListDayBookingsQueryKey({ date }),
          refetchType: 'all',
        });
        // A booking changes the court's upcoming count, shown in the Turn off dialog.
        void queryClient.invalidateQueries({ queryKey: getListAdminCourtsQueryKey() });
      });
      current.addEventListener('error', () => {
        if (current.readyState !== EventSource.CLOSED) {
          return;
        }
        // After a 401 the header sees the ended session and sends the user to /login.
        void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        reconnect = setTimeout(connect, RECONNECT_MS);
      });
    };

    const disconnect = () => {
      clearTimeout(reconnect);
      source?.close();
    };

    // Over HTTP/1.1 a browser opens only 6 connections to a site, and each open stream holds one.
    const followVisibility = () => (document.hidden ? disconnect() : connect());

    if (!document.hidden) {
      connect();
    }
    document.addEventListener('visibilitychange', followVisibility);
    return () => {
      document.removeEventListener('visibilitychange', followVisibility);
      disconnect();
    };
  }, [queryClient]);

  return null;
};
