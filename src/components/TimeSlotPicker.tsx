import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TIME_SLOTS, getNext7Days } from '../data/timeSlots';
import { TimeSlot } from '../types';

interface TimeSlotPickerProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isSlotBooked: (slotId: string) => boolean;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  onSelectDate,
  selectedSlotId,
  onSelectSlot,
  isSlotBooked,
}) => {
  const next7Days = getNext7Days();

  return (
    <View style={styles.container}>
      {/* Section 1: 7-Day Date Selector Strip */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>1. Select Booking Date</Text>
        <Text style={styles.subtext}>Next 7 days schedule</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysScroll}
      >
        {next7Days.map((day) => {
          const isSelected = selectedDate === day.dateString;
          return (
            <Pressable
              key={day.dateString}
              style={({ pressed }) => [
                styles.dayCard,
                isSelected && styles.selectedDayCard,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => onSelectDate(day.dateString)}
              hitSlop={6}
            >
              <Text style={[styles.dayName, isSelected && styles.selectedDayText]}>
                {day.dayName}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.selectedDayText]}>
                {day.dayNumber}
              </Text>
              <Text style={[styles.monthName, isSelected && styles.selectedDayText]}>
                {day.monthName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Section 2: 2-Hour Discrete Time Slots Grid */}
      <View style={[styles.headerRow, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>2. Select 2-Hour Time Slot</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Available</Text>
          <View style={[styles.legendDot, { backgroundColor: '#94A3B8', marginLeft: 8 }]} />
          <Text style={styles.legendText}>Booked</Text>
        </View>
      </View>

      <View style={styles.slotsGrid}>
        {TIME_SLOTS.map((slot) => {
          const booked = isSlotBooked(slot.id);
          const isSelected = selectedSlotId === slot.id;

          return (
            <Pressable
              key={slot.id}
              disabled={booked}
              style={({ pressed }) => [
                styles.slotButton,
                booked && styles.slotBooked,
                isSelected && styles.slotSelected,
                pressed && !booked && { opacity: 0.85 },
              ]}
              onPress={() => onSelectSlot(slot)}
              hitSlop={6}
            >
              <View style={styles.slotContent}>
                <Ionicons
                  name={
                    booked
                      ? 'lock-closed'
                      : isSelected
                      ? 'checkmark-circle'
                      : 'time-outline'
                  }
                  size={16}
                  color={
                    booked
                      ? '#94A3B8'
                      : isSelected
                      ? '#FFFFFF'
                      : '#2563EB'
                  }
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.slotLabel,
                    booked && styles.slotLabelBooked,
                    isSelected && styles.slotLabelSelected,
                  ]}
                >
                  {slot.label}
                </Text>
              </View>

              {booked && (
                <View style={styles.conflictBadge}>
                  <Text style={styles.conflictBadgeText}>Occupied</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
  },
  daysScroll: {
    paddingVertical: 4,
    gap: 8,
  },
  dayCard: {
    width: 66,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCard: {
    backgroundColor: '#1E3A5F', // VKU Navy
    borderColor: '#1E3A5F',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  dayName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  monthName: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },
  slotsGrid: {
    gap: 8,
  },
  slotButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  slotBooked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.75,
  },
  slotSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  slotContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  slotLabelBooked: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  slotLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  conflictBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conflictBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
});
