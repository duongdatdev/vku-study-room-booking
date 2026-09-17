import { TimeSlot } from '../types';

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', startTime: '07:30', endTime: '09:30', label: '07:30 - 09:30' },
  { id: 'slot-2', startTime: '09:30', endTime: '11:30', label: '09:30 - 11:30' },
  { id: 'slot-3', startTime: '13:00', endTime: '15:00', label: '13:00 - 15:00' },
  { id: 'slot-4', startTime: '15:00', endTime: '17:00', label: '15:00 - 17:00' },
  { id: 'slot-5', startTime: '17:30', endTime: '19:30', label: '17:30 - 19:30' },
];

/**
 * Returns formatted 7 days starting from today:
 * e.g. [{ dateString: '2026-09-17', dayName: 'Today', dayNumber: '17', monthName: 'Sep' }, ...]
 */
export const getNext7Days = () => {
  const days = [];
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    days.push({
      dateString,
      dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayNames[d.getDay()]),
      dayNumber: String(d.getDate()),
      monthName: monthNames[d.getMonth()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  return days;
};
