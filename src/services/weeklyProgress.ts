import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { JournalInput } from './journal';

// Each day has either a saved mood or no journal entry.
export type DailyMood = {
  dateKey: string;
  label: string;
  mood: JournalInput['mood'] | null;
};

// Format dates using the phone's local calendar.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function getWeeklyMoods(): Promise<DailyMood[]> {
  const user = auth.currentUser; // Read only the signed-in user's data.

  if (!user) {
    throw new Error('Please sign in to view your progress.');
  }

  const now = new Date();
  const start = new Date(now);

  start.setDate(start.getDate() - 6); // Include today and six previous days.
  start.setHours(0, 0, 0, 0); // Begin at local midnight.

  // Create all seven days first, including days without journal entries.
  const days: DailyMood[] = [];

    // Create one item for each of the last seven days.
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start); // Copy the starting date.
    date.setDate(start.getDate() + index); // Move to this day.

    days.push({
      dateKey: getDateKey(date), // Match journal entries to this day.

      // Show only the day name: Mon, Tue, Wed, etc.
      label: date.toLocaleDateString('en-GB', {
        weekday: 'short',
      }),

      mood: null, // Keep this day empty until an entry is found.
    });
  }

  // Read this week's entries, newest first.
  const weeklyQuery = query(
    collection(db, 'users', user.uid, 'journalEntries'),
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<=', Timestamp.fromDate(now)),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(weeklyQuery);
  const validMoods = ['Happy', 'Calm', 'Sad', 'Stressed', 'Bored'];

  for (const document of snapshot.docs) {
    const entry = document.data();

    // Ignore incomplete or unexpected data.
    if (
      !(entry.createdAt instanceof Timestamp) ||
      !validMoods.includes(entry.mood)
    ) {
      continue;
    }

    const dateKey = getDateKey(entry.createdAt.toDate());
    const day = days.find((item) => item.dateKey === dateKey);

    // Entries are newest first, so the first one found wins for that day.
    if (day && day.mood === null) {
      day.mood = entry.mood;
    }
  }

  return days; // Return the seven days from oldest to newest.
}