import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useEffect, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ensureUserProfile } from '../services/userProfile';

type Props = {
  email: string | null;
  onLogout: () => void;
  loggingOut: boolean;
  onCheckIn: () => void;
  onHistory: () => void; // Ask App.tsx to open activity history.
  onMyActivities: () => void; // Ask App.tsx to open personal activities.
};

export default function HomeScreen({
  email,
  onLogout,
  loggingOut,
  onCheckIn,
  onHistory,
  onMyActivities,
}: Props) {

// Keep the values empty until the saved profile loads.
const [points, setPoints] = useState<number | null>(null);
const [streak, setStreak] = useState<number | null>(null);
const [profileError, setProfileError] = useState(false);

useEffect(() => {
  let active = true;
  let stopListening: (() => void) | undefined;

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Log the error code without exposing personal information.
  function handleProfileError(error: unknown) {
    if (!active) return;

    const code =
      error instanceof FirebaseError ? error.code : 'unknown';

    console.warn('[Firestore] Profile loading failed:', code);
    setPoints(null);
    setStreak(null);
    setProfileError(true);
  }

  async function loadProfile() {
    try {
      // Create the profile only if it does not already exist.
      await ensureUserProfile(currentUser!);
      if (!active) return;

      const profileRef = doc(db, 'users', currentUser!.uid);

      // Update the screen whenever the saved profile changes.
      stopListening = onSnapshot(
        profileRef,
        (snapshot) => {
          if (!active) return;

          if (!snapshot.exists()) {
            setPoints(null);
            setStreak(null);
            setProfileError(true);
            return;
          }

          const data = snapshot.data();

          // Check that Firestore returned valid numbers.
          const validPoints =
            Number.isInteger(data.points) && data.points >= 0;
          const validStreak =
            Number.isInteger(data.currentStreak) &&
            data.currentStreak >= 0;

          setPoints(validPoints ? data.points : null);
          setStreak(validStreak ? data.currentStreak : null);
          setProfileError(!validPoints || !validStreak);

          console.info('[Firestore] Profile values loaded');
        },
        handleProfileError
      );
    } catch (error) {
      handleProfileError(error);
    }
  }

  void loadProfile();

  return () => {
    // Stop listening when this screen closes.
    active = false;
    stopListening?.();
  };
}, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandEmoji}>💜</Text>
            </View>
            <Text style={styles.brand}>MoodMate</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onLogout}
            disabled={loggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              (pressed || loggingOut) && styles.pressed,
            ]}
          >
            <Text style={styles.logoutText}>
              {loggingOut ? 'Logging out…' : 'Logout'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>YOUR LITTLE SELF-CARE SPACE</Text>
          <Text style={styles.greeting}>{greeting} 🌸</Text>
          <Text style={styles.welcomeText}>
            A fresh moment to check in with yourself.
          </Text>

          <View style={styles.accountBadge}>
            <Text style={styles.accountIcon}>✉</Text>
            <Text style={styles.email}>{email ?? 'MoodMate member'}</Text>
          </View>
        </View>

        {/* Open mood preferences when this card is tapped. */}
<Pressable
  onPress={onCheckIn}
  accessibilityRole="button"
  accessibilityLabel="Choose your mood and activity preferences"
  style={({ pressed }) => [
    styles.moodCard,
    pressed && styles.pressed,
  ]}
>
  <View style={styles.moodHeading}>
    <Text style={styles.moodLabel}>A MOMENT FOR YOU</Text>
    <Text style={styles.moodEmoji}>🌷</Text>
  </View>

  <Text style={styles.moodTitle}>
    How are you{'\n'}feeling today?
  </Text>

  <Text style={styles.moodDescription}>
    Every feeling deserves a little kindness.
  </Text>

  <View style={styles.moodFooter}>
    <Text style={styles.moodFaces}>😊   😌   😐   😔</Text>
    <Text style={styles.smallNote}>Start your check-in →</Text>
  </View>
</Pressable>

{/* Open the user's saved activity history. */}
<Pressable
  onPress={onHistory}
  accessibilityRole="button"
  style={({ pressed }) => ({
    backgroundColor: '#F0E8FC',
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    marginBottom: 20,
    opacity: pressed ? 0.75 : 1,
  })}
>
  <Text
    style={{
      color: '#795891',
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    }}
  >
    View activity history →
  </Text>
</Pressable>

        <Text style={styles.sectionTitle}>Your daily space</Text>
        <Text style={styles.sectionSubtitle}>
          Small things that make room for you.
        </Text>

        <View style={styles.grid}>
          {/* Open the user's personal activity collection. */}
          <Pressable
              onPress={onMyActivities}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.quickCard,
                styles.lavenderCard,
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <View style={styles.iconCircle}>
                  <Text style={styles.cardEmoji}>📋</Text>
              </View>

              <Text style={styles.cardTitle}>My Activities</Text>

              <Text style={styles.cardDescription}>
                  Make time for what you enjoy.
              </Text>

              <Text style={styles.comingSoon}>Open collection →</Text>
            </Pressable>

          <View style={[styles.quickCard, styles.pinkCard]}>
            <View style={styles.iconCircle}>
              <Text style={styles.cardEmoji}>📖</Text>
            </View>
            <Text style={styles.cardTitle}>Mood Journal</Text>
            <Text style={styles.cardDescription}>
              A little space for your thoughts.
            </Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your progress</Text>

        <View style={styles.grid}>
          <View style={[styles.statCard, styles.yellowCard]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{points ?? '—'}</Text>
            <Text style={styles.statLabel}>Total points</Text>
          </View>

          <View style={[styles.statCard, styles.peachCard]}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak ?? '—'}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>          
        </View>

        <Text style={styles.progressNote}>
          {profileError
            ? 'Unable to load progress. Please reopen the app to try again.'
            : points === null || streak === null
              ? 'Loading your progress…'
              : 'Small steps count. Keep making time for yourself.'}
        </Text>

        <View style={styles.quoteCard}>
          <Text style={styles.quote}>
            “You don’t have to do it all.{'\n'}Just take one small step.”
          </Text>
          <Text style={styles.quoteFooter}>A gentle reminder from MoodMate 💜</Text>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 64 : 52,
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F0E6FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: { fontSize: 19 },
  brand: {
    fontSize: 21,
    fontWeight: '800',
    color: '#7545AF',
  },
  logoutButton: {
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EADFF3',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#795891',
  },
  welcome: { marginBottom: 26 },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: '#9A7AAD',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: '#302B42',
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#81778D',
    marginTop: 8,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: 8,
    marginTop: 14,
    backgroundColor: '#F5EFFA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountIcon: { color: '#9572AE', fontSize: 15 },
  email: { flexShrink: 1, fontSize: 12, color: '#7F6C91' },
  moodCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#FBEAF6',
    borderWidth: 1,
    borderColor: '#F7DFF0',
  },
  moodHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: '#A46598',
  },
  moodEmoji: { fontSize: 34 },
  moodTitle: {
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '800',
    color: '#59365D',
    marginTop: 8,
  },
  moodDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: '#956D91',
    marginTop: 10,
  },
  moodFooter: {
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EED6E8',
    gap: 10,
  },
  moodFaces: { fontSize: 25 },
  smallNote: { fontSize: 11, color: '#956D91' },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#302B42',
    marginTop: 28,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8A8095',
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
  },
  quickCard: {
    flex: 1,
    borderRadius: 23,
    padding: 17,
  },
  lavenderCard: { backgroundColor: '#F0E8FC' },
  pinkCard: { backgroundColor: '#FCECF4' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardEmoji: { fontSize: 23 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#493655',
    marginBottom: 7,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: '#85718F',
  },
  comingSoon: {
    fontSize: 10,
    fontWeight: '600',
    color: '#86629F',
    marginTop: 14,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 23,
    alignItems: 'center',
  },
  yellowCard: { backgroundColor: '#FFF5D9' },
  peachCard: { backgroundColor: '#FFECE7' },
  statEmoji: { fontSize: 26 },
  statValue: {
    fontSize: 27,
    fontWeight: '800',
    color: '#493655',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#85718F',
    marginTop: 4,
  },
  progressNote: {
    fontSize: 11,
    lineHeight: 17,
    color: '#94869F',
    marginTop: 12,
  },
  quoteCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  quote: {
    fontSize: 16,
    lineHeight: 25,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#8D6CA1',
  },
  quoteFooter: {
    fontSize: 10,
    color: '#AA98B6',
    textAlign: 'center',
    marginTop: 12,
  },
  pressed: { opacity: 0.65 },
});