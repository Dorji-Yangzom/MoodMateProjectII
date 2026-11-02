import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/services/firebase';
import RegisterScreen from './src/screens/RegisterScreen';
import { FirebaseError } from 'firebase/app';
import MoodPreferencesScreen from './src/screens/MoodPreferencesScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';
import type { MoodPreferences } from './src/screens/MoodPreferencesScreen';
import ActivitySessionScreen from './src/screens/ActivitySessionScreen';
import type { Activity } from './src/services/recommendations';
import ActivityHistoryScreen from './src/screens/ActivityHistoryScreen'; // Import the history screen.
import MyActivitiesScreen from './src/screens/MyActivitiesScreen';
import type { PersonalActivity } from './src/services/personalActivities';
import JournalScreen from './src/screens/JournalScreen';

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import type { User } from 'firebase/auth';
import HomeScreen from './src/screens/HomeScreen';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function App() {
  // Stores what the user types.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Controls whether the mood selection screen is visible.
  const [showMoodPreferences, setShowMoodPreferences] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // Control whether history is visible.
  const [showJournal, setShowJournal] = useState(false); // Control journal visibility.

  const [showMyActivities, setShowMyActivities] = useState(false); // Control the personal activity screen.
  // Remember the personal activity while the user selects session preferences.
  const [personalActivity, setPersonalActivity] =
    useState<PersonalActivity | null>(null);

  // Keep the submitted choices while recommendations are visible.
  const [selectedPreferences, setSelectedPreferences] =
    useState<MoodPreferences | null>(null);
  // Store the activity selected for the timer.
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const logoutInProgress = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingSession(false);
    });

    return unsubscribe;
  }, []);

async function handleLogout() {
  if (logoutInProgress.current) return;

  logoutInProgress.current = true;
  setLoggingOut(true);

  try {
    await signOut(auth);

    setEmail('');
    setPassword('');
    setShowPassword(false);
    setShowRegister(false);
    // Return to Home rather than an old screen on the next login.
    setShowMoodPreferences(false); // Close the preference screen.
    setShowHistory(false); // Close activity history.
    setShowJournal(false); // Close the journal before another user signs in.
    setShowMyActivities(false); // Close the personal collection.
    setPersonalActivity(null); // Clear the chosen personal activity.
    setSelectedPreferences(null); // Clear the previous session's choices.
    setActiveActivity(null); // Clear the timer's activity..

    console.info('[Auth] Logout successful');
  } catch (error) {
    const code =
      error instanceof FirebaseError ? error.code : 'unknown';

    console.warn('[Auth] Logout failed:', code);
    Alert.alert('Logout failed', 'Please try again.');
  } finally {
    logoutInProgress.current = false;
    setLoggingOut(false);
  }
}

  const [loggingIn, setLoggingIn] = useState(false);
  const loginInProgress = useRef(false);  
  
async function handleForgotPassword() {
  if (!email.trim()) {
    Alert.alert(
      'Enter your email',
      'Type your email in the Email field, then tap Forgot Password.'
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());

    console.info('[Auth] Password reset request completed');

    Alert.alert(
      'Check your inbox',
      'If this email has an account, you will receive a password-reset link. Check your spam folder too.'
    );
  } catch (error) {
    const code =
      error instanceof FirebaseError ? error.code : 'unknown';

    console.warn('[Auth] Password reset failed:', code);

    const messages: Record<string, string> = {
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/network-request-failed':
        'Check your internet connection and try again.',
      'auth/too-many-requests':
        'Too many attempts. Please try again later.',
    };

    Alert.alert(
      'Unable to request reset',
      messages[code] ?? 'Please try again later.'
    );
  }
}

  async function handleLogin() {
  if (!email.trim() || !password) {
    Alert.alert('Missing details', 'Please enter your email and password.');
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);

    setPassword('');
    console.info('[Auth] Login successful');


  } catch (error) {
    const code =
      error instanceof FirebaseError ? error.code : 'unknown';

    console.warn('[Auth] Login failed:', code);

    Alert.alert(
      'Login failed',
      code === 'auth/network-request-failed'
        ? 'Check your internet connection and try again.'
        : 'Unable to log in. Check your email and password and try again.'
    );
  }
}

if (checkingSession) {
  return (
    <View
      style={[
        styles.container,
        { justifyContent: 'center', alignItems: 'center' },
      ]}
    >
      <StatusBar style="dark" />
      <ActivityIndicator size="large" color="#9657E8" />
      <Text style={{ marginTop: 16, color: '#6D6878' }}>
        Opening MoodMate…
      </Text>
    </View>
  );
}

if (showRegister) {
  return (
    <RegisterScreen onBack={() => setShowRegister(false)} />
  );
}

