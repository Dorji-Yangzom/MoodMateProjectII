import type { User } from 'firebase/auth';
import {
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
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

// Update only the profile name, preserving points and streaks.
export async function updateProfileName(
  user: User,
  name: string
): Promise<void> {
  const trimmedName = name.trim(); // Remove surrounding spaces.

  // Require a readable name before sending anything to Firebase.
  if (trimmedName.length === 0) {
    throw new Error('Please enter your name.');
  }

  if (trimmedName.length > 50) {
    throw new Error('Please keep your name within 50 characters.');
  }

  const profileRef = doc(db, 'users', user.uid);

  // Store the name in Firestore, where our profile screen will read it.
  await updateDoc(profileRef, {
    displayName: trimmedName,
    updatedAt: serverTimestamp(),
  });
}