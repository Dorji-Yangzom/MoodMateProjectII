import type { User } from 'firebase/auth';
import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export async function ensureUserProfile(user: User): Promise<void> {
  const profileRef = doc(db, 'users', user.uid);

  await runTransaction(db, async (transaction) => {
    const profile = await transaction.get(profileRef);

    // Keep existing progress when the user logs in again.
    if (profile.exists()) return;

    transaction.set(profileRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? '',
      points: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      createdAt: serverTimestamp(),
    });
  });
}