import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { CAMPUS_TIME_ZONE_OFFSET_MINUTES } from '../data/timeSlots';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Foreground listener
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      // Received in foreground
    });

    // Interaction response listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // User tapped notification
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  /**
   * Schedule a local notification reminder 15 minutes before the booking starts
   */
  const scheduleBookingReminder = async (
    roomName: string,
    dateString: string,
    timeRange: string,
    bookingId: string
  ): Promise<string | null> => {
    try {
      if (!(await registerForPushNotificationsAsync())) return null;

      // Parse slot start time e.g. "07:30 - 09:30" => start at 07:30
      const [startTimeStr] = timeRange.split(' - ');
      const [hours, minutes] = startTimeStr.split(':').map(Number);
      const [year, month, day] = dateString.split('-').map(Number);

      const targetTimestamp =
        Date.UTC(year, month - 1, day, hours, minutes, 0) -
        CAMPUS_TIME_ZONE_OFFSET_MINUTES * 60 * 1000;
      // 15 minutes prior
      const reminderTimestamp = targetTimestamp - 15 * 60 * 1000;
      const secondsUntilTrigger = Math.floor((reminderTimestamp - Date.now()) / 1000);
      if (secondsUntilTrigger <= 0) return null;

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 VKU Room Booking Reminder',
          body: `Upcoming reservation at ${roomName} (${timeRange}) in 15 minutes. Tap to view your QR Check-In Pass!`,
          data: { bookingId, roomName, timeRange },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntilTrigger,
          channelId: 'booking-reminders',
        },
      });

      return identifier;
    } catch (error) {
      console.warn('Failed to schedule local notification:', error);
      return null;
    }
  };

  /**
   * Send an instant notification (useful for testing & demo on Expo Go)
   */
  const triggerInstantNotification = async (title: string, body: string): Promise<boolean> => {
    try {
      if (!(await registerForPushNotificationsAsync())) return false;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // trigger immediately
      });
      return true;
    } catch (err) {
      console.warn('Instant notification error:', err);
      return false;
    }
  };

  return {
    scheduleBookingReminder,
    triggerInstantNotification,
  };
}

/** Cancel any reminder for a booking after its server-side cancellation succeeds. */
export async function cancelBookingReminder(bookingId: string): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matching = scheduled.filter(
      (notification) => notification.content.data?.bookingId === bookingId
    );
    await Promise.all(
      matching.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
  } catch (error) {
    // A local notification failure must not undo a cancellation already committed by the server.
    console.warn('Failed to cancel local booking reminder:', error);
  }
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('booking-reminders', {
      name: 'Booking Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E3A5F',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}
