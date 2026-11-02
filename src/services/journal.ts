import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { MoodPreferences } from '../screens/MoodPreferencesScreen';

// Reuse the same mood choices as the preference screen.
export type JournalInput = {
  mood: MoodPreferences['mood'];
  text: string;
};

// Saved entries also include an ID and creation date.
export type JournalEntry = JournalInput & {
  id: string;
  createdAt: Date | null;
};

// Find the signed-in account before accessing private journal data.
function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in to use your journal.');
  }

  return user;
}

// Use the phone's local calendar date, just like activity completion.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Check the entry before sending it to Firebase.
function validateEntry(input: JournalInput): JournalInput {
  const text = input.text.trim(); // Remove surrounding spaces.
  const moods = ['Happy', 'Calm', 'Sad', 'Stressed', 'Bored'];

  if (!moods.includes(input.mood)) {
    throw new Error('Please select a mood.');
  }

  if (!text || text.length > 2000) {
    throw new Error('Write between 1 and 2000 characters.');
  }

  return { mood: input.mood, text };
}

// Generate one ID for a new entry and keep it when retrying a save.
export function createJournalId(): string {
  const user = requireUser();

  return doc(
    collection(db, 'users', user.uid, 'journalEntries')
  ).id;
}

// Save a new entry and its streak update together.
// Return false when this entry ID has already been saved.
export async function addJournalEntry(
  id: string,
  input: JournalInput
): Promise<boolean> {
  const user = requireUser();
  const entry = validateEntry(input);

  const entryRef = doc(db, 'users', user.uid, 'journalEntries', id);
  const profileRef = doc(db, 'users', user.uid);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(yesterday);

  return runTransaction(db, async (transaction) => {
    // Read before writing so Firebase can retry safely if data changes.
    const existingEntry = await transaction.get(entryRef);
    const profile = await transaction.get(profileRef);

    if (existingEntry.exists()) {
      return false; // A retry must not count this entry again.
    }

    if (!profile.exists()) {
      throw new Error('Your profile is missing. Please log in again.');
    }

    const data = profile.data();
    const currentStreak = data.currentStreak ?? 0;
    const longestStreak = data.longestStreak ?? 0;
    let nextStreak = 1; // Start again if no activity was recorded yesterday.

    if (data.lastActiveDate === todayKey) {
      // An activity or journal already counted today.
      nextStreak = currentStreak;
    } else if (data.lastActiveDate === yesterdayKey) {
      nextStreak = currentStreak + 1; // Continue consecutive active days.
    }

    transaction.set(entryRef, {
      ...entry,
      createdDate: todayKey, // Keep the original local day of this entry.
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Share the streak with activities, without changing points.
    transaction.update(profileRef, {
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      lastActiveDate: todayKey,
    });

    return true;
  });
}

// Edit the mood and text without changing the original creation date.
// Editing an old entry does not count as a new daily journal.
export async function updateJournalEntry(
  id: string,
  input: JournalInput
): Promise<void> {
  const user = requireUser();
  const entry = validateEntry(input);

  await updateDoc(
    doc(db, 'users', user.uid, 'journalEntries', id),
    {
      ...entry,
      updatedAt: serverTimestamp(),
    }
  );
}

// Remove the journal content.
// The previously earned active-day credit remains unchanged.
export async function deleteJournalEntry(id: string): Promise<void> {
  const user = requireUser();

  await deleteDoc(
    doc(db, 'users', user.uid, 'journalEntries', id)
  );
}

// Read the newest 50 entries and refresh the screen when they change.
// The screen must call the returned function when it closes.
export function listenToJournal(
  onChange: (entries: JournalEntry[]) => void,
  onError: (error: Error) => void
): () => void {
  const user = requireUser();

  const journalQuery = query(
    collection(db, 'users', user.uid, 'journalEntries'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    journalQuery,
    (snapshot) => {
      const entries = snapshot.docs.map((document): JournalEntry => {
        const data = document.data();

        return {
          id: document.id,
          mood: data.mood,
          text: data.text ?? '',
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : null,
        };
      });

      onChange(entries); // Send the latest entries to the screen.
    },
    (error) => onError(error)
  );
}