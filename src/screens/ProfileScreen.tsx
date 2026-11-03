import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FirebaseError } from 'firebase/app';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { auth, db } from '../services/firebase';
import {
  ensureUserProfile,
  updateProfileName,
} from '../services/userProfile';
import { useTheme } from '../theme/ThemeContext';
import ReminderSettingsCard from '../components/ReminderSettingsCard';

type Props = {
  onBack: () => void; // Return to Home.
};

export default function ProfileScreen({ onBack }: Props) {
    // Read the shared theme and the action for changing it.
  const { isDark, colours, toggleTheme } = useTheme();
  // Build the screen's styles using the selected theme.
  const styles = createStyles(colours);
  const [name, setName] = useState('');
  const [points, setPoints] = useState<number | null>(null);
  const [longestStreak, setLongestStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Track reminder updates so we can wait before leaving Profile.
  const [reminderBusy, setReminderBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // A ref blocks repeated taps immediately, before React renders again.
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let stopListening: (() => void) | undefined;
    let nameLoaded = false;

    setLoading(true);
    setError('');

    function handleError(failure: unknown) {
      if (!active) return;

      const code =
        failure instanceof FirebaseError ? failure.code : 'unknown';

      console.warn('[Profile] Loading failed:', code);
      setError('Could not load your profile. Please try again.');
      setLoading(false);
    }

    async function loadProfile() {
      const user = auth.currentUser;

      if (!user) {
        if (active) {
          setError('Please sign in to view your profile.');
          setLoading(false);
        }
        return;
      }

      try {
        // Create a missing profile without replacing existing progress.
        await ensureUserProfile(user);
        if (!active) return;

        stopListening = onSnapshot(
          doc(db, 'users', user.uid),
          (snapshot) => {
            if (!active) return;

            if (!snapshot.exists()) {
              handleError(new Error('Profile missing'));
              return;
            }

            const data = snapshot.data();

            // Fill the input once so later updates do not erase typing.
            if (!nameLoaded) {
              setName(
                typeof data.displayName === 'string'
                  ? data.displayName
                  : ''
              );
              nameLoaded = true;
            }

            // Show a dash if a saved progress value is invalid.
            setPoints(
              Number.isInteger(data.points) && data.points >= 0
                ? data.points
                : null
            );

            setLongestStreak(
              Number.isInteger(data.longestStreak) &&
                data.longestStreak >= 0
                ? data.longestStreak
                : null
            );

            setError('');
            setLoading(false);
          },
          handleError
        );
      } catch (failure) {
        handleError(failure);
      }
    }

    void loadProfile();

    return () => {
      active = false; // Ignore results after the screen closes.
      stopListening?.(); // Stop the Firestore listener.
    };
  }, [retryCount]);

  async function handleSave() {
    if (savingRef.current || reminderBusy) return;

    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in again.');
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      // The service validates the name and updates only profile fields.
      await updateProfileName(user, name);
      setName(name.trim());

      console.info('[Profile] Name saved');
      Alert.alert('Profile updated', 'Your name has been saved.');
    } catch (failure) {
      const code =
        failure instanceof FirebaseError ? failure.code : 'validation';

      console.warn('[Profile] Save failed:', code);

      Alert.alert(
        'Could not save',
        failure instanceof FirebaseError
          ? 'Check your connection and try again.'
          : failure instanceof Error
            ? failure.message
            : 'Please try again.'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colours.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Keep the screen open until the save result is known. */}
        <Pressable
          onPress={onBack}
          disabled={saving || reminderBusy}
          accessibilityRole="button"
          style={styles.backButton}
        >
          <Text style={styles.link}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.eyebrow}>YOUR LITTLE CORNER</Text>
        <Text style={styles.title}>My profile 💜</Text>
        <Text style={styles.subtitle}>
          A little about you and your progress.
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
              onPress={() => setRetryCount((count) => count + 1)}
              accessibilityRole="button"
              style={styles.backButton}
            >
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Email is displayed here; it is not editable. */}
            <View style={styles.identity}>
              <Text style={styles.avatar}>🌷</Text>
              <Text style={styles.identityTitle}>Your self-care space</Text>
              <Text style={styles.email}>{auth.currentUser?.email}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>What should we call you?</Text>
              <Text style={styles.label}>Display name</Text>

              <TextInput
                value={name}
                onChangeText={setName}
                editable={!saving && !reminderBusy}
                maxLength={50}
                placeholder="Enter your name"
                placeholderTextColor={colours.muted}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Display name"
                style={styles.input}
              />

              {/* Save the name without changing points or streaks. */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.saveButton,
                  (pressed || saving) && styles.pressed,
                ]}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving…' : 'Save name'}
                </Text>
              </Pressable>
            </View>

            {/* Longest streak is a record, so missed days do not erase it. */}
            <View style={styles.stats}>
              <View style={[styles.statCard, styles.yellowCard]}>
                <Text style={styles.statEmoji}>⭐</Text>
                <Text style={styles.statNumber}>{points ?? '—'}</Text>
                <Text style={styles.statLabel}>Total points</Text>
              </View>

              <View style={[styles.statCard, styles.pinkCard]}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statNumber}>
                  {longestStreak ?? '—'}
                </Text>
                <Text style={styles.statLabel}>Longest streak</Text>
              </View>
            </View>

            {/* Keep appearance settings on Profile instead of crowding Home. */}
