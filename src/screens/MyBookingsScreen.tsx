import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { Booking, RootStackParamList, TabParamList } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { BookingPassModal } from '../components/BookingPassModal';
import { useAuth } from '../providers/AuthProvider';
import { useBookingSync } from '../providers/BookingSyncProvider';
import { cancelBooking } from '../services/bookings';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkState } from 'expo-network';
import { cancelBookingReminder } from '../hooks/useNotifications';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'MyBookings'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const MyBookingsScreen: React.FC<Props> = ({ navigation }) => {
  const bookings = useBookingStore((s) => s.bookings);
  const bookingsState = useBookingStore((s) => s.bookingsState);
  const bookingsMessage = useBookingStore((s) => s.bookingsMessage);
  const updateBookingStatusInState = useBookingStore((s) => s.updateBookingStatus);
  const { session } = useAuth();
  const { refreshAvailability, refreshMyBookings } = useBookingSync();
  const networkState = useNetworkState();
  const networkAvailable = networkState.isConnected !== false && networkState.isInternetReachable !== false;
  const canManageBookings = isSupabaseConfigured && networkAvailable;

  // Filter tab: 'ALL' | 'ACTIVE' | 'HISTORY'
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'HISTORY'>('ALL');

  // Modal pass state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingOwnerId, setSelectedBookingOwnerId] = useState<string | null>(null);
  const [isPassModalVisible, setIsPassModalVisible] = useState(false);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedBooking(null);
    setSelectedBookingOwnerId(null);
    setIsPassModalVisible(false);
  }, [session?.user.id]);

  // Filter bookings belonging to current user or all reservations
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filterTab === 'ACTIVE') {
        return b.status === 'confirmed';
      }
      if (filterTab === 'HISTORY') {
        return b.status === 'checked-in' || b.status === 'cancelled';
      }
      return true;
    });
  }, [bookings, filterTab]);

  const handleOpenPass = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedBookingOwnerId(session?.user.id ?? null);
    setIsPassModalVisible(true);
  };

  const confirmCancel = async (booking: Booking) => {
    setPendingCancelId(booking.id);
    try {
      await cancelBooking(booking.id);
      await cancelBookingReminder(booking.id);
      updateBookingStatusInState(booking.id, 'cancelled');
      void refreshMyBookings();
      void refreshAvailability();
    } catch (error) {
      Alert.alert('Could not cancel booking', error instanceof Error ? error.message : 'Try again when you are online.');
      void refreshMyBookings();
    } finally {
      setPendingCancelId(null);
    }
  };

  const currentSelectedBooking = selectedBooking && selectedBookingOwnerId === session?.user.id
    ? bookings.find((booking) => booking.id === selectedBooking.id) ?? selectedBooking
    : null;

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel reservation for ${booking.roomName} (${booking.timeRange})?`,
      [
        { text: 'Keep Reservation', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => { void confirmCancel(booking); },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>MY RESERVATIONS</Text>
          <Text style={styles.headerTitle}>Booking Management</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{filteredBookings.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, filterTab === 'ALL' && styles.activeTabItem]}
          onPress={() => setFilterTab('ALL')}
        >
          <Text style={[styles.tabText, filterTab === 'ALL' && styles.activeTabText]}>
            All ({bookings.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, filterTab === 'ACTIVE' && styles.activeTabItem]}
          onPress={() => setFilterTab('ACTIVE')}
        >
          <Text style={[styles.tabText, filterTab === 'ACTIVE' && styles.activeTabText]}>
            Upcoming Active
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, filterTab === 'HISTORY' && styles.activeTabItem]}
          onPress={() => setFilterTab('HISTORY')}
        >
          <Text style={[styles.tabText, filterTab === 'HISTORY' && styles.activeTabText]}>
            History
          </Text>
        </Pressable>
      </View>

      {/* Bookings List */}
      <FlatList
        data={session ? filteredBookings : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={bookingsState === 'loading'}
        onRefresh={() => void refreshMyBookings()}
        ListHeaderComponent={session && !canManageBookings ? (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
            <Text style={styles.offlineNoticeText}>Reconnect to manage reservations.</Text>
          </View>
        ) : null}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const isConfirmed = item.status === 'confirmed';
          const isCheckedIn = item.status === 'checked-in';
          const isCancelled = item.status === 'cancelled';

          return (
            <View style={styles.bookingCard}>
              {/* Card Top */}
              <View style={styles.cardHeader}>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{item.roomName}</Text>
                  <Text style={styles.buildingInfo}>
                    Khu {item.building} • Tầng {item.floor}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isConfirmed && styles.statusConfirmed,
                    isCheckedIn && styles.statusCheckedIn,
                    isCancelled && styles.statusCancelled,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isConfirmed && { color: '#2563EB' },
                      isCheckedIn && { color: '#16A34A' },
                      isCancelled && { color: '#DC2626' },
                    ]}
                  >
                    {isConfirmed ? 'CONFIRMED' : isCheckedIn ? 'CHECKED-IN' : 'CANCELLED'}
                  </Text>
                </View>
              </View>

              {/* Schedule Info */}
              <View style={styles.timeSection}>
                <View style={styles.timeCol}>
                  <Ionicons name="calendar-outline" size={14} color="#64748B" />
                  <Text style={styles.timeText}>{item.date}</Text>
                </View>
                <View style={styles.timeCol}>
                  <Ionicons name="time-outline" size={14} color="#64748B" />
                  <Text style={styles.timeText}>{item.timeRange}</Text>
                </View>
              </View>

              <Text style={styles.purposeText} numberOfLines={1}>
                Purpose: <Text style={{ color: '#1E293B' }}>{item.purpose || 'Self Study'}</Text>
              </Text>

              {/* Action Buttons */}
              <View style={styles.cardFooter}>
                <Pressable
                  style={({ pressed }) => [
                    styles.qrPassBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => handleOpenPass(item)}
                >
                  <Ionicons name="qr-code" size={16} color="#1E3A5F" style={{ marginRight: 6 }} />
                  <Text style={styles.qrPassBtnText}>View QR Check-In Pass</Text>
                </Pressable>

                {isConfirmed && (
                  <Pressable
                    disabled={pendingCancelId === item.id || !canManageBookings}
                    style={({ pressed }) => [
                      styles.cancelIconBtn,
                      pendingCancelId === item.id && { opacity: 0.5 },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleCancel(item)}
                    hitSlop={8}
                  >
                    {pendingCancelId === item.id
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Ionicons name="trash-outline" size={18} color="#EF4444" />}
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            {bookingsState === 'loading' ? (
              <ActivityIndicator size="large" color="#1E3A5F" />
            ) : bookingsState === 'unavailable' && session ? (
              <>
                <Ionicons name="cloud-offline-outline" size={42} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Couldn’t load your bookings</Text>
                <Text style={styles.emptyText}>{bookingsMessage ?? 'Reconnect and try again.'}</Text>
                <Pressable style={styles.browseRoomsBtn} onPress={() => void refreshMyBookings()}>
                  <Text style={styles.browseRoomsBtnText}>Try again</Text>
                </Pressable>
              </>
            ) : !session ? (
              <>
                <Ionicons name="person-circle-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Sign in to see your bookings</Text>
                <Text style={styles.emptyText}>Your reservations follow your VKU email account across devices.</Text>
                <Pressable style={styles.browseRoomsBtn} onPress={() => navigation.navigate('SignIn')}>
                  <Text style={styles.browseRoomsBtnText}>Sign in with VKU email</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="calendar-clear-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Reservations Found</Text>
                <Text style={styles.emptyText}>
                  You have no bookings matching this tab. Head over to the Browse Rooms tab to book a room.
                </Text>
                <Pressable style={styles.browseRoomsBtn} onPress={() => navigation.navigate('BrowseRooms')}>
                  <Text style={styles.browseRoomsBtnText}>Browse Available Rooms</Text>
                </Pressable>
              </>
            )}
          </View>
        }
      />

      {/* QR Code Pass Modal */}
      <BookingPassModal
        visible={isPassModalVisible && selectedBookingOwnerId === session?.user.id}
        booking={currentSelectedBooking}
        onBookingUpdated={setSelectedBooking}
        onClose={() => setIsPassModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E3A5F',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#1E3A5F',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#1E3A5F',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#1E3A5F',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  roomInfo: {
    flex: 1,
    marginRight: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  buildingInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: '#EFF6FF',
  },
  statusCheckedIn: {
    backgroundColor: '#DCFCE7',
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 16,
    marginBottom: 8,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  purposeText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  qrPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrPassBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  cancelIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
  },
  offlineNoticeText: {
    flex: 1,
    color: '#78350F',
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  browseRoomsBtn: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  browseRoomsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
