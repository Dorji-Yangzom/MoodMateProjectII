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

  // Rank activities using the user's selected preferences.
  const recommendations = recommendActivities(preferences);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

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
        {recommendations.length === 0 && (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCFF',
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
    color: '#8950CF',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    color: '#9A7AAD',
    marginBottom: 10,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#302B42',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#81778D',
    marginTop: 10,
  },
  summary: {
    backgroundColor: '#F0E8FC',
    padding: 18,
    borderRadius: 20,
    gap: 6,
    marginTop: 22,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#795891',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDE2F4',
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
    color: '#B16A9E',
  },
  duration: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8950CF',
    backgroundColor: '#F2EBFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  activityTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#493655',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 23,
    color: '#81778D',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    fontSize: 11,
    color: '#956D91',
    backgroundColor: '#FCECF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  reasonBox: {
    backgroundColor: '#F8F4FC',
    padding: 14,
    borderRadius: 16,
    marginTop: 18,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#795891',
    marginBottom: 6,
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#85718F',
  },
  footer: {
    fontSize: 12,
    color: '#94869F',
    textAlign: 'center',
    marginTop: 8,
  },

    // Style the button used to open an activity.
  startButton: {
    backgroundColor: '#D63DE6',
    borderRadius: 20,
    minHeight: 50,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});