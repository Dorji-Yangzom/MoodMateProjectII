import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Describe the fields entered in the activity form.
export type PersonalActivityInput = {
  title: string;
  description: string;
  minutes: number;
};

// A saved activity also has its own Firebase document ID.
export type PersonalActivity = PersonalActivityInput & {
  id: string;
};

// Find the signed-in user's personal activity collection.
function getActivitiesCollection() {
  const user = auth.currentUser; // Read the current account.

  if (!user) {
    throw new Error('Please sign in to manage your activities.');
  }

  return collection(db, 'users', user.uid, 'activities');
}

// Check the input before creating or updating an activity.
function validateActivity(input: PersonalActivityInput) {
  const title = input.title.trim(); // Remove spaces at both ends.
  const description = input.description.trim();

  if (!title || title.length > 80) {
    throw new Error('Enter an activity title between 1 and 80 characters.');
  }

  if (description.length > 500) {
    throw new Error('Keep the description within 500 characters.');
  }

  // Accept whole minutes only, between 1 minute and 2 hours.
  if (
    !Number.isInteger(input.minutes) ||
    input.minutes < 1 ||
    input.minutes > 120
  ) {
    throw new Error('Enter a whole number of minutes from 1 to 120.');
  }

  return { title, description, minutes: input.minutes };
}

// Generate an ID once for a new form.
// Reusing this ID lets a retry save to the same document.
export function createPersonalActivityId(): string {
  return doc(getActivitiesCollection()).id;
}

// Create a personal activity using the ID generated for its form.
export async function addPersonalActivity(
  id: string,
  input: PersonalActivityInput
): Promise<void> {
  const activity = validateActivity(input); // Check and clean the input.
  const activityRef = doc(getActivitiesCollection(), id);

  await setDoc(activityRef, {
    ...activity,
    createdAt: serverTimestamp(), // Record when Firebase saves it.
    updatedAt: serverTimestamp(),
  });
}

// Edit an existing activity without changing its document ID.
export async function updatePersonalActivity(
  id: string,
  input: PersonalActivityInput
): Promise<void> {
  const activity = validateActivity(input);
  const activityRef = doc(getActivitiesCollection(), id);

  await updateDoc(activityRef, {
    ...activity,
    updatedAt: serverTimestamp(), // Record the latest edit.
  });
}

// Delete only the selected personal activity.
// Completed session history is stored separately and remains available.
export async function deletePersonalActivity(id: string): Promise<void> {
  const activityRef = doc(getActivitiesCollection(), id);

  await deleteDoc(activityRef);
}

// Listen for changes so the list refreshes after adding, editing or deleting.
// Return the unsubscribe function so the screen can stop listening on exit.
export function listenToPersonalActivities(
  onChange: (activities: PersonalActivity[]) => void,
  onError: (error: Error) => void
): () => void {
  const activitiesQuery = query(
    getActivitiesCollection(),
    orderBy('createdAt', 'desc') // Display newest activities first.
  );

  return onSnapshot(
    activitiesQuery,
    (snapshot) => {
      const activities = snapshot.docs.map(
        (document): PersonalActivity => {
          const data = document.data(); // Read this document's fields.

          return {
            id: document.id,
            title: data.title ?? '',
            description: data.description ?? '',
            minutes: data.minutes ?? 0,
          };
        }
      );

      onChange(activities); // Pass the updated list to the screen.
    },
    (error) => onError(error) // Let the screen display loading failures.
  );
}