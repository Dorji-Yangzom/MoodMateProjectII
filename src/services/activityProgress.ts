import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Activity } from './recommendations';
import type { MoodPreferences } from '../screens/MoodPreferencesScreen';

// Format a date using the phone's local calendar day.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Create this ID once when a new activity session opens.
// Keep the same ID when retrying a failed save.
export function createSessionId(): string {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in first.');
  }

  return doc(
    collection(db, 'users', user.uid, 'completedActivities')
  ).id;
}

// Save history and progress together so neither is saved alone.
export async function saveCompletedActivity(
  sessionId: string,
  activity: Activity,
  preferences: MoodPreferences
): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in first.');
  }

  const profileRef = doc(db, 'users', user.uid);
  const sessionRef = doc(
    db,
    'users',
    user.uid,
    'completedActivities',
    sessionId
  );

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(yesterday);

  return runTransaction(db, async (transaction) => {
    // Read both documents before changing anything.
    const session = await transaction.get(sessionRef);
    const profile = await transaction.get(profileRef);

    // A saved session must never award points twice.
    if (session.exists()) {
      return false;
    }

    if (!profile.exists()) {
      throw new Error('Your profile is missing. Please log in again.');
    }

    const data = profile.data();
    const points = data.points ?? 0;
    const currentStreak = data.currentStreak ?? 0;
    const longestStreak = data.longestStreak ?? 0;
    const lastActiveDate = data.lastActiveDate;

    let nextStreak = 1;

    if (lastActiveDate === todayKey) {
      // Another activity today does not increase the daily streak.
      nextStreak = currentStreak;
    } else if (lastActiveDate === yesterdayKey) {
      // Continue the streak when yesterday was also active.
      nextStreak = currentStreak + 1;
    }

    // Store the completed activity and the selected preferences.
    transaction.set(sessionRef, {
      activityId: activity.id,
      title: activity.title,
      minutes: activity.minutes,
      location: activity.location,
      energy: activity.energy,
      mood: preferences.mood,
      preferences,
      pointsEarned: 10,
      completedDate: todayKey,
      completedAt: serverTimestamp(),
    });

    // Update the user's totals in the same transaction.
    transaction.update(profileRef, {
      points: points + 10,
      currentStreak: nextStreak,
      longestStreak: Math.max(longestStreak, nextStreak),
      lastActiveDate: todayKey,
    });

    return true;
  });
}