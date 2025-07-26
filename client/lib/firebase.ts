import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDugV_R8dorCr1AggqNHB_1AeqjfgEgyDQ",
  authDomain: "secteur-14f7c.firebaseapp.com",
  projectId: "secteur-14f7c",
  storageBucket: "secteur-14f7c.firebasestorage.app",
  messagingSenderId: "383672334515",
  appId: "1:383672334515:web:cabe7d65ba7d598b1718c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with better error handling
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Enable offline persistence
const initializeOfflineSupport = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('Firebase offline persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firebase persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firebase persistence not supported in this browser');
    } else {
      console.warn('Firebase persistence error:', err);
    }
  }
};

// Initialize offline support
initializeOfflineSupport();

// Network status monitoring with retry
export const checkFirebaseConnection = async (retries = 3): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      await enableNetwork(db);
      return true;
    } catch (error) {
      console.warn(`Firebase connection attempt ${i + 1}/${retries} failed:`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  return false;
};

// Enhanced network error handling
export const handleNetworkError = (error: any): string => {
  // Check for specific Firebase errors
  if (error.code === 'unavailable') {
    return 'Service Firebase temporairement indisponible. Vos données sont sauvegardées localement et seront synchronisées automatiquement.';
  }

  if (error.code === 'permission-denied') {
    return 'Accès refusé. Veuillez vérifier vos permissions ou vous reconnecter.';
  }

  if (error.code === 'unauthenticated') {
    return 'Session expirée. Veuillez vous reconnecter.';
  }

  // Check for network issues
  if (error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('fetch')) {
    if (!navigator.onLine) {
      return 'Connexion Internet interrompue. Vos modifications seront sauvegardées automatiquement dès que la connexion sera rétablie.';
    }
    return 'Problème de connexion réseau. Veuillez vérifier votre connexion Internet. Les données sont sauvegardées localement.';
  }

  // Generic error handling
  return error.message || 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
};

// Network status monitoring
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Connection quality checker
export const checkConnectionQuality = async (): Promise<'good' | 'poor' | 'offline'> => {
  if (!navigator.onLine) {
    return 'offline';
  }

  try {
    const start = Date.now();
    await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    const duration = Date.now() - start;
    return duration < 1000 ? 'good' : 'poor';
  } catch {
    return 'poor';
  }
};

export default app;
