import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getWeeklyMoods } from '../services/weeklyProgress';
import type { DailyMood } from '../services/weeklyProgress';
import type { JournalInput } from '../services/journal';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  onBack: () => void; // Return to the Home screen.
};

// Store the colour and emoji used for each mood.
const moodAppearance: Record<
  JournalInput['mood'],
  { colour: string; emoji: string }
> = {
  Happy: { colour: '#FFF3CE', emoji: '😊' },
  Calm: { colour: '#E6F3EC', emoji: '😌' },
  Sad: { colour: '#E8EEFC', emoji: '😔' },
  Stressed: { colour: '#FCE5ED', emoji: '😣' },
  Bored: { colour: '#EFE5FA', emoji: '😐' },
};

export default function ProgressScreen({ onBack }: Props) {
    // Read the selected theme and create matching screen styles.
  const { isDark, colours } = useTheme();
  const styles = createStyles(colours);
  const [days, setDays] = useState<DailyMood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);

  // Load the last seven days when the screen opens or Refresh is tapped.
  useEffect(() => {
    let active = true; // Prevent updates after leaving this screen.

    async function loadProgress() {
      setLoading(true);
      setError('');

      try {
        const result = await getWeeklyMoods();

        if (active) {
          setDays(result);
        }
      } catch {
        console.warn('[Progress] Could not load weekly moods');

        if (active) {
          setError('Could not load your moods. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProgress();

    return () => {
      active = false; // Ignore any unfinished request.
    };
  }, [refreshCount]);

  // Several entries on the same day still count as one recorded day.
  const recordedDays = days.filter((day) => day.mood !== null).length;

  function refreshProgress() {
    setRefreshCount((count) => count + 1); // Run the loading effect again.
  }

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Return to Home. */}
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>YOUR FEELINGS, DAY BY DAY</Text>
        <Text style={styles.title}>My mood week 💜</Text>
        <Text style={styles.subtitle}>
          A little space to look back.
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colours.primary}
            style={styles.loader}
          />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.body}>{error}</Text>

            <Pressable
              onPress={refreshProgress}
              accessibilityRole="button"
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Keep the recorded-day count in a small summary card. */}
            <View style={styles.summary}>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryTitle}>Your little check-ins</Text>
                <Text style={styles.summaryDescription}>
                  Days journaled in the last seven days
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text style={styles.countText}>{recordedDays}/7</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>The last 7 days</Text>
              <Text style={styles.cardDescription}>
                Your latest journal mood each day
              </Text>

              {/* Create one compact row for each day. */}
              {days.map((day, index) => {
                const appearance = day.mood
                  ? moodAppearance[day.mood]
                  : null;

                // The service returns the days from oldest to newest.
                const isToday = index === days.length - 1;

                return (
                  <View
                    key={day.dateKey}
                    style={[
                      styles.dayRow,
                      isToday && styles.todayRow,
                    ]}
                  >
                    <View style={styles.dayHeading}>
                      <Text style={styles.dayName}>{day.label}</Text>

                      {isToday && (
                        <Text style={styles.todayLabel}>Today</Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.moodBadge,
                        {
                          backgroundColor:
                            appearance?.colour ?? '#F1EDF5',
                        },
                      ]}
                    >
                      {/* Separate emoji and label for clear rendering. */}
                      {appearance && (
                        <Text style={styles.moodEmoji}>
                          {appearance.emoji}
                        </Text>
                      )}

                      <Text
                        style={[
                          styles.moodText,
                          !day.mood && styles.emptyText,
                        ]}
                      >
                        {day.mood ?? 'No entry'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.footer}>
              {recordedDays === 0
                ? 'Save a journal entry to start your mood week 🌷'
                : 'Every feeling deserves a little kindness 🌷'}
            </Text>

            {/* Fetch the latest saved journal moods. */}
            <Pressable
              onPress={refreshProgress}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.refreshText}>Refresh moods ↻</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Create matching styles whenever the selected theme changes.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours']
) =>
  StyleSheet.create({
    // Main background and screen spacing.
    container: {
      flex: 1,
      backgroundColor: colours.background,
    },
    content: {
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
      marginBottom: 22,
    },
    backText: {
      fontSize: 14,
      fontWeight: '600',
      color: colours.primary,
    },

    // Screen heading.
    eyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.3,
      color: colours.muted,
      marginBottom: 10,
    },
    title: {
      fontSize: 29,
      fontWeight: '800',
      color: colours.text,
    },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: colours.muted,
      marginTop: 8,
      marginBottom: 24,
    },
    loader: {
      marginTop: 40,
    },

    // Number of days with a saved journal entry.
    summary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colours.lavender,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
    },
    summaryCopy: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colours.text,
    },
    summaryDescription: {
      fontSize: 12,
      lineHeight: 18,
      color: colours.muted,
      marginTop: 5,
    },
    countBadge: {
      backgroundColor: colours.surface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    countText: {
      fontSize: 23,
      fontWeight: '800',
      color: colours.primary,
    },

    // Card containing the seven day rows.
    card: {
      backgroundColor: colours.surface,
      borderWidth: 1,
      borderColor: colours.border,
      borderRadius: 26,
      padding: 18,
    },
    cardTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: colours.text,
    },
    cardDescription: {
      fontSize: 12,
      lineHeight: 19,
      color: colours.muted,
      marginTop: 5,
      marginBottom: 16,
    },
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      marginBottom: 5,
    },
    todayRow: {
      backgroundColor: colours.input,
    },
    dayHeading: {
      flex: 1,
    },
    dayName: {
      fontSize: 15,
      fontWeight: '700',
      color: colours.text,
    },
    todayLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colours.primary,
      marginTop: 3,
    },

    // Mood badges retain pastel backgrounds in both themes.
    // Their labels stay dark to remain readable on those backgrounds.
    moodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 14,
    },
    moodEmoji: {
      fontSize: 17,
    },
    moodText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#594465',
    },
    emptyText: {
      color: '#75647F',
      fontWeight: '400',
    },

    // Error message, footer and refresh button.
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: colours.muted,
    },
    footer: {
      fontSize: 12,
      lineHeight: 20,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 22,
    },
    refreshButton: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colours.lavender,
      marginTop: 16,
    },
    refreshText: {
      fontSize: 13,
      fontWeight: '700',
      color: colours.primary,
    },
    pressed: {
      opacity: 0.7,
    },
  });