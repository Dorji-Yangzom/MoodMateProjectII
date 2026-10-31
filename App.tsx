import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/services/firebase';
import RegisterScreen from './src/screens/RegisterScreen';
import { FirebaseError } from 'firebase/app';

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
  return (
    <HomeScreen
      email={user.email}
      onLogout={handleLogout}
      loggingOut={loggingOut}
    />
  );
}

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