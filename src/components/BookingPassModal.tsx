import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../types';
import { useBookingStore } from '../store/useBookingStore';

interface BookingPassModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export const BookingPassModal: React.FC<BookingPassModalProps> = ({
  visible,
  booking,
  onClose,
}) => {
  const checkInBooking = useBookingStore((s) => s.checkInBooking);
  const cancelBooking = useBookingStore((s) => s.cancelBooking);

  if (!booking) return null;

  const isCheckedIn = booking.status === 'checked-in';
  const isCancelled = booking.status === 'cancelled';

  const handleCheckIn = () => {
    checkInBooking(booking.id);
    Alert.alert(
      '🎉 Check-In Successful',
      `Welcome to ${booking.roomName}! The electronic door lock has been unlocked for your slot.`
    );
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
          onPress: () => {
            cancelBooking(booking.id);
            onClose();
          },
        },
      ]
    );
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
              <Text style={styles.roomName}>{booking.roomName}</Text>
              <Text style={styles.buildingSubtext}>
                Khu {booking.building} • Tầng {booking.floor} • Sức chứa: {booking.capacity} chỗ
              </Text>
            </View>

            {/* Ticket Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>DATE</Text>
                <Text style={styles.infoValue}>{booking.date}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>TIME SLOT</Text>
                <Text style={styles.infoValue}>{booking.timeRange}</Text>
              </View>
            </View>

            <View style={[styles.infoGrid, { marginTop: 12 }]}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>RESERVED FOR</Text>
                <Text style={styles.infoValue}>{booking.userName}</Text>
                <Text style={styles.studentIdLabel}>ID: {booking.userStudentId}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>PURPOSE</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {booking.purpose || 'Academic Study'}
                </Text>
              </View>
            </View>

            {/* Perforated Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerCircleLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.dividerCircleRight} />
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={booking.qrCodeString || booking.id}
                  size={160}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.qrHint}>
                Scan at the room door tablet or security desk for access
              </Text>
              <Text style={styles.bookingRef}>Ref: {booking.id}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              {!isCheckedIn && !isCancelled && (
                <Pressable
                  style={({ pressed }) => [
                    styles.checkInBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleCheckIn}
                >
                  <Ionicons name="scan" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.checkInBtnText}>Check In at Door</Text>
                </Pressable>
              )}

              {!isCancelled && !isCheckedIn && (
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: 0.7 },
                  ]}
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
