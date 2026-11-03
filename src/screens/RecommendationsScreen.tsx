import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { MoodPreferences } from './MoodPreferencesScreen';
import { recommendActivities } from '../services/recommendations';
import type { Activity } from '../services/recommendations';
import { useEffect, useState } from 'react';
import { getRecentActivityIds } from '../services/recentActivities';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  preferences: MoodPreferences;
  onBack: () => void;
  onStartActivity: (activity: Activity) => void;
};

export default function RecommendationsScreen({
  preferences,
  onBack,
  onStartActivity,
}: Props) {

    // Match the activity cards to the selected theme.
  const { isDark, colours } = useTheme();
  const styles = createStyles(colours);

  const [recentIds, setRecentIds] = useState<string[]>([]); // Store recent activity IDs.
  const [loadingRecent, setLoadingRecent] = useState(true); // Track history loading.
  const [historyError, setHistoryError] = useState(false); // Track a failed history read.

  useEffect(() => {
    let active = true; // Prevent state updates after this screen closes.

    async function loadRecentActivities() {
      try {
        const ids = await getRecentActivityIds(); // Read the last three sessions.

        if (active) {
          setRecentIds(ids); // Use these IDs when ranking activities.
        }
      } catch (error) {
        console.warn('[Recommendations] Could not load recent activities');

        if (active) {
          setHistoryError(true); // Explain that history could not be included.
        }
      } finally {
        if (active) {
          setLoadingRecent(false); // Finish loading after success or failure.
        }
      }
    }

    void loadRecentActivities(); // Start reading history when this screen opens.

    return () => {
      active = false; // Ignore results if the user has left this screen.
    };
  }, []);

  // Wait for history before displaying the ranked cards.
  // If history fails, still recommend using the selected preferences.
  const recommendations = loadingRecent
    ? []
    : recommendActivities(preferences, recentIds);

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Change preferences</Text>
        </Pressable>

        <Text style={styles.eyebrow}>A LITTLE SOMETHING FOR YOU</Text>
        <Text style={styles.title}>Your activity picks 💜</Text>
        <Text style={styles.subtitle}>
          Small activities chosen around how you feel today.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {preferences.mood} · {preferences.energy} energy
          </Text>
          <Text style={styles.summaryText}>
            Up to {preferences.minutes} min · {preferences.location}
          </Text>
        </View>

        {/* Explain loading and any fallback to preferences alone. */}
        {loadingRecent && (
            <Text style={styles.subtitle}>Finding activities for you...</Text>
        )}

        {historyError && (
            <Text style={styles.subtitle}>
              Recent history could not load. These picks use your preferences.
            </Text>
        )}

        {recommendations.map((activity, index) => (
          <View key={activity.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.pickLabel}>PICK {index + 1}</Text>
              <Text style={styles.duration}>{activity.minutes} min</Text>
            </View>

            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.description}>{activity.description}</Text>

            <View style={styles.tags}>
              <Text style={styles.tag}>{activity.location}</Text>
              <Text style={styles.tag}>{activity.energy} energy</Text>
            </View>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonTitle}>Why this activity?</Text>
              <Text style={styles.reasonText}>{activity.reason}</Text>
            </View>
            {/* Open this activity when the user taps the button. */}
            <Pressable
                onPress={() => onStartActivity(activity)}
                accessibilityRole="button"
                style={({ pressed }) => [
                    styles.startButton,
                    pressed && styles.pressed,
                    ]}
                >
                    <Text style={styles.startButtonText}>Start activity →</Text>
                </Pressable>

             </View>
            ))}

        {/* Explain when no activities meet the selected limits. */}
        {!loadingRecent && recommendations.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.activityTitle}>No matching activities</Text>
            <Text style={styles.description}>
              Go back and try another time or location.
            </Text>
          </View>
        )}

        <Text style={styles.footer}>
          Pick what feels comfortable for you.
        </Text>
      </ScrollView>
    </View>
  );
}

// Apply shared theme colours without changing recommendation behaviour.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours']
) =>
  StyleSheet.create({
    // Screen background and spacing.
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
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
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
      lineHeight: 23,
      color: colours.muted,
      marginTop: 10,
    },

    // Summary of the user's selected preferences.
    summary: {
      backgroundColor: colours.lavender,
      padding: 18,
      borderRadius: 20,
      gap: 6,
      marginTop: 22,
      marginBottom: 24,
    },
    summaryText: {
      fontSize: 13,
      fontWeight: '600',
      color: colours.text,
    },

    // Individual recommendation cards.
    card: {
      backgroundColor: colours.surface,
      borderWidth: 1,
      borderColor: colours.border,
      borderRadius: 25,
      padding: 22,
      marginBottom: 18,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 16,
    },
    pickLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
      color: colours.primary,
    },
    duration: {
      fontSize: 12,
      fontWeight: '700',
      color: colours.primary,
      backgroundColor: colours.lavender,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
    },
    activityTitle: {
      fontSize: 21,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 10,
    },
    description: {
      fontSize: 14,
      lineHeight: 23,
      color: colours.muted,
    },

    // Location and energy tags.
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    tag: {
      fontSize: 11,
      color: colours.text,
      backgroundColor: colours.pink,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },

    // Explanation of why the activity was recommended.
    reasonBox: {
      backgroundColor: colours.input,
      padding: 14,
      borderRadius: 16,
      marginTop: 18,
    },
    reasonTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 6,
    },
    reasonText: {
      fontSize: 12,
      lineHeight: 20,
      color: colours.muted,
    },
    footer: {
      fontSize: 12,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 8,
    },

    // Open the selected activity's timer.
    startButton: {
      backgroundColor: colours.primary,
      borderRadius: 20,
      minHeight: 50,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 18,
    },
    startButtonText: {
      color: colours.buttonText,
      fontSize: 15,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.75,
    },
  });