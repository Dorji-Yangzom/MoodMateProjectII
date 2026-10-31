import { useRef, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
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
import { auth } from '../services/firebase';

type Props = {
  onBack: () => void;
};

export default function RegisterScreen({ onBack }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Prevents repeated taps from sending multiple requests.
  const submitting = useRef(false);

  async function handleRegister() {
    if (submitting.current) return;

    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert('Missing details', 'Please complete all fields.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please check both passwords.');
      return;
    }

    submitting.current = true;
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (error) {
      const code =
        error instanceof FirebaseError ? error.code : 'unknown';

      console.warn('[Auth] Registration failed:', code);

      const messages: Record<string, string> = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/email-already-in-use':
          'This email is already registered. Please log in.',
        'auth/weak-password':
          'Please choose a stronger password.',
        'auth/password-does-not-meet-requirements':
          'Your password does not meet the password requirements.',
        'auth/network-request-failed':
          'Check your internet connection and try again.',
        'auth/too-many-requests':
          'Too many attempts. Please try again later.',
      };

      Alert.alert(
        'Registration failed',
        messages[code] ?? 'Unable to create your account. Please try again.'
      );

      submitting.current = false;
      setLoading(false);
      return;
    }

    // Registration signs the user in automatically.
    // Sign out so they can log in through our login screen.
    try {
      await signOut(auth);
    } catch (error) {
      const code =
        error instanceof FirebaseError ? error.code : 'unknown';

      console.warn('[Auth] Sign-out after registration failed:', code);
    }

    submitting.current = false;
    setLoading(false);
    setPassword('');
    setConfirmPassword('');

    console.info('[Auth] Account created successfully');

    Alert.alert(
      'Account created',
      'Your account is ready. You can now log in.',
      [{ text: 'Go to Login', onPress: onBack }],
      { cancelable: false }
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.logo}>💖</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start your journey with MoodMate
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#777282"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
            accessibilityLabel="Email address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor="#777282"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!loading}
            accessibilityLabel="Password"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password again"
            placeholderTextColor="#777282"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            accessibilityLabel="Confirm password"
          />

          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            disabled={loading}
            accessibilityRole="button"
            style={styles.linkButton}
          >
            <Text style={styles.link}>
              {showPassword ? 'Hide passwords' : 'Show passwords'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              (pressed || loading) && styles.dimmed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onBack}
            disabled={loading}
            accessibilityRole="button"
            style={styles.backButton}
          >
            <Text style={styles.link}>
              Already have an account? Log in
            </Text>
          </Pressable>
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
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 48,
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  logo: {
    fontSize: 66,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
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
    marginBottom: 30,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#302B42',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2EBFC',
    borderRadius: 22,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: '#302B42',
    marginBottom: 16,
  },
  linkButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 12,
  },
  link: {
    color: '#8950CF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#D63DE6',
    borderRadius: 30,
    minHeight: 56,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 16,
  },
  dimmed: {
    opacity: 0.65,
  },
});