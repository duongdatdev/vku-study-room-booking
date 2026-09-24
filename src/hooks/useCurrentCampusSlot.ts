import { useEffect, useState } from 'react';
import { getCurrentCampusSlot } from '../data/timeSlots';

export function useCurrentCampusSlot() {
  const [current, setCurrent] = useState(getCurrentCampusSlot);

  useEffect(() => {
    const timer = setInterval(() => setCurrent(getCurrentCampusSlot()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return current;
}
