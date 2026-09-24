import { MOCK_ROOMS } from '../data/mockRooms';
import { Room } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Fetch rooms from Supabase when configured, with local sample data for setup/offline use.
 */
export async function fetchRooms(signal?: AbortSignal): Promise<Room[]> {
  if (signal?.aborted) throw new Error('Room request was cancelled.');
  if (!isSupabaseConfigured || !supabase) return MOCK_ROOMS;

  let request = supabase
    .from('rooms')
    .select('id, name, building, floor, capacity, equipment, image_url, description, is_available_now')
    .order('name');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;

  if (signal?.aborted) throw new Error('Room request was cancelled.');
  if (error?.code === 'PGRST205') return MOCK_ROOMS;
  if (error) throw new Error(`Không tải được danh sách phòng từ Supabase: ${error.message}`);
  if (!data?.length) return MOCK_ROOMS;

  return data.map((room) => ({
    id: room.id,
    name: room.name,
    building: room.building as Room['building'],
    floor: room.floor,
    capacity: room.capacity,
    equipment: room.equipment as Room['equipment'],
    imageUrl: room.image_url ?? '',
    description: room.description ?? '',
    isAvailableNow: room.is_available_now,
  }));
}
