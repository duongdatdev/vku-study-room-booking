import { useQuery } from '@tanstack/react-query';
import { fetchRooms } from '../services/rooms';

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: ({ signal }) => fetchRooms(signal),
  });
}
