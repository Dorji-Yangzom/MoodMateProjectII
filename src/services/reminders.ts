import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// One fixed identifier prevents multiple daily reminders accumulating.
const REMINDER_ID = 'moodmate-daily-check-in';
const CHANNEL_ID = 'moodmate-reminders';
const STORAGE_KEY = 'moodmate.reminder';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

// Start with reminders off and a suggested time of 8 PM.
const defaults: ReminderSettings = {
  enabled: false,
  hour: 20,
  minute: 0,
};

// Show reminders even while the app is open.
// This handler does not request notification permission.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Reject invalid times before calling the phone's notification system.
function validateTime(hour: number, minute: number) {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error('Please choose a valid reminder time.');
  }
}

// Android needs a notification channel before requesting permission.
async function prepareChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily mood reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

// Accept normal permission and iOS provisional permission.
function hasPermission(
  permission: Notifications.NotificationPermissionsStatus
): boolean {
  return (
    permission.granted ||
    permission.ios?.status ===
      Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

// Ask permission only when the user chooses to enable reminders.
async function requestPermission() {
  await prepareChannel();

  let permission = await Notifications.getPermissionsAsync();

  if (!hasPermission(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!hasPermission(permission)) {
    throw new Error(
      'Notifications are disabled. Allow them in your phone settings to enable reminders.'
    );
  }
}

// Read preferences without displaying a permission prompt.
export async function getReminderSettings(): Promise<ReminderSettings> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return { ...defaults };
  }

  let settings: ReminderSettings;

  try {
    const parsed = JSON.parse(stored);
    validateTime(parsed.hour, parsed.minute);

    settings = {
      enabled: parsed.enabled === true,
      hour: parsed.hour,
      minute: parsed.minute,
    };
  } catch {
    return { ...defaults }; // Recover from an invalid saved preference.
  }

  // Check that the reminder still exists and permission is still allowed.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const permission = await Notifications.getPermissionsAsync();
  const exists = scheduled.some(
    (notification) => notification.identifier === REMINDER_ID
  );

  return {
    ...settings,
    enabled: settings.enabled && exists && hasPermission(permission),
  };
}

// Enable the daily reminder or replace its previous scheduled time.
export async function enableDailyReminder(
  hour: number,
  minute: number
): Promise<ReminderSettings> {
  validateTime(hour, minute);
  await requestPermission();

  // Remove the previous reminder before scheduling the replacement.
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);

  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: 'A little moment for you 💜',
      body: 'How are you feeling? Make a little time for your mood journal.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });

  const settings: ReminderSettings = {
    enabled: true,
    hour,
    minute,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    // Avoid leaving an enabled reminder when saving its preference fails.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    throw error;
  }

  return settings;
}

// Turn off this reminder while keeping the selected time for later.
export async function disableDailyReminder(
  hour: number,
  minute: number
): Promise<ReminderSettings> {
  validateTime(hour, minute);

  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);

  const settings: ReminderSettings = {
    enabled: false,
    hour,
    minute,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  return settings;
}