if (user) {

    // Open the journal when selected from Home.
  if (showJournal) {
    return (
      <JournalScreen
        onBack={() => setShowJournal(false)}
      />
    );
  }

    // Open the user's personal activity collection.
  if (showMyActivities) {
    return (
      <MyActivitiesScreen
        onBack={() => setShowMyActivities(false)}
        onStartActivity={(activity) => {
          setPersonalActivity(activity); // Remember which activity was chosen.
          setSelectedPreferences(null); // Clear any previous session preferences.
          setShowMyActivities(false); // Close the collection.
          setShowMoodPreferences(true); // Ask for the new session's preferences.
        }}
      />
    );
  }
  // Show saved sessions when history is opened.
  if (showHistory) {
    return (
      <ActivityHistoryScreen
        onBack={() => setShowHistory(false)}
      />
    );
  }

  // Show the timer only when an activity and preferences are available.
  if (activeActivity && selectedPreferences) {
    return (
      <ActivitySessionScreen
        key={activeActivity.id}
        activity={activeActivity}
        preferences={selectedPreferences}
        onBack={() => setActiveActivity(null)}
        onComplete={() => {
          // Clear the completed session and return home.
          setActiveActivity(null);
          setSelectedPreferences(null);
          setShowMoodPreferences(false);
          setPersonalActivity(null); // Clear the personal activity after a successful completion.

        }}
      />
    );
  }

  // Display recommendations after the user submits their preferences.
  if (selectedPreferences) {
    return (
      <RecommendationsScreen
        preferences={selectedPreferences}
        onBack={() => setSelectedPreferences(null)}
        onStartActivity={(activity) => setActiveActivity(activity)}
      />
    );
  }

  // Collect preferences before choosing an activity.
    // Collect preferences for either recommendations or a personal activity.
  if (showMoodPreferences) {
    return (
      <MoodPreferencesScreen
        continueLabel={personalActivity ? 'Open activity timer →' : 'Find my activities →'}
        onBack={() => {
          setShowMoodPreferences(false);
          

          if (personalActivity) {
            setPersonalActivity(null); // Cancel starting the personal activity.
            setShowMyActivities(true); // Return to the collection.
          }
        }}
        onContinue={(preferences) => {
          if (
            personalActivity &&
            personalActivity.minutes > preferences.minutes
          ) {
            // The chosen activity must fit the user's available time.
            Alert.alert(
              'More time needed',
              `This activity takes ${personalActivity.minutes} minutes. Choose at least that much available time.`
            );
            return;
          }

          setSelectedPreferences(preferences); // Keep the session's choices.

          if (personalActivity) {
            // Convert the personal activity into the timer's Activity format.
            setActiveActivity({
              id: personalActivity.id,
              title: personalActivity.title,
              description: personalActivity.description,
              minutes: personalActivity.minutes,
              energy: preferences.energy,
              location: preferences.location,
              moods: [preferences.mood],
            });
          }
        }}
      />
    );
  }

  // Show Home when no other signed-in screen is selected.
  return (
    <HomeScreen
      email={user.email}
      onLogout={handleLogout}
      loggingOut={loggingOut}
      onCheckIn={() => setShowMoodPreferences(true)}
      onHistory={() => setShowHistory(true)}
      onMyActivities={() => setShowMyActivities(true)}
      onJournal={() => setShowJournal(true)}
    />
  );
} // End the signed-in screen selection.

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo} accessibilityLabel="Sparkling heart">
              💖
            </Text>

            <Text style={styles.title}>MoodMate</Text>

            <Text style={styles.subtitle}>
              Find the right activity for your mood 💜
            </Text>
          </View>

          <View style={styles.form}>
            {/* Email input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon} accessible={false}>
                ✉
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#777282"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            </View>

            {/* Password input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon} accessible={false}>
                🔒
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#777282"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                accessibilityLabel="Password"
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
                hitSlop={8}
                style={styles.visibilityButton}
              >
                <Text style={styles.visibilityText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Pressable
                style={styles.forgotButton}
                accessibilityRole="button"
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.loginText}>Login</Text>
            </Pressable>

            <Text style={styles.orText}>Or</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setShowRegister(true)}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.createText}>Create Account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFCFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 48,
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  logo: {
    fontSize: 88,
    lineHeight: 120,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#9657E8',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6D6878',
    textAlign: 'center',
    marginTop: 10,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EBFC',
    borderRadius: 24,
    minHeight: 62,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    fontSize: 24,
    color: '#777282',
    marginRight: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 17,
    color: '#302B42',
    paddingVertical: 18,
  },
  visibilityButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#76509E',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 22,
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B832C9',
  },
  loginButton: {
    backgroundColor: '#D63DE6',
    borderRadius: 30,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loginText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orText: {
    fontSize: 16,
    color: '#777282',
    textAlign: 'center',
    marginVertical: 20,
  },
  createButton: {
    backgroundColor: '#F2EBFC',
    borderRadius: 30,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  createText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8950CF',
  },
  pressed: {
    opacity: 0.75,
  },
});