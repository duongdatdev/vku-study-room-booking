import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
    // Request permission on mount
    registerForPushNotificationsAsync();

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
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          return null;
        }
      }

      // Parse slot start time e.g. "07:30 - 09:30" => start at 07:30
      const [startTimeStr] = timeRange.split(' - ');
      const [hours, minutes] = startTimeStr.split(':').map(Number);
      const [year, month, day] = dateString.split('-').map(Number);

      const targetDate = new Date(year, month - 1, day, hours, minutes, 0);
      // 15 minutes prior
      const reminderTime = new Date(targetDate.getTime() - 15 * 60 * 1000);
      const now = new Date();

      let secondsUntilTrigger = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);

      // If slot is within the next 15 minutes or in the past, schedule for 10 seconds ahead for immediate demo feedback
      if (secondsUntilTrigger <= 0) {
        secondsUntilTrigger = 5;
      }

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
  const triggerInstantNotification = async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // trigger immediately
      });
    } catch (err) {
      console.warn('Instant notification error:', err);
    }
  };

  return {
    scheduleBookingReminder,
    triggerInstantNotification,
  };
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
