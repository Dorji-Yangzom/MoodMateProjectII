import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  AppState,
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
import { useTheme } from '../theme/ThemeContext';

type Props = {
  email: string | null;
  onLogout: () => void;
  loggingOut: boolean;
  onCheckIn: () => void;
  onHistory: () => void; // Ask App.tsx to open activity history.
  onMyActivities: () => void; // Ask App.tsx to open personal activities.
  onJournal: () => void; // Ask App.tsx to open the journal.
  onProgress: () => void; // Ask App.tsx to open the weekly summary.
};

export default function HomeScreen({
  email,
  onLogout,
  loggingOut,
  onCheckIn,
  onHistory,
  onMyActivities,
  onJournal,
  onProgress, 
}: Props) {

  // Apply the selected theme to Home.
const { isDark, colours } = useTheme();
const styles = createStyles(colours);

// Keep the values empty until the saved profile loads.
const [points, setPoints] = useState<number | null>(null);
const [streak, setStreak] = useState<number | null>(null);
const [profileError, setProfileError] = useState(false);
// Read the user's saved name for the welcome greeting.
const [displayName, setDisplayName] = useState('');
// Remember the date of the user's latest activity or journal entry.
const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);

// Keep the displayed streak up to date when the calendar day changes.
const [now, setNow] = useState(() => new Date());

useEffect(() => {
  function updateClock() {
    setNow(new Date()); // Read the phone's current local date and time.
  }

  // Check periodically while Home remains open.
  const timer = setInterval(updateClock, 30_000);

  // Check immediately when returning from the background.
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      updateClock();
    }
  });

  return () => {
    clearInterval(timer); // Stop checking when Home closes.
    subscription.remove(); // Remove the background listener.
  };
}, []);

// Format dates using the same local-calendar format as saved progress.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const todayKey = getDateKey(now);

const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayKey = getDateKey(yesterday);

// Yesterday's streak stays active while the user still has today to check in.
// An older date means at least one full calendar day was missed.
const displayedStreak =
  streak === null
    ? null
    : lastActiveDate === todayKey || lastActiveDate === yesterdayKey
      ? streak
      : 0;

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

          // Update the greeting whenever the saved profile name changes.
          setDisplayName(
            typeof data.displayName === 'string' ? data.displayName.trim() : ''
          );

          // Check that Firestore returned valid numbers.
          const validPoints =
            Number.isInteger(data.points) && data.points >= 0;
          const validStreak =
            Number.isInteger(data.currentStreak) &&
            data.currentStreak >= 0;

          setPoints(validPoints ? data.points : null);
          setStreak(validStreak ? data.currentStreak : null);

          // Both journal entries and completed activities update this saved date.
          setLastActiveDate(
            typeof data.lastActiveDate === 'string' ? data.lastActiveDate : null
          );

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
      <StatusBar style={isDark ? 'light' : 'dark'} />

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
          <Text style={styles.greeting}>
            {greeting}{displayName ? `, ${displayName}` : ''} 🌸
          </Text>
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
    backgroundColor: colours.lavender,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    marginBottom: 20,
    opacity: pressed ? 0.75 : 1,
  })}
>
  <Text
    style={{
      color: colours.primary,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    }}
  >
    View activity history →
  </Text>
</Pressable>

{/* Open the weekly summary of saved journal moods. */}
<Pressable
  onPress={onProgress}
  accessibilityRole="button"
  style={({ pressed }) => ({
    backgroundColor: '#F0E8FC',
    borderRadius: 20,
    padding: 18,
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
    View weekly moods →
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

          {/* Open the journal when the user taps this card. */}
          <Pressable
            onPress={onJournal}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.quickCard,
              styles.pinkCard,
              { opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.cardEmoji}>📖</Text>
            </View>

            <Text style={styles.cardTitle}>Mood Journal</Text>

            <Text style={styles.cardDescription}>
              A little space for your thoughts.
            </Text>

            <Text style={styles.comingSoon}>Open journal →</Text>
          </Pressable>
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
            <Text style={styles.statValue}>{displayedStreak ?? '—'}</Text>
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

// Shared theme colours keep Home readable in light and dark mode.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colours.background,
    },
    content: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 64 : 52,
      paddingBottom: 48,
    },

    // Brand and logout button.
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
      backgroundColor: colours.lavender,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandEmoji: { fontSize: 19 },
    brand: {
      fontSize: 21,
      fontWeight: '800',
      color: colours.primary,
    },
    logoutButton: {
      minHeight: 44,
      paddingHorizontal: 15,
      justifyContent: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colours.border,
    },
    logoutText: {
      fontSize: 13,
      fontWeight: '600',
      color: colours.primary,
    },

    // Greeting and account details.
    welcome: { marginBottom: 26 },
    eyebrow: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.6,
      color: colours.muted,
      marginBottom: 10,
    },
    greeting: {
      fontSize: 29,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: colours.text,
    },
    welcomeText: {
      fontSize: 15,
      lineHeight: 23,
      color: colours.muted,
      marginTop: 8,
    },
    accountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      maxWidth: '100%',
      gap: 8,
      marginTop: 14,
      backgroundColor: colours.input,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    accountIcon: {
      color: colours.muted,
      fontSize: 15,
    },
    email: {
      flexShrink: 1,
      fontSize: 12,
      color: colours.muted,
    },

    // Main mood check-in card.
    moodCard: {
      padding: 24,
      borderRadius: 28,
      backgroundColor: colours.pink,
      borderWidth: 1,
      borderColor: colours.border,
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
      color: colours.muted,
    },
    moodEmoji: { fontSize: 34 },
    moodTitle: {
      fontSize: 29,
      lineHeight: 36,
      fontWeight: '800',
      color: colours.text,
      marginTop: 8,
    },
    moodDescription: {
      fontSize: 14,
      lineHeight: 22,
      color: colours.muted,
      marginTop: 10,
    },
    moodFooter: {
      marginTop: 22,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colours.border,
      gap: 10,
    },
    moodFaces: { fontSize: 25 },
    smallNote: {
      fontSize: 11,
      color: colours.muted,
    },

    // Personal activity and journal cards.
    sectionTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colours.text,
      marginTop: 28,
      marginBottom: 6,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colours.muted,
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
    lavenderCard: {
      backgroundColor: colours.lavender,
    },
    pinkCard: {
      backgroundColor: colours.pink,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: colours.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    cardEmoji: { fontSize: 23 },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 7,
    },
    cardDescription: {
      fontSize: 12,
      lineHeight: 19,
      color: colours.muted,
    },
    comingSoon: {
      fontSize: 10,
      fontWeight: '600',
      color: colours.primary,
      marginTop: 14,
    },

    // Points and current streak.
    statCard: {
      flex: 1,
      padding: 20,
      borderRadius: 23,
      alignItems: 'center',
    },
    yellowCard: {
      backgroundColor: colours.yellow,
    },
    peachCard: {
      backgroundColor: colours.pink,
    },
    statEmoji: { fontSize: 26 },
    statValue: {
      fontSize: 27,
      fontWeight: '800',
      color: colours.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colours.muted,
      marginTop: 4,
    },
    progressNote: {
      fontSize: 11,
      lineHeight: 17,
      color: colours.muted,
      marginTop: 12,
    },

    // Closing quote.
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
      color: colours.muted,
    },
    quoteFooter: {
      fontSize: 10,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 12,
    },
    pressed: { opacity: 0.65 },
  });