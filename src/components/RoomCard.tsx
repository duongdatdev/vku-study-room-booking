import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';
import { Room } from '../types';
import { StatusBadge } from './StatusBadge';

interface RoomCardProps {
  room: Room;
  currentAvailability?: boolean | null;
  onPress: (room: Room) => void;
  index?: number;
  style?: StyleProp<ViewStyle>;
}

export const RoomCard: React.FC<RoomCardProps> = React.memo(({ room, currentAvailability = null, onPress, index = 0, style }) => {
  const getEquipmentIcon = (eq: string) => {
    switch (eq) {
      case 'Projector':
        return 'videocam-outline';
      case 'Whiteboard':
        return 'easel-outline';
      case 'High-spec PC':
        return 'desktop-outline';
      case 'AC':
        return 'snow-outline';
      default:
        return 'cube-outline';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 55, 330))
        .duration(260)
        .reduceMotion(ReduceMotion.System)}
      layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View available slots for ${room.name}`}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          style,
        ]}
        onPress={() => onPress(room)}
        hitSlop={8}
      >
        {/* Room Photo Banner */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: room.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={`Photo of ${room.name}`}
          />
          {/* Floating Building & Status Overlay */}
          <View style={styles.imageOverlayTop}>
            <View style={styles.buildingBadge}>
              <Text style={styles.buildingBadgeText}>Khu {room.building} • Tầng {room.floor}</Text>
            </View>
            <StatusBadge isAvailable={currentAvailability} />
          </View>
        </View>

        {/* Card Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.roomName} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.capacityBadge}>
              <Ionicons name="people" size={13} color="#FFFFFF" style={styles.capacityIcon} />
              <Text style={styles.capacityText}>{room.capacity} seats</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {room.description}
          </Text>

          {/* Equipment Badges */}
          <View style={styles.equipmentRow}>
            {room.equipment.map((item, idx) => (
              <View key={idx} style={styles.eqChip}>
                <Ionicons
                  name={getEquipmentIcon(item) as any}
                  size={12}
                  color="#475569"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.eqText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Footer Action Hint */}
          <View style={styles.footer}>
            <Text style={styles.footerActionText}>Check Available Slots</Text>
            <Ionicons name="arrow-forward-circle" size={18} color="#2563EB" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

RoomCard.displayName = 'RoomCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buildingBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  buildingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 8,
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F', // VKU Navy
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  capacityIcon: {
    marginRight: 4,
  },
  capacityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  equipmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  eqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eqText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
});
