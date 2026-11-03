import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
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
import { FirebaseError } from 'firebase/app';
import {
  addPersonalActivity,
  createPersonalActivityId,
  deletePersonalActivity,
  listenToPersonalActivities,
  updatePersonalActivity,
} from '../services/personalActivities';
import type { PersonalActivity } from '../services/personalActivities';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  onBack: () => void; // Return to Home.
  onStartActivity: (activity: PersonalActivity) => void; // Pass the chosen activity to App.
};

export default function MyActivitiesScreen({
  onBack,
  onStartActivity,
}: Props) {

    // Match the form and activity cards to the selected theme.
  const { isDark, colours } = useTheme();
  const styles = createStyles(colours, isDark);

  const [activities, setActivities] = useState<PersonalActivity[]>([]);
  const [loading, setLoading] = useState(true); // Track the initial list load.
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const [title, setTitle] = useState(''); // Store the form's title.
  const [description, setDescription] = useState('');
  const [minutes, setMinutes] = useState('5'); // TextInput stores text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); // Disable controls during a write.

  const writing = useRef(false); // Block repeated taps immediately.
  const newActivityId = useRef<string | null>(null); // Reuse an ID on retry.

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    setLoading(true);
    setLoadError('');

    try {
      // Refresh the list whenever this user's activities change.
      unsubscribe = listenToPersonalActivities(
        (items) => {
          if (!active) return;

          setActivities(items);
          setLoading(false);
        },
        (error) => {
          if (!active) return;

          console.warn('[My Activities] Load failed:', error.message);
          setLoadError('Could not load your activities.');
          setLoading(false);
        }
      );
    } catch (error) {
      setLoadError('Please sign in to view your activities.');
      setLoading(false);
    }

    return () => {
      active = false; // Ignore results after leaving the screen.
      unsubscribe?.(); // Stop the Firebase listener.
    };
  }, [retryCount]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setMinutes('5');
    setEditingId(null); // Switch the form back to Add mode.
    newActivityId.current = null; // The next new activity needs a new ID.
  }

  function handleEdit(activity: PersonalActivity) {
    if (writing.current) return;

    // Copy the selected activity into the same form used for adding.
    setEditingId(activity.id);
    setTitle(activity.title);
    setDescription(activity.description);
    setMinutes(String(activity.minutes));
    newActivityId.current = null;
  }

  async function handleSave() {
    if (writing.current) return;

    writing.current = true; // Lock immediately before starting the request.
    setBusy(true);

    try {
      const input = {
        title,
        description,
        minutes: Number(minutes), // Convert the entered text to a number.
      };

      if (editingId) {
        await updatePersonalActivity(editingId, input);
      } else {
        // Generate the ID once and keep it if the request needs retrying.
        if (!newActivityId.current) {
          newActivityId.current = createPersonalActivityId();
        }

        await addPersonalActivity(newActivityId.current, input);
      }

      resetForm(); // Clear the form only after Firebase confirms success.
      console.info('[My Activities] Activity saved');
    } catch (error) {
      console.warn(
        '[My Activities] Save failed:',
        error instanceof FirebaseError ? error.code : 'validation'
      );

      Alert.alert(
        'Could not save',
        error instanceof FirebaseError
          ? 'Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'Please try again.'
      );
    } finally {
      writing.current = false; // Allow another action after the request.
      setBusy(false);
    }
  }

  async function removeActivity(id: string) {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);

    try {
      await deletePersonalActivity(id);

      if (editingId === id) {
        resetForm(); // Stop editing if that activity was deleted.
      }

      console.info('[My Activities] Activity deleted');
    } catch (error) {
      console.warn(
        '[My Activities] Delete failed:',
        error instanceof FirebaseError ? error.code : 'unknown'
      );

      Alert.alert('Could not delete', 'Please try again.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function handleDelete(activity: PersonalActivity) {
    if (writing.current) return;

    // Ask before deleting so an accidental tap does not remove an activity.
    Alert.alert(
      'Delete activity?',
      `Delete "${activity.title}"? Your completed history will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void removeActivity(activity.id);
          },
        },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={onBack}
          disabled={busy}
          accessibilityRole="button"
          style={styles.linkButton}
        >
          <Text style={styles.link}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.title}>My activities 🌷</Text>
        <Text style={styles.subtitle}>
          Keep a little collection of things you enjoy.
        </Text>

        {/* One form handles both creating and editing activities. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editingId ? 'Edit activity' : 'Add an activity'}
          </Text>

          <Text style={styles.label}>Activity title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="For example, read a favourite book"
            placeholderTextColor={colours.muted}
            maxLength={80}
            editable={!busy}
            accessibilityLabel="Activity title"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="What would you like to do?"
            placeholderTextColor="#81778D"
            multiline
            maxLength={500}
            editable={!busy}
            accessibilityLabel="Activity description"
          />

          <Text style={styles.label}>Duration: 1–120 minutes</Text>
          <TextInput
            style={styles.input}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={3}
            editable={!busy}
            accessibilityLabel="Duration in minutes"
          />

          <Pressable
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.button, busy && styles.dimmed]}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Please wait...' : editingId ? 'Save changes' : 'Add activity'}
            </Text>
          </Pressable>

          {editingId && (
            <Pressable
              onPress={resetForm}
              disabled={busy}
              accessibilityRole="button"
              style={styles.linkButton}
            >
              <Text style={styles.link}>Cancel editing</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.cardTitle}>Your collection</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colours.primary} />
        ) : loadError ? (
          <View style={styles.card}>
            <Text style={styles.description}>{loadError}</Text>
            <Pressable
              onPress={() => setRetryCount((count) => count + 1)}
              accessibilityRole="button"
              style={styles.linkButton}
            >
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : activities.length === 0 ? (
          <Text style={styles.description}>
            No personal activities yet. Add your first one above.
          </Text>
        ) : (
          activities.map((activity) => (
            <View key={activity.id} style={styles.card}>
              <Text style={styles.cardTitle}>{activity.title}</Text>
              <Text style={styles.link}>{activity.minutes} min</Text>

              {!!activity.description && (
                <Text style={styles.description}>
                  {activity.description}
                </Text>
              )}

              {/* Choose this activity and open the session preferences. */}
              <Pressable
                    onPress={() => onStartActivity(activity)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={[styles.button, { marginTop: 16 }, busy && styles.dimmed]}
                >
                    <Text style={styles.buttonText}>Start activity →</Text>
                </Pressable>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleEdit(activity)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${activity.title}`}
                  style={styles.linkButton}
                >
                  <Text style={styles.link}>Edit</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleDelete(activity)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${activity.title}`}
                  style={styles.linkButton}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Shared colours adapt the screen to light and dark appearance.
const createStyles = (
  colours: ReturnType<typeof useTheme>['colours'],
  isDark: boolean
) =>
  StyleSheet.create({
    // Main screen spacing.
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
      marginBottom: 24,
    },

    // Form and saved activity cards.
    card: {
      backgroundColor: colours.lavender,
      padding: 20,
      borderRadius: 24,
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colours.text,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colours.text,
      marginBottom: 8,
    },

    // Title, description and duration inputs.
    input: {
      backgroundColor: colours.input,
      color: colours.text,
      borderRadius: 16,
      padding: 14,
      fontSize: 15,
      minHeight: 50,
      marginBottom: 16,
    },
    multiline: {
      minHeight: 90,
      textAlignVertical: 'top',
    },

    // Save and start buttons.
    button: {
      backgroundColor: colours.primary,
      padding: 16,
      borderRadius: 22,
      alignItems: 'center',
    },
    buttonText: {
      color: colours.buttonText,
      fontSize: 16,
      fontWeight: '700',
    },

    // Back, retry and edit links.
    linkButton: {
      minHeight: 44,
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    link: {
      color: colours.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    description: {
      fontSize: 14,
      lineHeight: 23,
      color: colours.muted,
      marginTop: 8,
    },

    // Actions below each saved activity.
    actions: {
      flexDirection: 'row',
      gap: 28,
      marginTop: 10,
    },
    deleteText: {
      color: isDark ? '#FF9DB8' : '#B83264',
      fontSize: 14,
      fontWeight: '600',
    },
    dimmed: {
      opacity: 0.6,
    },
  });