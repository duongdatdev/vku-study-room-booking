import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BuildingCode, EquipmentType } from '../types';

interface FilterChipsProps {
  selectedBuilding: 'ALL' | BuildingCode;
  onSelectBuilding: (building: 'ALL' | BuildingCode) => void;
  selectedEquipment: EquipmentType[];
  onToggleEquipment: (eq: EquipmentType) => void;
  minCapacity: number;
  onSelectMinCapacity: (capacity: number) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const BUILDINGS: Array<{ label: string; value: 'ALL' | BuildingCode }> = [
  { label: 'Tất cả khu', value: 'ALL' },
  { label: 'Khu KA', value: 'KA' },
  { label: 'Khu KB', value: 'KB' },
  { label: 'Khu KC', value: 'KC' },
  { label: 'Khu VA', value: 'VA' },
];

const CAPACITIES = [
  { label: 'Any Size', value: 0 },
  { label: 'Small (2-8)', value: 2 },
  { label: 'Medium (10-20)', value: 10 },
  { label: 'Large (25+)', value: 25 },
];

const EQUIPMENTS: EquipmentType[] = ['High-spec PC', 'Projector', 'Whiteboard', 'AC'];

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedBuilding,
  onSelectBuilding,
  selectedEquipment,
  onToggleEquipment,
  minCapacity,
  onSelectMinCapacity,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <View style={styles.container}>
      {/* Building Filter Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {BUILDINGS.map((b) => {
          const isSelected = selectedBuilding === b.value;
          return (
            <Pressable
              key={b.value}
              style={({ pressed }) => [
                styles.chip,
                isSelected && styles.activeChip,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => onSelectBuilding(b.value)}
              hitSlop={6}
            >
              <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                {b.label}
              </Text>
            </Pressable>
          );
        })}

        {hasActiveFilters && (
          <Pressable
            style={({ pressed }) => [styles.resetChip, pressed && { opacity: 0.7 }]}
            onPress={onReset}
            hitSlop={6}
          >
            <Ionicons name="refresh" size={12} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={styles.resetChipText}>Reset</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Equipment Quick Filter Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 6 }]}
      >
        {EQUIPMENTS.map((eq) => {
          const isSelected = selectedEquipment.includes(eq);
          return (
            <Pressable
              key={eq}
              style={({ pressed }) => [
                styles.eqChip,
                isSelected && styles.activeEqChip,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => onToggleEquipment(eq)}
              hitSlop={6}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={13}
                color={isSelected ? '#2563EB' : '#64748B'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.eqChipText, isSelected && styles.activeEqChipText]}>
                {eq}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeChip: {
    backgroundColor: '#1E3A5F', // VKU Navy
    borderColor: '#1E3A5F',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  resetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
  },
  resetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  eqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  activeEqChip: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  eqChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  activeEqChipText: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
