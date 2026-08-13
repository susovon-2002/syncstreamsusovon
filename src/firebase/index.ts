'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let cachedSdks: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

/**
 * Initializes Firebase SDKs. 
 * Now allows initialization on the server to prevent SSR crashes in 'use client' components.
 */
export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  const apps = getApps();
  let firebaseApp: FirebaseApp;

  if (apps.length > 0) {
    firebaseApp = apps[0];
  } else {
    // Use explicit config for all environments (Vercel, App Hosting, local)
    if (firebaseConfig && firebaseConfig.apiKey) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      // Fallback to auto-init if config is missing (unlikely in this setup)
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        console.error("Firebase initialization failed: No config provided.", e);
        throw e;
      }
    }
  }

  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };

  return cachedSdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
