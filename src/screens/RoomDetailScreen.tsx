import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Booking, TimeSlot } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import { BookingPassModal } from '../components/BookingPassModal';
import { StatusBadge } from '../components/StatusBadge';
import { useNotifications } from '../hooks/useNotifications';
import { getNext7Days } from '../data/timeSlots';
import { useRooms } from '../hooks/useRooms';
import { useCurrentCampusSlot } from '../hooks/useCurrentCampusSlot';
import { useAuth } from '../providers/AuthProvider';
import { useBookingSync } from '../providers/BookingSyncProvider';
import { createBooking } from '../services/bookings';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkState } from 'expo-network';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomDetail'>;

export const RoomDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { data: rooms = [], isLoading, isError, refetch } = useRooms();
  const room = rooms.find((r) => r.id === roomId);
  const isSlotBooked = useBookingStore((s) => s.isSlotBooked);
  const user = useBookingStore((s) => s.user);
  const availabilityState = useBookingStore((s) => s.availabilityState);
  const availabilityMessage = useBookingStore((s) => s.availabilityMessage);
  const { session } = useAuth();
  const { refreshAvailability, refreshMyBookings } = useBookingSync();
  const networkState = useNetworkState();
  const networkAvailable = networkState.isConnected !== false && networkState.isInternetReachable !== false;
  const currentCampusSlot = useCurrentCampusSlot();
  const { scheduleBookingReminder } = useNotifications();

  // Booking form state
  const defaultDate = getNext7Days()[0].dateString;
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [purpose, setPurpose] = useState<string>('');

  // Post-booking QR modal pass state
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [passModalVisible, setPassModalVisible] = useState<boolean>(false);
  const [bookingBusy, setBookingBusy] = useState(false);

  const canReachBookingServer = isSupabaseConfigured && networkAvailable && availabilityState === 'ready';
  const currentAvailability = !canReachBookingServer
    ? null
    : currentCampusSlot.slotId
    ? !isSlotBooked(roomId, currentCampusSlot.date, currentCampusSlot.slotId)
    : null;

  useEffect(() => {
    if (selectedSlot && isSlotBooked(roomId, selectedDate, selectedSlot.id)) {
      setSelectedSlot(null);
    }
  }, [isSlotBooked, roomId, selectedDate, selectedSlot]);

  if (isLoading) {
    return <View style={styles.notFound}><ActivityIndicator size="large" color="#1E3A5F" /></View>;
  }

  if (isError) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Couldn’t load this room.</Text>
        <Pressable onPress={() => void refetch()}><Text style={styles.retryText}>Try again</Text></Pressable>
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Room not found</Text>
      </View>
    );
  }

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    // If current selected slot is booked on the new date, reset it
    if (selectedSlot && isSlotBooked(room.id, newDate, selectedSlot.id)) {
      setSelectedSlot(null);
    }
  };

  const handleConfirmReservation = async () => {
    if (!session) {
      navigation.navigate('SignIn');
      return;
    }
    if (!canReachBookingServer) {
      Alert.alert('Booking unavailable', availabilityMessage ?? 'Reconnect to the internet to check the shared schedule.');
      return;
    }
    if (!selectedSlot) {
      Alert.alert('Selection Required', 'Please select an available 2-hour time slot.');
      return;
    }

    setBookingBusy(true);
    try {
      const booking = await createBooking({
        roomId: room.id,
        date: selectedDate,
        slotId: selectedSlot.id,
        purpose,
      });

      // Only show a pass after the insert and the RLS-protected server read both succeed.
      setConfirmedBooking(booking);
      setPassModalVisible(true);
      void scheduleBookingReminder(room.name, selectedDate, selectedSlot.label, booking.id);
      void refreshAvailability();
      void refreshMyBookings();
    } catch (error) {
      Alert.alert('Reservation failed', error instanceof Error ? error.message : 'Could not save this booking.');
      void refreshAvailability();
    } finally {
      setBookingBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Image */}
        <View style={styles.imageHeader}>
          <Image source={{ uri: room.imageUrl }} style={styles.image} resizeMode="cover" />
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Room Header Info */}
        <View style={styles.mainInfo}>
          <View style={styles.tagRow}>
            <View style={styles.buildingTag}>
              <Text style={styles.buildingTagText}>
                Khu {room.building} • Tầng {room.floor}
              </Text>
            </View>
            <StatusBadge isAvailable={currentAvailability} />
          </View>

          <Text style={styles.roomName}>{room.name}</Text>

          <View style={styles.capacityRow}>
            <Ionicons name="people-outline" size={16} color="#1E3A5F" style={{ marginRight: 6 }} />
            <Text style={styles.capacityText}>Capacity: {room.capacity} seats max</Text>
          </View>

          <Text style={styles.description}>{room.description}</Text>

          {availabilityState !== 'ready' || !networkAvailable ? (
            <View style={styles.scheduleNotice}>
              <Ionicons name="cloud-offline-outline" size={18} color="#92400E" />
              <Text style={styles.scheduleNoticeText}>
                {!isSupabaseConfigured
                  ? 'Connect Supabase to view the shared schedule and book online.'
                  : !networkAvailable
                  ? 'You are offline. Reconnect to check availability before booking.'
                  : availabilityMessage ?? 'Checking the shared room schedule…'}
              </Text>
              {isSupabaseConfigured && networkAvailable && (
                <Pressable onPress={() => void refreshAvailability()} accessibilityRole="button">
                  <Text style={styles.retryText}>Refresh</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {/* Amenities & Equipment */}
          <Text style={styles.sectionHeader}>Included Equipment & Amenities</Text>
          <View style={styles.equipmentGrid}>
            {room.equipment.map((eq, idx) => (
              <View key={idx} style={styles.equipmentItem}>
                <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.equipmentLabel}>{eq}</Text>
              </View>
            ))}
          </View>

          {/* Time Slot Picker & Shared Schedule */}
          <View style={styles.pickerSection}>
            <TimeSlotPicker
              selectedDate={selectedDate}
              onSelectDate={handleDateChange}
              selectedSlotId={selectedSlot ? selectedSlot.id : null}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              isSlotBooked={(slotId) => isSlotBooked(room.id, selectedDate, slotId)}
            />
          </View>

          {/* Reservation Purpose */}
          <View style={styles.purposeSection}>
            <Text style={styles.sectionHeader}>3. Study Purpose (Optional)</Text>
            <TextInput
              style={styles.purposeInput}
              value={purpose}
              onChangeText={(value) => setPurpose(value.slice(0, 300))}
              placeholder="e.g. Capstone Project meeting, Midterm review..."
              placeholderTextColor="#94A3B8"
              maxLength={300}
            />
          </View>

          {/* Student ID Reminder */}
          <View style={styles.studentCardHint}>
            <Ionicons name="school-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.studentCardHintText}>
              {session && user
                ? <>Booking under: <Text style={{ fontWeight: '700' }}>{user.email}</Text></>
                : 'Sign in with a VKU email address before booking.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomSlotSummary}>
          <Text style={styles.bottomSlotDate}>
            {selectedDate}
          </Text>
          <Text style={styles.bottomSlotTime}>
            {selectedSlot ? selectedSlot.label : 'Select a time slot'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.bookButton,
            (!selectedSlot || bookingBusy || !canReachBookingServer) && styles.bookButtonDisabled,
            pressed && selectedSlot && canReachBookingServer && { opacity: 0.85 },
          ]}
          disabled={bookingBusy || !canReachBookingServer || (Boolean(session) && !selectedSlot)}
          onPress={handleConfirmReservation}
        >
          {bookingBusy ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Text style={styles.bookButtonText}>{session ? 'Confirm Booking' : 'Sign in to book'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </>
          )}
        </Pressable>
      </View>

      {/* Interactive QR Check-in Pass Modal */}
      <BookingPassModal
        visible={passModalVisible}
        booking={confirmedBooking}
        onBookingUpdated={(updated) => setConfirmedBooking(updated)}
        onClose={() => {
          setPassModalVisible(false);
          navigation.navigate('MainTabs');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageHeader: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainInfo: {
    padding: 18,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buildingTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buildingTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  roomName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 13,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  equipmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  pickerSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  purposeSection: {
    marginTop: 8,
    marginBottom: 14,
  },
  purposeInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  scheduleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  scheduleNoticeText: {
    flex: 1,
    color: '#78350F',
    fontSize: 12,
    lineHeight: 17,
  },
  retryText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
    padding: 6,
  },
  studentCardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
  },
  studentCardHintText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomSlotSummary: {
    flex: 1,
  },
  bottomSlotDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  bottomSlotTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F', // VKU Navy
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
  },
});
