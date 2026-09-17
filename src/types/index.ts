export type BuildingCode = 'KA' | 'KB' | 'KC' | 'VA';

export type EquipmentType = 'Projector' | 'Whiteboard' | 'High-spec PC' | 'AC';

export interface Room {
  id: string;
  name: string;
  building: BuildingCode;
  floor: number;
  capacity: number;
  equipment: EquipmentType[];
  imageUrl: string;
  description: string;
  isAvailableNow: boolean;
}

export interface TimeSlot {
  id: string;
  startTime: string; // e.g. "07:30"
  endTime: string;   // e.g. "09:30"
  label: string;     // e.g. "07:30 - 09:30"
}

export type BookingStatus = 'confirmed' | 'checked-in' | 'cancelled';

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  building: BuildingCode;
  floor: number;
  capacity: number;
  date: string;       // YYYY-MM-DD
  slotId: string;
  timeRange: string;  // e.g. "07:30 - 09:30"
  userStudentId: string;
  userName: string;
  purpose: string;
  qrCodeString: string;
  status: BookingStatus;
  createdAt: number;
  notificationId?: string;
}

export interface FilterState {
  searchQuery: string;
  selectedBuilding: 'ALL' | BuildingCode;
  minCapacity: number;
  selectedEquipment: EquipmentType[];
}

export interface StudentProfile {
  studentId: string;
  name: string;
  email: string;
  department: string;
  cohort: string;
  avatarUrl: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  RoomDetail: { roomId: string };
};

export type TabParamList = {
  BrowseRooms: undefined;
  MyBookings: undefined;
  Profile: undefined;
};
