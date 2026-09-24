import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  isAvailable: boolean | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isAvailable }) => {
  const statusStyle = isAvailable === null
    ? styles.unknownBadge
    : isAvailable
    ? styles.availableBadge
    : styles.occupiedBadge;
  const dotStyle = isAvailable === null
    ? styles.unknownDot
    : isAvailable
    ? styles.availableDot
    : styles.occupiedDot;
  const textStyle = isAvailable === null
    ? styles.unknownText
    : isAvailable
    ? styles.availableText
    : styles.occupiedText;

  return (
    <View style={[styles.badge, statusStyle]}>
      <View style={[styles.dot, dotStyle]} />
      <Text style={[styles.text, textStyle]}>
        {isAvailable === null ? 'Schedule Unknown' : isAvailable ? 'Available Now' : 'Occupied'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#DCFCE7', // emerald-100
  },
  occupiedBadge: {
    backgroundColor: '#FEE2E2', // rose-100
  },
  unknownBadge: {
    backgroundColor: '#E2E8F0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availableDot: {
    backgroundColor: '#16A34A',
  },
  occupiedDot: {
    backgroundColor: '#DC2626',
  },
  unknownDot: {
    backgroundColor: '#64748B',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  availableText: {
    color: '#15803D',
  },
  occupiedText: {
    color: '#B91C1C',
  },
  unknownText: {
    color: '#475569',
  },
});
