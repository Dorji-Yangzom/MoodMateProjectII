import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  disableDailyReminder,
  enableDailyReminder,
  getReminderSettings,
} from '../services/reminders';
import type { ReminderSettings } from '../services/reminders';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  disabled?: boolean; // Wait while Profile is saving the user's name.
  onBusyChange: (busy: boolean) => void; // Block Back during reminder changes.
};

export default function ReminderSettingsCard({
  disabled = false,
  onBusyChange,
}: Props) {
  const { isDark, colours } = useTheme();

  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    hour: 20,
    minute: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [draftTime, setDraftTime] = useState(new Date());

  // Block repeated taps before React updates the button states.
  const changing = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError('');

      try {
        const saved = await getReminderSettings();

        if (active) {
          setSettings(saved);
        }
      } catch {
        console.warn('[Reminder] Could not load settings');

        if (active) {
          setError('Could not load reminder settings.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false; // Ignore results after leaving Profile.
    };
  }, [retryCount]);

  async function applySettings(
    enabled: boolean,
    hour: number,
    minute: number
  ) {
    if (changing.current || disabled) return;

    changing.current = true;
    setBusy(true);
    onBusyChange(true);

    try {
      const saved = enabled
        ? await enableDailyReminder(hour, minute)
        : await disableDailyReminder(hour, minute);

      setSettings(saved); // Update the switch only after success.
    } catch (failure) {
      console.warn('[Reminder] Could not update reminder');

      Alert.alert(
        'Could not update reminder',
        failure instanceof Error
          ? failure.message
          : 'Please try again.'
      );

      // A failed replacement may have removed the previous schedule.
      // Read the actual state so the switch does not incorrectly stay on.
      try {
        setSettings(await getReminderSettings());
      } catch {
        setError('Could not check reminder settings. Please try again.');
      }
    } finally {
      changing.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  function openTimePicker() {
    if (changing.current || disabled) return;

    const date = new Date();
    date.setHours(settings.hour, settings.minute, 0, 0);
    setDraftTime(date);
    setShowPicker(true);
  }

  function handleTimeChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (Platform.OS === 'android') {
      setShowPicker(false); // Android closes its dialog after selection.

      if (event.type === 'set' && selectedDate) {
        void applySettings(
          settings.enabled,
          selectedDate.getHours(),
          selectedDate.getMinutes()
        );
      }

      return;
    }

    // On iOS, let the user adjust the time before tapping Save time.
    if (selectedDate) {
      setDraftTime(selectedDate);
    }
  }

  // Format the chosen time using the phone's preferred time format.
  const time = new Date();
  time.setHours(settings.hour, settings.minute, 0, 0);
  const timeLabel = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const controlsDisabled = disabled || busy || loading || !!error;

  return (
    <View
      style={{
        backgroundColor: colours.surface,
        borderColor: colours.border,
        borderWidth: 1,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: colours.text,
            }}
          >
            Daily reminder
          </Text>

          <Text
            style={{
              fontSize: 13,
              lineHeight: 20,
              color: colours.muted,
              marginTop: 6,
            }}
          >
            A gentle reminder to check in with yourself.
          </Text>
        </View>

        <Switch
          value={settings.enabled}
          disabled={controlsDisabled || showPicker}
          onValueChange={(enabled) => {
            void applySettings(enabled, settings.hour, settings.minute);
          }}
          accessibilityLabel="Daily mood reminder"
          trackColor={{ false: '#D8CDE3', true: '#8950CF' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D8CDE3"
        />
      </View>

      {loading ? (
        <ActivityIndicator
          color={colours.primary}
          style={{ marginTop: 18 }}
        />
      ) : error ? (
        <>
          <Text style={{ color: colours.muted, marginTop: 14 }}>
            {error}
          </Text>

          <Pressable
            onPress={() => setRetryCount((count) => count + 1)}
            accessibilityRole="button"
            disabled={disabled || busy}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: colours.primary }}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Selecting a time while off does not enable notifications. */}
          <Pressable
            onPress={openTimePicker}
            disabled={controlsDisabled || showPicker}
            accessibilityRole="button"
            accessibilityLabel={`Change reminder time, currently ${timeLabel}`}
            style={{
              backgroundColor: colours.input,
              borderRadius: 16,
              padding: 16,
              marginTop: 18,
              opacity: controlsDisabled ? 0.6 : 1,
            }}
          >
            <Text
              style={{
                color: colours.primary,
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              {timeLabel} · Change time
            </Text>
          </Pressable>

          <Text
            style={{
              color: colours.muted,
              fontSize: 12,
              lineHeight: 19,
              marginTop: 12,
            }}
          >
            {busy
              ? 'Updating reminder…'
              : settings.enabled
                ? 'Reminder is on for this phone.'
                : 'Reminder is off. Turn it on whenever you like.'}
          </Text>
        </>
      )}

      {showPicker && (
        <>
          <DateTimePicker
            value={draftTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={handleTimeChange}
          />

          {/* iOS keeps the spinner open until Save or Cancel is tapped. */}
          {Platform.OS === 'ios' && (
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <Pressable
                onPress={() => setShowPicker(false)}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: colours.muted }}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowPicker(false);
                  void applySettings(
                    settings.enabled,
                    draftTime.getHours(),
                    draftTime.getMinutes()
                  );
                }}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text
                  style={{ color: colours.primary, fontWeight: '700' }}
                >
                  Save time
                </Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}