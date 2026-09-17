import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking, BuildingCode, EquipmentType, FilterState, Room, StudentProfile } from '../types';
import { MOCK_ROOMS } from '../data/mockRooms';
import { TIME_SLOTS, getNext7Days } from '../data/timeSlots';

interface BookingStoreState {
  // Data
  rooms: Room[];
  bookings: Booking[];
  user: StudentProfile;
  filters: FilterState;

  // Filter Actions
  setSearchQuery: (query: string) => void;
  setSelectedBuilding: (building: 'ALL' | BuildingCode) => void;
  setMinCapacity: (minCapacity: number) => void;
  toggleEquipment: (eq: EquipmentType) => void;
  resetFilters: () => void;

  // Booking & Conflict Actions
  isSlotBooked: (roomId: string, date: string, slotId: string) => boolean;
  bookRoom: (params: {
    roomId: string;
    roomName: string;
    building: BuildingCode;
    floor: number;
    capacity: number;
    date: string;
    slotId: string;
    timeRange: string;
    purpose: string;
  }) => { success: boolean; error?: string; booking?: Booking };
  cancelBooking: (bookingId: string) => void;
  checkInBooking: (bookingId: string) => void;
  updateUserProfile: (profile: Partial<StudentProfile>) => void;
  seedInitialData: () => void;
}

const defaultUser: StudentProfile = {
  studentId: '23IT046',
  name: 'Dương Bảo Đạt',
  email: 'datdb.23it@vku.udn.vn',
  department: 'Khoa Khoa học Máy tính (VKU)',
  cohort: 'Khóa 2023 - 2028 (K23)',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
};

const initialFilters: FilterState = {
  searchQuery: '',
  selectedBuilding: 'ALL',
  minCapacity: 0,
  selectedEquipment: [],
};

// Seed initial reservations so conflict engine is demonstrable immediately
const createDefaultBookings = (): Booking[] => {
  const days = getNext7Days();
  const today = days[0].dateString;
  const tomorrow = days[1].dateString;

  return [
    {
      id: 'book-preset-1',
      roomId: 'room-1',
      roomName: 'Lab Vi Mạch Bán Dẫn (K.A301)',
      building: 'KA',
      floor: 3,
      capacity: 32,
      date: today,
      slotId: 'slot-1',
      timeRange: '07:30 - 09:30',
      userStudentId: '23IT001',
      userName: 'CLB Nghiên cứu Bán Dẫn VKU',
      purpose: 'Thực hành mô phỏng Synopsys EDA',
      qrCodeString: 'VKU-RES-KA301-SLOT1-TODAY',
      status: 'confirmed',
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
    },
    {
      id: 'book-preset-2',
      roomId: 'room-1',
      roomName: 'Lab Vi Mạch Bán Dẫn (K.A301)',
      building: 'KA',
      floor: 3,
      capacity: 32,
      date: today,
      slotId: 'slot-3',
      timeRange: '13:00 - 15:00',
      userStudentId: '23IT046',
      userName: 'Dương Bảo Đạt',
      purpose: 'Đồ án Lập trình Di động & Thiết kế IC',
      qrCodeString: 'VKU-RES-KA301-SLOT3-TODAY-DAT',
      status: 'confirmed',
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 'book-preset-3',
      roomId: 'room-2',
      roomName: 'Smart Lab AI & IoT (V.A204)',
      building: 'VA',
      floor: 2,
      capacity: 28,
      date: tomorrow,
      slotId: 'slot-2',
      timeRange: '09:30 - 11:30',
      userStudentId: '23IT046',
      userName: 'Dương Bảo Đạt',
      purpose: 'Thử nghiệm mạng cảm biến không dây & ESP32',
      qrCodeString: 'VKU-RES-VA204-SLOT2-TOMORROW-DAT',
      status: 'confirmed',
      createdAt: Date.now() - 1000 * 60 * 15,
    },
  ];
};

export const useBookingStore = create<BookingStoreState>()(
  persist(
    (set, get) => ({
      rooms: MOCK_ROOMS,
      bookings: createDefaultBookings(),
      user: defaultUser,
      filters: initialFilters,

      setSearchQuery: (query: string) => {
        set((state) => ({
          filters: { ...state.filters, searchQuery: query },
        }));
      },

      setSelectedBuilding: (building: 'ALL' | BuildingCode) => {
        set((state) => ({
          filters: { ...state.filters, selectedBuilding: building },
        }));
      },

      setMinCapacity: (minCapacity: number) => {
        set((state) => ({
          filters: { ...state.filters, minCapacity },
        }));
      },

      toggleEquipment: (eq: EquipmentType) => {
        set((state) => {
          const current = state.filters.selectedEquipment;
          const exists = current.includes(eq);
          return {
            filters: {
              ...state.filters,
              selectedEquipment: exists
                ? current.filter((item) => item !== eq)
                : [...current, eq],
            },
          };
        });
      },

      resetFilters: () => {
        set({ filters: initialFilters });
      },

      isSlotBooked: (roomId: string, date: string, slotId: string): boolean => {
        const { bookings } = get();
        return bookings.some(
          (b) =>
            b.roomId === roomId &&
            b.date === date &&
            b.slotId === slotId &&
            b.status !== 'cancelled'
        );
      },

      bookRoom: ({
        roomId,
        roomName,
        building,
        floor,
        capacity,
        date,
        slotId,
        timeRange,
        purpose,
      }) => {
        const state = get();
        const conflict = state.isSlotBooked(roomId, date, slotId);

        if (conflict) {
          return {
            success: false,
            error: 'Xung đột lịch! Khung giờ này vừa có người khác đặt trước.',
          };
        }

        const newBookingId = `vku-bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const qrCodeString = JSON.stringify({
          bookingId: newBookingId,
          roomId,
          roomName,
          date,
          timeRange,
          studentId: state.user.studentId,
          code: `VKU-${roomId.toUpperCase()}-${slotId}-${date}`,
        });

        const newBooking: Booking = {
          id: newBookingId,
          roomId,
          roomName,
          building,
          floor,
          capacity,
          date,
          slotId,
          timeRange,
          userStudentId: state.user.studentId,
          userName: state.user.name,
          purpose: purpose.trim() || 'Học tập nhóm',
          qrCodeString,
          status: 'confirmed',
          createdAt: Date.now(),
        };

        set((s) => ({
          bookings: [newBooking, ...s.bookings],
        }));

        return {
          success: true,
          booking: newBooking,
        };
      },

      cancelBooking: (bookingId: string) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
          ),
        }));
      },

      checkInBooking: (bookingId: string) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'checked-in' as const } : b
          ),
        }));
      },

      updateUserProfile: (profile: Partial<StudentProfile>) => {
        set((state) => ({
          user: { ...state.user, ...profile },
        }));
      },

      seedInitialData: () => {
        set({
          rooms: MOCK_ROOMS,
          bookings: createDefaultBookings(),
          filters: initialFilters,
          user: defaultUser,
        });
      },
    }),
    {
      name: 'vku-booking-storage-v4', // bumped version to update persisted cache
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        bookings: state.bookings,
        user: state.user,
      }),
    }
  )
);
