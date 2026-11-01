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
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

// The parent screen provides the action for returning home.
type Props = {
  onBack: () => void;
};

// Describe the information we display for each completed session.
type HistoryItem = {
  id: string;
  title: string;
  minutes: number;
  mood: string;
  pointsEarned: number;
  completedAt: Date | null;
};

export default function ActivityHistoryScreen({ onBack }: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Changing this value starts a fresh listener when Retry is tapped.
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setError('Please sign in to view your history.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Read only this user's sessions.
    // Show the newest 50 to keep the initial history list small.
    const historyQuery = query(
      collection(db, 'users', user.uid, 'completedActivities'),
      orderBy('completedAt', 'desc'),
      limit(50)
    );

    // Listen for changes so the list stays updated.
    const unsubscribe = onSnapshot(
      historyQuery,
      (snapshot) => {
        const history = snapshot.docs.map((document): HistoryItem => {
          const data = document.data();

          return {
            id: document.id,
            title: data.title ?? 'Completed activity',
            minutes: data.minutes ?? 0,
            mood: data.mood ?? '',
            pointsEarned: data.pointsEarned ?? 0,

            // Convert Firebase's timestamp into a JavaScript date.
            // A missing timestamp is displayed as "Date unavailable".
            completedAt:
              data.completedAt instanceof Timestamp
                ? data.completedAt.toDate()
                : null,
          };
        });

        setItems(history);
        setLoading(false);
      },
      (failure) => {
        console.warn('[History] Loading failed:', failure.code);
        setError('Could not load your history. Please try again.');
        setLoading(false);
      }
    );

    // Stop listening when this screen closes or a retry begins.
    return unsubscribe;
  }, [retryCount]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.link}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>YOUR LITTLE STEPS</Text>
        <Text style={styles.title}>Activity history 💜</Text>
        <Text style={styles.subtitle}>
          A little reminder of the time you made for yourself.
        </Text>

        {/* Show a spinner while waiting for Firebase. */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#8950CF"
            style={styles.loader}
          />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.description}>{error}</Text>
            <Pressable
              onPress={() => setRetryCount((count) => count + 1)}
              accessibilityRole="button"
              style={styles.backButton}
            >
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your story starts here 🌷</Text>
            <Text style={styles.description}>
              Complete an activity to see it in your history.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.note}>Your latest 50 completed sessions</Text>

            {/* Each saved session becomes one history card. */}
            {items.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.date}>
                  {item.completedAt
                    ? item.completedAt.toLocaleString()
                    : 'Date unavailable'}
                </Text>

                <Text style={styles.cardTitle}>{item.title}</Text>

                <Text style={styles.description}>
                  {item.minutes} min · {item.mood}
                </Text>

                <Text style={styles.points}>
                  +{item.pointsEarned} points earned
                </Text>
              </View>
            ))}
          </>
        )}
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
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  link: {
    color: '#8950CF',
    fontSize: 14,
    fontWeight: '600',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
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
    marginBottom: 26,
  },
  loader: {
    marginTop: 40,
  },
  note: {
    fontSize: 12,
    color: '#94869F',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F5EFFC',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
  },
  date: {
    fontSize: 12,
    color: '#85718F',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#493655',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#81778D',
  },
  points: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8950CF',
    marginTop: 14,
  },
});