<View
  style={[
    styles.card,
    {
      backgroundColor: colours.surface,
      borderColor: colours.border,
      marginTop: 20,
    },
  ]}
>
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}
  >
    <View style={{ flex: 1 }}>
      <Text style={[styles.cardTitle, { color: colours.text, marginBottom: 4 }]}>
        Dark theme
      </Text>

      <Text style={[styles.body, { color: colours.muted }]}>
        {isDark ? 'Dark appearance is on' : 'Light appearance is on'}
      </Text>
    </View>

    <Switch
      value={isDark}
      onValueChange={toggleTheme}
      accessibilityLabel="Dark theme"
      trackColor={{ false: '#D8CDE3', true: '#8950CF' }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#D8CDE3"
    />
  </View>
</View>

            {/* Reminder settings stay below the Dark theme card. */}
            <ReminderSettingsCard
                disabled={saving}
                onBusyChange={setReminderBusy}
            />

            <Text style={styles.footer}>
                Little steps, at your own pace.
            </Text>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Use the shared theme colours for both light and dark appearance.
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
      marginTop: 8,
      marginBottom: 24,
    },
    loader: {
      marginTop: 40,
    },

    // Profile identity and name form.
    identity: {
      alignItems: 'center',
      backgroundColor: colours.lavender,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
    },
    avatar: {
      fontSize: 42,
      marginBottom: 12,
    },
    identityTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colours.text,
    },
    email: {
      fontSize: 13,
      lineHeight: 20,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 7,
    },
    card: {
      backgroundColor: colours.surface,
      borderWidth: 1,
      borderColor: colours.border,
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 18,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colours.muted,
      marginBottom: 8,
    },
    input: {
      minHeight: 52,
      borderRadius: 15,
      backgroundColor: colours.input,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color: colours.text,
    },
    saveButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colours.primary,
      borderRadius: 16,
      marginTop: 16,
      padding: 12,
    },
    saveText: {
      fontSize: 15,
      fontWeight: '700',
      color: colours.buttonText,
    },

    // Progress cards retain their soft colours in each theme.
    stats: {
      flexDirection: 'row',
      gap: 14,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      borderRadius: 22,
      padding: 20,
    },
    yellowCard: {
      backgroundColor: colours.yellow,
    },
    pinkCard: {
      backgroundColor: colours.pink,
    },
    statEmoji: {
      fontSize: 26,
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '800',
      color: colours.text,
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: colours.muted,
      textAlign: 'center',
      marginTop: 5,
    },
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: colours.muted,
    },
    footer: {
      fontSize: 12,
      textAlign: 'center',
      color: colours.muted,
      marginTop: 24,
    },
    pressed: {
      opacity: 0.7,
    },
  });