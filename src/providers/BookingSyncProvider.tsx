import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { fetchMyBookings, fetchRoomOccupancy } from '../services/bookings';
import { isSupabaseConfigured, supabase } from '../services/supabase';
import { useBookingStore } from '../store/useBookingStore';

interface BookingSyncContextValue {
  refreshAvailability: () => Promise<void>;
  refreshMyBookings: () => Promise<void>;
}

const BookingSyncContext = createContext<BookingSyncContextValue | null>(null);

export function BookingSyncProvider({ children }: React.PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const setAvailability = useBookingStore((state) => state.setAvailability);
  const setBookings = useBookingStore((state) => state.setBookings);
  const setBookingsState = useBookingStore((state) => state.setBookingsState);
  const setOccupiedSlots = useBookingStore((state) => state.setOccupiedSlots);
  const bookingsRequestRef = useRef(0);

  useLayoutEffect(() => {
    // Clear owner-scoped rows before the account change can paint another user's previous rows.
    bookingsRequestRef.current += 1;
    setBookings([]);
    setBookingsState(isSupabaseConfigured && userId ? 'loading' : 'idle');
  }, [setBookings, setBookingsState, userId]);

  const refreshAvailability = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setOccupiedSlots([]);
      setAvailability('unavailable', 'Connect Supabase to load the shared room schedule.');
      return;
    }

    setAvailability('checking', 'Checking the shared room schedule…');
    try {
      setOccupiedSlots(await fetchRoomOccupancy());
      setAvailability('ready');
    } catch (error) {
      setAvailability(
        'unavailable',
        error instanceof Error ? error.message : 'Could not reach the shared room schedule.'
      );
    }
  }, [setAvailability, setOccupiedSlots]);

  const refreshMyBookings = useCallback(async () => {
    const request = ++bookingsRequestRef.current;
    const client = supabase;
    if (!userId || !isSupabaseConfigured || !client) {
      setBookings([]);
      setBookingsState('idle');
      return;
    }

    setBookingsState('loading');
    try {
      const bookings = await fetchMyBookings();
      const { data } = await client.auth.getSession();
      if (request !== bookingsRequestRef.current || data.session?.user.id !== userId) return;
      setBookings(bookings);
    } catch (error) {
      if (request !== bookingsRequestRef.current) return;
      try {
        const { data } = await client.auth.getSession();
        if (data.session?.user.id !== userId) return;
      } catch {
        return;
      }
      setBookingsState(
        'unavailable',
        error instanceof Error ? error.message : 'Could not load your reservations.'
      );
    }
  }, [setBookings, setBookingsState, userId]);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      bookingsRequestRef.current += 1;
      setAvailability('unavailable', 'Connect Supabase to load the shared room schedule.');
      setOccupiedSlots([]);
      setBookings([]);
      setBookingsState('idle');
      return;
    }

    let mounted = true;
    let realtimeConnected = false;
    let availabilityRequest = 0;

    const updateAvailability = async () => {
      const request = ++availabilityRequest;
      try {
        const slots = await fetchRoomOccupancy();
        if (!mounted || request !== availabilityRequest) return;
        setOccupiedSlots(slots);
        setAvailability(
          'ready',
          realtimeConnected ? null : 'Schedule loaded. Live changes are reconnecting.'
        );
      } catch (error) {
        if (!mounted || request !== availabilityRequest) return;
        setAvailability(
          'unavailable',
          error instanceof Error ? error.message : 'Could not reach the shared room schedule.'
        );
      }
    };

    const updateBookings = async () => {
      const request = ++bookingsRequestRef.current;
      if (!userId) {
        if (mounted) {
          setBookings([]);
          setBookingsState('idle');
        }
        return;
      }

      setBookingsState('loading');
      try {
        const bookings = await fetchMyBookings();
        const { data } = await client.auth.getSession();
        if (mounted && request === bookingsRequestRef.current && data.session?.user.id === userId) {
          setBookings(bookings);
        }
      } catch (error) {
        if (mounted && request === bookingsRequestRef.current) {
          try {
            const { data } = await client.auth.getSession();
            if (data.session?.user.id !== userId) return;
          } catch {
            return;
          }
          setBookingsState(
            'unavailable',
            error instanceof Error ? error.message : 'Could not load your reservations.'
          );
        }
      }
    };

    setAvailability('checking', 'Connecting to the shared room schedule…');
    void updateAvailability();
    void updateBookings();

    const channel = client
      .channel('booking-data-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_occupancy' }, () => {
        void updateAvailability();
      })
      // RLS limits booking events to rows owned by the signed-in user.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void updateBookings();
        void updateAvailability();
      })
      .subscribe((status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          realtimeConnected = true;
          void updateAvailability();
          void updateBookings();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeConnected = false;
          availabilityRequest += 1;
          setAvailability('unavailable', 'Live room updates are disconnected. Reconnect to refresh the schedule.');
        }
      });

    return () => {
      mounted = false;
      bookingsRequestRef.current += 1;
      void client.removeChannel(channel);
    };
  }, [setAvailability, setBookings, setBookingsState, setOccupiedSlots, userId]);

  const value = useMemo(
    () => ({ refreshAvailability, refreshMyBookings }),
    [refreshAvailability, refreshMyBookings]
  );
  return <BookingSyncContext.Provider value={value}>{children}</BookingSyncContext.Provider>;
}

export function useBookingSync() {
  const value = useContext(BookingSyncContext);
  if (!value) throw new Error('useBookingSync must be used inside BookingSyncProvider.');
  return value;
}
