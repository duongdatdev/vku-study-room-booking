import { TimeSlot } from '../types';

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', startTime: '07:30', endTime: '09:30', label: '07:30 - 09:30' },
  { id: 'slot-2', startTime: '09:30', endTime: '11:30', label: '09:30 - 11:30' },
  { id: 'slot-3', startTime: '13:00', endTime: '15:00', label: '13:00 - 15:00' },
  { id: 'slot-4', startTime: '15:00', endTime: '17:00', label: '15:00 - 17:00' },
  { id: 'slot-5', startTime: '17:30', endTime: '19:30', label: '17:30 - 19:30' },
];

export const CAMPUS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const CAMPUS_TIME_ZONE_OFFSET_MINUTES = 7 * 60;

export const getCurrentCampusSlot = (timestamp = Date.now()) => {
  const campusNow = new Date(timestamp + CAMPUS_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
  const hour = campusNow.getUTCHours();
  const minute = campusNow.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  const date = `${campusNow.getUTCFullYear()}-${String(campusNow.getUTCMonth() + 1).padStart(2, '0')}-${String(campusNow.getUTCDate()).padStart(2, '0')}`;
  const slot = TIME_SLOTS.find((candidate) => {
    const [startHour, startMinute] = candidate.startTime.split(':').map(Number);
    const [endHour, endMinute] = candidate.endTime.split(':').map(Number);
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return currentMinutes >= start && currentMinutes < end;
  });

  return { date, slotId: slot?.id ?? null };
};

/**
 * Returns formatted 7 days starting from today:
 * e.g. [{ dateString: '2026-09-17', dayName: 'Today', dayNumber: '17', monthName: 'Sep' }, ...]
 */
export const getNext7Days = () => {
  const days = [];
  const campusNow = new Date(Date.now() + CAMPUS_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
  const year = campusNow.getUTCFullYear();
  const month = campusNow.getUTCMonth() + 1;
  const day = campusNow.getUTCDate();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(Date.UTC(year, month - 1, day + i, 12));
    const dateYear = date.getUTCFullYear();
    const dateMonth = date.getUTCMonth();
    const dateDay = date.getUTCDate();
    const dateString = `${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(dateDay).padStart(2, '0')}`;

    days.push({
      dateString,
      dayName: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayNames[date.getUTCDay()]),
      dayNumber: String(dateDay),
      monthName: monthNames[dateMonth],
      isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
    });
  }

  return days;
};
