import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
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

  function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    Alert.alert(
      'Interface ready',
      'We will connect this button to Firebase Authentication next.'
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
              onPress={() =>
                Alert.alert(
                  'Forgot Password',
                  'Password reset will be connected to Firebase next.'
                )
              }
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
              onPress={() =>
                Alert.alert(
                  'Create Account',
                  'We will build the registration screen next.'
                )
              }
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