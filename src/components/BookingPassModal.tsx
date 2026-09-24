import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { cancelBooking, checkInBooking } from '../services/bookings';
import { useBookingSync } from '../providers/BookingSyncProvider';
import { isSupabaseConfigured } from '../services/supabase';
import { useNetworkState } from 'expo-network';
import { cancelBookingReminder } from '../hooks/useNotifications';

interface BookingPassModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onBookingUpdated?: (booking: Booking) => void;
}

export const BookingPassModal: React.FC<BookingPassModalProps> = ({
  visible,
  booking,
  onClose,
  onBookingUpdated,
}) => {
  const updateBookingStatusInState = useBookingStore((s) => s.updateBookingStatus);
  const { refreshAvailability, refreshMyBookings } = useBookingSync();
  const networkState = useNetworkState();
  const canManageBooking = isSupabaseConfigured && networkState.isConnected !== false && networkState.isInternetReachable !== false;
  const [updatedStatus, setUpdatedStatus] = useState<Booking['status'] | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setUpdatedStatus(booking?.status ?? null);
    setActionError(null);
  }, [booking?.id, booking?.status]);

  if (!booking) return null;

  const currentBooking = updatedStatus ? { ...booking, status: updatedStatus } : booking;
  const isCheckedIn = currentBooking.status === 'checked-in';
  const isCancelled = currentBooking.status === 'cancelled';

  const handleCheckIn = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await checkInBooking(booking.id);
      const updated = { ...booking, status: 'checked-in' as const };
      setUpdatedStatus(updated.status);
      updateBookingStatusInState(updated.id, updated.status);
      onBookingUpdated?.(updated);
      void refreshMyBookings();
      void refreshAvailability();
      Alert.alert('Check-in recorded', `Your reservation at ${booking.roomName} is marked checked in.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not check in this reservation.');
    } finally {
      setWorking(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to release this study room slot so other students can reserve it?',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Release Slot',
          style: 'destructive',
          onPress: () => { void handleCancelConfirmed(); },
        },
      ]
    );
  };

  const handleCancelConfirmed = async () => {
    setWorking(true);
    setActionError(null);
    try {
      await cancelBooking(booking.id);
      await cancelBookingReminder(booking.id);
      const updated = { ...booking, status: 'cancelled' as const };
      setUpdatedStatus(updated.status);
      updateBookingStatusInState(updated.id, updated.status);
      onBookingUpdated?.(updated);
      void refreshMyBookings();
      void refreshAvailability();
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not cancel this reservation.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardContainer}>
          {/* Top Notch Header */}
          <View style={styles.passHeader}>
            <View>
              <Text style={styles.universityTitle}>VIETNAM - KOREA UNIVERSITY</Text>
              <Text style={styles.passTitle}>CAMPUS STUDY ROOM PASS</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeIcon}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Pill */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusTag,
                  isCheckedIn
                    ? styles.tagCheckedIn
                    : isCancelled
                    ? styles.tagCancelled
                    : styles.tagConfirmed,
                ]}
              >
                <Ionicons
                  name={
                    isCheckedIn
                      ? 'checkmark-done-circle'
                      : isCancelled
                      ? 'close-circle'
                      : 'time'
                  }
                  size={14}
                  color={
                    isCheckedIn ? '#16A34A' : isCancelled ? '#DC2626' : '#2563EB'
                  }
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.statusTagText,
                    isCheckedIn
                      ? { color: '#16A34A' }
                      : isCancelled
                      ? { color: '#DC2626' }
                      : { color: '#2563EB' },
                  ]}
                >
                  {isCheckedIn
                    ? 'CHECKED IN'
                    : isCancelled
                    ? 'CANCELLED'
                    : 'CONFIRMED & READY'}
                </Text>
              </View>
            </View>

            {/* Room Details Banner */}
            <View style={styles.roomSection}>
              <Text style={styles.roomName}>{currentBooking.roomName}</Text>
              <Text style={styles.buildingSubtext}>
                Khu {currentBooking.building} • Tầng {currentBooking.floor} • Sức chứa: {currentBooking.capacity} chỗ
              </Text>
            </View>

            {/* Ticket Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>DATE</Text>
                <Text style={styles.infoValue}>{currentBooking.date}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>TIME SLOT</Text>
                <Text style={styles.infoValue}>{currentBooking.timeRange}</Text>
              </View>
            </View>

            <View style={[styles.infoGrid, { marginTop: 12 }]}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>RESERVED FOR</Text>
                <Text style={styles.infoValue}>{currentBooking.userName}</Text>
                <Text style={styles.studentIdLabel}>Student ID: {currentBooking.userStudentId}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>PURPOSE</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {currentBooking.purpose || 'Academic Study'}
                </Text>
              </View>
            </View>

            {/* Perforated Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerCircleLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.dividerCircleRight} />
            </View>

            {/* A QR pass exists only for a server-confirmed active reservation. */}
            {!isCancelled ? (
              <View style={styles.qrSection}>
                <View style={styles.qrWrapper}>
                  <QRCode
                    value={currentBooking.qrCodeString || currentBooking.id}
                    size={160}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                  />
                </View>
                <Text style={styles.qrHint}>
                  Show this reservation reference to campus staff for check-in.
                </Text>
                <Text style={styles.bookingRef}>Ref: {currentBooking.id}</Text>
              </View>
            ) : (
              <Text style={styles.cancelledQrNotice}>This reservation was cancelled. Its QR pass is no longer valid.</Text>
            )}

            {!!actionError && <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text>}

            {/* These actions are committed by Supabase before the UI changes state. */}
            <View style={styles.actionsRow}>
              {!isCheckedIn && !isCancelled && (
                <Pressable
                  disabled={working || !canManageBooking}
                  style={({ pressed }) => [styles.checkInBtn, (working || !canManageBooking) && styles.actionDisabled, pressed && !working && canManageBooking && { opacity: 0.85 }]}
                  onPress={() => void handleCheckIn()}
                >
                  {working ? <ActivityIndicator color="#FFFFFF" /> : <>
                    <Ionicons name="scan" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.checkInBtnText}>Record Check-in</Text>
                  </>}
                </Pressable>
              )}

              {!isCancelled && !isCheckedIn && (
                <Pressable
                  disabled={working || !canManageBooking}
                  style={({ pressed }) => [styles.cancelBtn, (working || !canManageBooking) && styles.actionDisabled, pressed && !working && canManageBooking && { opacity: 0.7 }]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelBtnText}>Release / Cancel Booking</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    maxHeight: '90%',
  },
  passHeader: {
    backgroundColor: '#1E3A5F', // VKU Navy
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  universityTitle: {
    fontSize: 10,
    letterSpacing: 1,
    color: '#93C5FD',
    fontWeight: '700',
  },
  passTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  closeIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 16,
  },
  body: {
    padding: 18,
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagConfirmed: {
    backgroundColor: '#EFF6FF',
  },
  tagCheckedIn: {
    backgroundColor: '#DCFCE7',
  },
  tagCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roomSection: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  buildingSubtext: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  studentIdLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  dividerCircleLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    marginLeft: -28,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginHorizontal: 8,
  },
  dividerCircleRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    marginRight: -28,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  cancelledQrNotice: {
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 12,
  },
  actionError: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  qrHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  bookingRef: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  actionsRow: {
    marginTop: 16,
    gap: 8,
    marginBottom: 10,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
