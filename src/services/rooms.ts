import { MOCK_ROOMS } from '../data/mockRooms';
import { Room } from '../types';

/**
 * Temporary API boundary for the classroom mock dataset.
 * Replacing this with a real endpoint later does not require screen changes.
 */
export function fetchRooms(signal?: AbortSignal): Promise<Room[]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => resolve(MOCK_ROOMS), 350);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timeoutId);
        reject(new Error('Room request was cancelled.'));
      },
      { once: true }
    );
  });
}
