import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '../store/useBookingStore';
import { useNotifications } from '../hooks/useNotifications';

export const ProfileScreen: React.FC = () => {
  const user = useBookingStore((s) => s.user);
  const bookings = useBookingStore((s) => s.bookings);
  const seedInitialData = useBookingStore((s) => s.seedInitialData);
  const { triggerInstantNotification } = useNotifications();

  const totalBookings = bookings.length;
  const activeCount = bookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = bookings.filter((b) => b.status === 'checked-in').length;

  const handleTestNotification = async () => {
    await triggerInstantNotification(
      '🔔 VKU Room Booking Alert',
      'Test notification delivered! Your next room booking check-in will alert 15 minutes in advance.'
    );
    Alert.alert('Notification Triggered', 'A local test notification was sent to your system notification tray.');
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'Restore initial mock rooms, preset reservations, and test state?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Now',
          style: 'destructive',
          onPress: () => {
            seedInitialData();
            Alert.alert('Success', 'Demo reservations have been re-seeded.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>STUDENT PROFILE</Text>
          <Text style={styles.headerTitle}>Account & Settings</Text>
        </View>

        {/* VKU Student Card Badge */}
        <View style={styles.studentCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardUniName}>VIETNAM - KOREA UNIVERSITY</Text>
              <Text style={styles.cardDocType}>STUDENT IDENTIFICATION PASS</Text>
            </View>
            <View style={styles.vkuLogoWrap}>
              <Text style={styles.vkuLogoText}>VKU</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{user.name}</Text>
              <Text style={styles.studentId}>MSSV: {user.studentId}</Text>
              <Text style={styles.studentDept}>{user.department}</Text>
              <Text style={styles.studentEmail}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.chipText}>VKU SMART CAMPUS CARD</Text>
            <View style={styles.activeDotRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeStatusText}>VERIFIED</Text>
            </View>
          </View>
        </View>

        {/* Booking Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalBookings}</Text>
            <Text style={styles.statLabel}>Total Reserved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#2563EB' }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#16A34A' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>
        </View>

        {/* Actions & Utilities Section */}
        <Text style={styles.sectionHeading}>Campus Utilities</Text>

        <View style={styles.actionMenu}>
          {/* Notification Test */}
          <Pressable
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
            onPress={handleTestNotification}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="notifications-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Test 15-min Local Notification</Text>
              <Text style={styles.actionSubtitle}>Trigger instant local alert via expo-notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>

          {/* Reset Demo Data */}
          <Pressable
            style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
            onPress={handleResetData}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="refresh-outline" size={20} color="#EF4444" />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Reset & Seed Demo Reservations</Text>
              <Text style={styles.actionSubtitle}>Re-populate sample conflict slots for presentation</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Architecture Specs Card (From Slide 6, 7, 30) */}
        <Text style={styles.sectionHeading}>Under The Hood (Week 5 Architecture)</Text>
        <View style={styles.architectureCard}>
          <View style={styles.archRow}>
            <Ionicons name="hardware-chip-outline" size={16} color="#1E3A5F" />
            <Text style={styles.archKey}>Engine:</Text>
            <Text style={styles.archVal}>Hermes Bytecode + JSI (Zero-Copy)</Text>
          </View>
          <View style={styles.archRow}>
            <Ionicons name="layers-outline" size={16} color="#1E3A5F" />
            <Text style={styles.archKey}>Renderer:</Text>
            <Text style={styles.archVal}>Fabric UI (Synchronous Layout)</Text>
          </View>
          <View style={styles.archRow}>
            <Ionicons name="cube-outline" size={16} color="#1E3A5F" />
            <Text style={styles.archKey}>State:</Text>
            <Text style={styles.archVal}>Zustand + AsyncStorage Persistence</Text>
          </View>
          <View style={styles.archRow}>
            <Ionicons name="speedometer-outline" size={16} color="#1E3A5F" />
            <Text style={styles.archKey}>List Opt:</Text>
            <Text style={styles.archVal}>FlatList 60fps (windowSize=5, memoized)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
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
  studentCard: {
    backgroundColor: '#1E3A5F', // VKU Navy
    borderRadius: 18,
    padding: 16,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: 10,
    marginBottom: 14,
  },
  cardUniName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.8,
  },
  cardDocType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  vkuLogoWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vkuLogoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginRight: 14,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  studentId: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
    marginTop: 2,
  },
  studentDept: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  studentEmail: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 10,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  activeDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  activeStatusText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    marginTop: 4,
  },
  actionMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  architectureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  archRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  archKey: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A5F',
    width: 68,
    marginLeft: 6,
  },
  archVal: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
});
