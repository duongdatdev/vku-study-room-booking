import { create } from 'zustand';
import { Booking, BuildingCode, EquipmentType, FilterState, PublicOccupancy, StudentProfile } from '../types';

interface BookingStoreState {
  /** Server data held in memory only. It is refreshed from Supabase and never used to approve a booking. */
  bookings: Booking[];
  occupiedSlots: PublicOccupancy[];
  user: StudentProfile | null;
  availabilityState: 'checking' | 'ready' | 'unavailable';
  availabilityMessage: string | null;
  bookingsState: 'idle' | 'loading' | 'ready' | 'unavailable';
  bookingsMessage: string | null;
  filters: FilterState;

  setUser: (user: StudentProfile | null) => void;
  setBookings: (bookings: Booking[]) => void;
  setOccupiedSlots: (slots: PublicOccupancy[]) => void;
  setAvailability: (state: BookingStoreState['availabilityState'], message?: string | null) => void;
  setBookingsState: (state: BookingStoreState['bookingsState'], message?: string | null) => void;
  updateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  isSlotBooked: (roomId: string, date: string, slotId: string) => boolean;

  setSearchQuery: (query: string) => void;
  setSelectedBuilding: (building: 'ALL' | BuildingCode) => void;
  setMinCapacity: (minCapacity: number) => void;
  toggleEquipment: (eq: EquipmentType) => void;
  resetFilters: () => void;
}

const initialFilters: FilterState = {
  searchQuery: '',
  selectedBuilding: 'ALL',
  minCapacity: 0,
  selectedEquipment: [],
};

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  bookings: [],
  occupiedSlots: [],
  user: null,
  availabilityState: 'checking',
  availabilityMessage: null,
  bookingsState: 'idle',
  bookingsMessage: null,
  filters: initialFilters,

  setUser: (user) => set({ user }),
  setBookings: (bookings) => set({ bookings, bookingsState: 'ready', bookingsMessage: null }),
  setOccupiedSlots: (occupiedSlots) => set({ occupiedSlots }),
  setAvailability: (availabilityState, availabilityMessage = null) =>
    set({ availabilityState, availabilityMessage }),
  setBookingsState: (bookingsState, bookingsMessage = null) =>
    set({ bookingsState, bookingsMessage }),
  updateBookingStatus: (bookingId, status) =>
    set((state) => ({
      bookings: state.bookings.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking
      ),
    })),
  isSlotBooked: (roomId, date, slotId) =>
    get().occupiedSlots.some(
      (slot) => slot.roomId === roomId && slot.date === date && slot.slotId === slotId
    ),

  setSearchQuery: (query) => set((state) => ({ filters: { ...state.filters, searchQuery: query } })),
  setSelectedBuilding: (building) =>
    set((state) => ({ filters: { ...state.filters, selectedBuilding: building } })),
  setMinCapacity: (minCapacity) =>
    set((state) => ({ filters: { ...state.filters, minCapacity } })),
  toggleEquipment: (eq) =>
    set((state) => {
      const selectedEquipment = state.filters.selectedEquipment.includes(eq)
        ? state.filters.selectedEquipment.filter((item) => item !== eq)
        : [...state.filters.selectedEquipment, eq];
      return { filters: { ...state.filters, selectedEquipment } };
    }),
  resetFilters: () => set({ filters: initialFilters }),
}));
