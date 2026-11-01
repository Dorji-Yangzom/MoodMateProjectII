import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Read the activity IDs from the user's last three completed sessions.
// The recommendation function will use these IDs to lower their scores.
export async function getRecentActivityIds(): Promise<string[]> {
  const user = auth.currentUser; // Find the currently signed-in user.

  if (!user) {
    throw new Error('Please sign in to load recent activities.');
  }

  // Look inside this user's completed activity history.
  const historyRef = collection(
    db,
    'users',
    user.uid,
    'completedActivities'
  );

  // Sort newest first and read only three sessions.
  const recentQuery = query(
    historyRef,
    orderBy('completedAt', 'desc'),
    limit(3)
  );

  const snapshot = await getDocs(recentQuery); // Read matching sessions.

  const activityIds = snapshot.docs
    .map((document) => document.data().activityId)
    .filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    ); // Keep only valid activity IDs.

  // Remove duplicate IDs if the same activity appears in several sessions.
  return [...new Set(activityIds)];
}