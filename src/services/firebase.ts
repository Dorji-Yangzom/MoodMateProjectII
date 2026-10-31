import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace this object with your configuration from Firebase Console.
// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmAbA_ChgMJ4dnsleqYEer1ZJa3dXgdAc",
  authDomain: "moodmateprojectii.firebaseapp.com",
  projectId: "moodmateprojectii",
  storageBucket: "moodmateprojectii.firebasestorage.app",
  messagingSenderId: "603479535671",
  appId: "1:603479535671:web:8fb207b737c390870e8fb2"
};

// Initialize Firebase


// Reuse the Firebase app during development reloads.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function setupAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fast Refresh may have already initialised authentication.
    if (
      error instanceof FirebaseError &&
      error.code === 'auth/already-initialized'
    ) {
      return getAuth(app);
    }

    throw error;
  }
}

export const auth = setupAuth();
export const db = getFirestore(app);