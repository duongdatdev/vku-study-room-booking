import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  isAvailable: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ isAvailable }) => {
  return (
    <View style={[styles.badge, isAvailable ? styles.availableBadge : styles.occupiedBadge]}>
      <View style={[styles.dot, isAvailable ? styles.availableDot : styles.occupiedDot]} />
      <Text style={[styles.text, isAvailable ? styles.availableText : styles.occupiedText]}>
        {isAvailable ? 'Available Now' : 'Occupied'}
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
});
