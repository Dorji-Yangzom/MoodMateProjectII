import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Activity } from '../services/recommendations';
import { FirebaseError } from 'firebase/app';
import type { MoodPreferences } from './MoodPreferencesScreen';
import {
  createSessionId,
  saveCompletedActivity,
} from '../services/activityProgress';

type Props = {
  activity: Activity;
  preferences: MoodPreferences;
  onBack: () => void;
  onComplete: () => void;
};

export default function ActivitySessionScreen({
  activity,
  preferences,
  onBack,
  onComplete,
}: Props) {
  // Convert the activity duration from minutes to seconds.
  const totalSeconds = activity.minutes * 60;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);

  // Refs keep timer values without causing screen updates.
  const remaining = useRef(totalSeconds);
  const finishTime = useRef<number | null>(null);
  const completed = useRef(false);

  // Generate one ID when this screen opens.
  // Retrying a failed save uses this same ID to avoid duplicate points.
  const [sessionId] = useState(() => createSessionId());

  // Show when Firebase is saving and prevent repeated button taps.
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!running) return;

    function updateCountdown() {
      if (finishTime.current === null) return;

      // Calculate real time remaining instead of counting interval ticks.
      const nextSeconds = Math.max(
        0,
        Math.ceil((finishTime.current - Date.now()) / 1000)
      );

      remaining.current = nextSeconds;
      setSecondsLeft(nextSeconds);

      if (nextSeconds === 0) {
        finishTime.current = null;
        setRunning(false);
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 250);

    // Remove the interval when paused or when the screen closes.
    return () => clearInterval(interval);
  }, [running]);

  function handleStartPause() {
    if (remaining.current <= 0) return;

    if (running && finishTime.current !== null) {
      // Save the remaining time so Resume continues from here.
      const nextSeconds = Math.max(
        0,
        Math.ceil((finishTime.current - Date.now()) / 1000)
      );

      remaining.current = nextSeconds;
      setSecondsLeft(nextSeconds);
      finishTime.current = null;
      setRunning(false);
    } else {
      finishTime.current = Date.now() + remaining.current * 1000;
      setRunning(true);
    }
  }

  function handleBack() {
      // Prevent leaving while Firebase is saving the completed activity.
      // This avoids closing the screen before the save result is known.
      if (completed.current) {
        return;
      }

      Alert.alert(
        'Leave this activity?',
        'This session will be discarded and will not count as completed.',
        [
         { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: onBack },
        ]
      );
    }

  async function handleComplete() {
  // Block completion while time remains or a save is already running.
  if (remaining.current > 0 || completed.current) {
    return;
  }

  // Block repeated taps immediately and show the saving message.
  completed.current = true;
  setSaving(true);

  try {
    // Save history, points and streak together in Firebase.
    // Reusing the same session ID prevents duplicate points.
    await saveCompletedActivity(sessionId, activity, preferences);

    console.info('[Activity] Completion saved');

    // Return home only after the save succeeds.
    onComplete();
  } catch (error) {
    const code =
      error instanceof FirebaseError ? error.code : 'unknown';

    console.warn('[Activity] Save failed:', code);

    // Allow the user to retry with the same session ID.
    completed.current = false;

    Alert.alert(
      'Could not save activity',
      'Check your connection and tap Complete activity again.'
    );
  } finally {
    // Stop showing the saving message when the request finishes.
    setSaving(false);
  }
}

  // Format seconds as minutes:seconds, for example 04:09.
  const minutesText = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const secondsText = (secondsLeft % 60).toString().padStart(2, '0');

  const finished = secondsLeft === 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back to activities</Text>
        </Pressable>

        <Text style={styles.eyebrow}>TIME FOR YOURSELF</Text>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description}</Text>

        <View style={styles.timerCard}>
          <Text style={styles.timerEmoji}>🌸</Text>
          <Text style={styles.timer}>
            {minutesText}:{secondsText}
          </Text>
          <Text style={styles.timerLabel}>
            {finished
              ? 'Your time is complete'
              : running
                ? 'One moment at a time'
                : 'Ready when you are'}
          </Text>
        </View>

        {!finished && (
          <Pressable
            onPress={handleStartPause}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              pressed && styles.dimmed,
            ]}
          >
            <Text style={styles.buttonText}>
              {running
                ? 'Pause'
                : secondsLeft === totalSeconds
                  ? 'Start activity'
                  : 'Resume'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleComplete}
          disabled={!finished || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !finished }}
          style={({ pressed }) => [
            styles.completeButton,
            (!finished || pressed) && styles.dimmed,
          ]}
        >
          <Text style={styles.completeText}>
            {saving ? 'Saving...' : 'Complete activity'} ✓</Text>
        </Pressable>

        <Text style={styles.footer}>
          {finished
            ? 'Well done for making time for yourself 💜'
            : 'Complete becomes available when the timer reaches 00:00.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCFF',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 28,
  },
  backText: {
    color: '#8950CF',
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    color: '#9A7AAD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#302B42',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#81778D',
    marginTop: 12,
  },
  timerCard: {
    alignItems: 'center',
    backgroundColor: '#F2EBFC',
    borderRadius: 32,
    paddingVertical: 42,
    paddingHorizontal: 16,
    marginVertical: 32,
  },
  timerEmoji: {
    fontSize: 45,
    marginBottom: 20,
  },
  timer: {
    fontSize: 58,
    fontWeight: '800',
    color: '#7545AF',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: '#9572AE',
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#D63DE6',
    minHeight: 56,
    borderRadius: 26,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: '#8950CF',
    minHeight: 56,
    borderRadius: 26,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    fontSize: 12,
    lineHeight: 20,
    color: '#94869F',
    textAlign: 'center',
    marginTop: 20,
  },
  dimmed: {
    opacity: 0.45,
  },
});