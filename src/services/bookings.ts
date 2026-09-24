import { Booking, BookingStatus, PublicOccupancy, Room } from '../types';
import { TIME_SLOTS } from '../data/timeSlots';
import { isSupabaseConfigured, supabase } from './supabase';

interface BookingRow {
  id: string;
  room_id: string;
  booking_date: string;
  slot_id: string;
  purpose: string;
  status: BookingStatus;
  created_at: string;
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Room booking is view-only until it is connected.');
  }
  return supabase;
}

async function requireVkuSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  const email = data.session?.user.email?.trim().toLowerCase();
  if (error || !data.session || !email || !/^[^@\s]+@vku\.udn\.vn$/.test(email)) {
    throw new Error('Sign in with your @vku.udn.vn account to manage room bookings.');
  }
  return client;
}

export async function fetchRoomOccupancy(): Promise<PublicOccupancy[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('room_occupancy')
    .select('room_id, booking_date, slot_id');

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    roomId: row.room_id,
    date: row.booking_date,
    slotId: row.slot_id,
  }));
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const email = sessionData.session?.user.email?.trim().toLowerCase() ?? '';
  const { data, error } = await client
    .from('bookings')
    .select('id, room_id, booking_date, slot_id, purpose, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as BookingRow[];
  if (rows.length === 0) return [];

  const roomIds = [...new Set(rows.map((row) => row.room_id))];
  const { data: roomData, error: roomError } = await client
    .from('rooms')
    .select('id, name, building, floor, capacity')
    .in('id', roomIds);

  if (roomError) throw new Error(roomError.message);
  const roomMap = new Map((roomData ?? []).map((room) => [room.id, room as Partial<Room> & { id: string }]));

  return rows.map((row) => {
    const room = roomMap.get(row.room_id);
    const timeRange = TIME_SLOTS.find((slot) => slot.id === row.slot_id)?.label ?? row.slot_id;
    const booking: Booking = {
      id: row.id,
      roomId: row.room_id,
      roomName: room?.name ?? 'Study room',
      building: (room?.building ?? 'KA') as Room['building'],
      floor: room?.floor ?? 1,
      capacity: room?.capacity ?? 0,
      date: row.booking_date,
      slotId: row.slot_id,
      timeRange,
      userStudentId: 'Not provided',
      userName: email || 'VKU account holder',
      purpose: row.purpose,
      qrCodeString: JSON.stringify({ bookingId: row.id }),
      status: row.status,
      createdAt: Date.parse(row.created_at),
    };
    return booking;
  });
}

export interface CreateBookingInput {
  roomId: string;
  date: string;
  slotId: string;
  purpose: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const client = await requireVkuSession();
  const purpose = input.purpose.trim() || 'Group study';
  if (purpose.length > 300) throw new Error('Purpose must be 300 characters or fewer.');

  const { data, error } = await client
    .from('bookings')
    .insert({
      room_id: input.roomId,
      booking_date: input.date,
      slot_id: input.slotId,
      purpose,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This time slot was just booked. The schedule has been refreshed; choose another slot.');
    }
    if (error.code === '42501') {
      throw new Error('Sign in with a @vku.udn.vn account to book a room.');
    }
    if (error.code === '23503') {
      throw new Error('This room is not available in the connected campus schedule. Refresh and try again.');
    }
    throw new Error(error.message);
  }

  // Read the committed row back through the caller's RLS policy before returning a ticket.
  const bookings = await fetchMyBookings();
  const booking = bookings.find((candidate) => candidate.id === data.id);
  if (!booking) throw new Error('The booking was saved, but its confirmation could not be loaded. Refresh My Bookings.');
  return booking;
}

async function updateBookingStatus(bookingId: string, status: 'cancelled' | 'checked-in') {
  const client = await requireVkuSession();
  const { data, error } = await client
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .eq('status', 'confirmed')
    .select('id')
    .maybeSingle();

  if (error) {
    if (error.code === '42501') throw new Error('This booking no longer belongs to your active account.');
    throw new Error(error.message);
  }
  if (!data) throw new Error('This booking is no longer active. Refresh the booking list and try again.');
}

export const cancelBooking = (bookingId: string) => updateBookingStatus(bookingId, 'cancelled');
export const checkInBooking = (bookingId: string) => updateBookingStatus(bookingId, 'checked-in');
