import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Room } from '../types';
import { useBookingStore } from '../store/useBookingStore';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { RoomCard } from '../components/RoomCard';
import { SearchBar } from '../components/SearchBar';
import { FilterChips } from '../components/FilterChips';

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export const BrowseRoomsScreen: React.FC<Props> = ({ navigation }) => {
  const rooms = useBookingStore((s) => s.rooms);
  const filters = useBookingStore((s) => s.filters);
  const setSearchQuery = useBookingStore((s) => s.setSearchQuery);
  const setSelectedBuilding = useBookingStore((s) => s.setSelectedBuilding);
  const setMinCapacity = useBookingStore((s) => s.setMinCapacity);
  const toggleEquipment = useBookingStore((s) => s.toggleEquipment);
  const resetFilters = useBookingStore((s) => s.resetFilters);

  const { columns, cardWidth } = useResponsiveLayout();

  // Multi-parameter filtering engine
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Search query filter (matches name or description)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = room.name.toLowerCase().includes(query);
        const matchesDesc = room.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Building filter
      if (filters.selectedBuilding !== 'ALL' && room.building !== filters.selectedBuilding) {
        return false;
      }

      // Min capacity filter
      if (filters.minCapacity > 0 && room.capacity < filters.minCapacity) {
        return false;
      }

      // Equipment filter (all selected equipments must be present)
      if (filters.selectedEquipment.length > 0) {
        const hasAllEquipment = filters.selectedEquipment.every((eq) =>
          room.equipment.includes(eq)
        );
        if (!hasAllEquipment) return false;
      }

      return true;
    });
  }, [rooms, filters]);

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.selectedBuilding !== 'ALL' ||
    filters.minCapacity > 0 ||
    filters.selectedEquipment.length > 0;

  const handleRoomPress = (room: Room) => {
    navigation.navigate('RoomDetail', { roomId: room.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Campus Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandSubtitle}>VIETNAM - KOREA UNIVERSITY</Text>
          <Text style={styles.brandTitle}>Study Rooms & Labs</Text>
        </View>
        <View style={styles.statsBadge}>
          <Text style={styles.statsBadgeText}>
            {filteredRooms.length} / {rooms.length} Rooms
          </Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <SearchBar
          value={filters.searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* Multi-parameter Filter Chips */}
      <FilterChips
        selectedBuilding={filters.selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
        selectedEquipment={filters.selectedEquipment}
        onToggleEquipment={toggleEquipment}
        minCapacity={filters.minCapacity}
        onSelectMinCapacity={setMinCapacity}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* 60fps Optimized FlatList (Slide 17 & 27) */}
      <FlatList
        key={columns} // Force remount when layout/orientation changes columns
        data={filteredRooms}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.cardWrapper, { width: cardWidth }]}>
            <RoomCard room={item} onPress={handleRoomPress} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No Matching Rooms Found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your building, capacity, or equipment filter criteria.
            </Text>
          </View>
        }
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
    paddingBottom: 6,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E3A5F',
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statsBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  statsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardWrapper: {
    marginRight: 12,
    marginBottom: 12,
  },
  separator: {
    height: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
