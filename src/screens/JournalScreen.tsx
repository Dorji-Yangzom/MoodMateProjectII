import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FirebaseError } from 'firebase/app';
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
import {
  addJournalEntry,
  createJournalId,
  deleteJournalEntry,
  listenToJournal,
  updateJournalEntry,
} from '../services/journal';
import type { JournalEntry, JournalInput } from '../services/journal';

type Props = {
  onBack: () => void; // Ask App.tsx to return Home.
};

const moods: JournalInput['mood'][] = [
  'Happy',
  'Calm',
  'Sad',
  'Stressed',
  'Bored',
];

export default function JournalScreen({ onBack }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mood, setMood] = useState<JournalInput['mood']>('Calm');
  const [text, setText] = useState(''); // Store the current draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const writing = useRef(false); // Block repeated taps immediately.
  const draftId = useRef<string | null>(null); // Keep the ID on save retries.
  const scrollRef = useRef<ScrollView>(null); // Scroll to the form when editing.

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    setLoading(true);
    setError('');

    try {
      unsubscribe = listenToJournal(
        (items) => {
          if (!active) return;

          setEntries(items);
          setLoading(false);
        },
        () => {
          if (!active) return;

          setError('Could not load your journal. Please try again.');
          setLoading(false);
        }
      );
    } catch {
      setError('Please sign in to open your journal.');
      setLoading(false);
    }

    return () => {
      active = false; // Ignore results after this screen closes.
      unsubscribe?.(); // Stop listening to Firebase.
    };
  }, [retryCount]);

  function resetForm() {
    setText('');
    setMood('Calm');
    setEditingId(null); // Return to creating a new entry.
    draftId.current = null; // The next entry will receive a new ID.
  }

  function handleEdit(entry: JournalEntry) {
    if (writing.current) return;

    setEditingId(entry.id);
    setMood(entry.mood);
    setText(entry.text);
    draftId.current = null;

    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  async function handleSave() {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);

    try {
      const input = { mood, text };

      if (editingId) {
        await updateJournalEntry(editingId, input);
      } else {
        if (!draftId.current) {
          draftId.current = createJournalId(); // Generate once per new draft.
        }

        // Save the entry and daily streak in the same transaction.
        await addJournalEntry(draftId.current, input);
      }

      resetForm(); // Clear the draft only after the save succeeds.
      console.info('[Journal] Entry saved');
    } catch (failure) {
      console.warn(
        '[Journal] Save failed:',
        failure instanceof FirebaseError ? failure.code : 'validation'
      );

      Alert.alert(
        'Could not save entry',
        failure instanceof FirebaseError
          ? 'Check your connection and try again.'
          : failure instanceof Error
            ? failure.message
            : 'Please try again.'
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    if (writing.current) return;

    writing.current = true;
    setBusy(true);

    try {
      await deleteJournalEntry(id);

      if (editingId === id) {
        resetForm(); // Stop editing an entry that no longer exists.
      }
    } catch (failure) {
      console.warn(
        '[Journal] Delete failed:',
        failure instanceof FirebaseError ? failure.code : 'unknown'
      );

      Alert.alert('Could not delete entry', 'Please try again.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function handleDelete(entry: JournalEntry) {
    if (writing.current) return;

    Alert.alert(
      'Delete journal entry?',
      'This removes the entry. Your earned active-day credit stays unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void removeEntry(entry.id);
          },
        },
      ]
    );
  }

  function handleBack() {
    if (writing.current) return; // Wait for the current save or delete.

    if (text.trim()) {
      // Ask before discarding text that has not been saved.
      Alert.alert('Leave journal?', 'Your unsaved draft will be discarded.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onBack },
      ]);
      return;
    }

    onBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={handleBack}
          disabled={busy}
          accessibilityRole="button"
          style={styles.linkButton}
        >
          <Text style={styles.link}>← Back to Home</Text>
        </Pressable>

        <Text style={styles.title}>My mood journal 🌷</Text>
        <Text style={styles.subtitle}>
          A little space for your thoughts. Write what feels right.
        </Text>

        {/* The same form handles creating and editing entries. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {editingId ? 'Edit your entry' : 'How are you feeling?'}
          </Text>

          <View style={styles.choices}>
            {moods.map((item) => (
              <Pressable
                key={item}
                onPress={() => setMood(item)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: mood === item }}
                style={[
                  styles.choice,
                  mood === item && styles.selectedChoice,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    mood === item && styles.selectedText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What is on your mind today?"
            placeholderTextColor="#81778D"
            multiline
            maxLength={2000}
            editable={!busy}
            accessibilityLabel="Journal entry"
            style={styles.input}
          />

          <Text style={styles.note}>{text.length}/2000 characters</Text>

          <Pressable
            onPress={handleSave}
            disabled={busy}
            accessibilityRole="button"
            style={[styles.button, busy && styles.dimmed]}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Please wait...' : editingId ? 'Save changes' : 'Save entry'}
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

          <Text style={styles.note}>
            A new entry counts toward your daily streak. No points are added.
          </Text>
        </View>

        <Text style={styles.cardTitle}>Your recent entries</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#8950CF" />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.body}>{error}</Text>
            <Pressable
              onPress={() => setRetryCount((count) => count + 1)}
              accessibilityRole="button"
              style={styles.linkButton}
            >
              <Text style={styles.link}>Try again</Text>
            </Pressable>
          </View>
        ) : entries.length === 0 ? (
          <Text style={styles.body}>
            Your journal is empty. Start with a few words above.
          </Text>
        ) : (
          <>
            <Text style={styles.note}>Showing your latest 50 entries.</Text>

            {entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.note}>
                  {entry.createdAt
                    ? entry.createdAt.toLocaleString()
                    : 'Date unavailable'}
                </Text>

                <Text style={styles.cardTitle}>{entry.mood}</Text>
                <Text style={styles.body}>{entry.text}</Text>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleEdit(entry)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={styles.linkButton}
                  >
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(entry)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={styles.linkButton}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
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
    color: '#302B42',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: '#81778D',
    marginTop: 10,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#F8EFF8',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#493655',
    marginBottom: 12,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  choice: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedChoice: {
    backgroundColor: '#8950CF',
  },
  choiceText: {
    color: '#795891',
    fontWeight: '600',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#302B42',
    minHeight: 150,
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
  note: {
    fontSize: 12,
    lineHeight: 19,
    color: '#94869F',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#D63DE6',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  link: {
    color: '#8950CF',
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    color: '#6D6878',
    fontSize: 15,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 12,
  },
  deleteText: {
    color: '#B83264',
    fontSize: 14,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.6,
  },
});