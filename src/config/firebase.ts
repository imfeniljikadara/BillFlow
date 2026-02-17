import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore – getReactNativePersistence exists at runtime in RN builds
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is missing. Please check your .env file.');
}

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with AsyncStorage persistence
let auth: Auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
} catch (e) {
    auth = getAuth(app);
}

// Initialize Firestore
// React Native automatically handles persistence with the default settings in newer SDKs
const db = getFirestore(app);

export { app, auth, db };
