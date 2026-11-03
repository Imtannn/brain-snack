import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

export type FirebaseWebConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

function envValue(name: (typeof ENV_KEYS)[number]): string {
  const value = import.meta.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

/** Returns the web config when every required Vite variable is set. */
export function readFirebaseConfig(): FirebaseWebConfig | null {
  const config: FirebaseWebConfig = {
    apiKey: envValue('VITE_FIREBASE_API_KEY'),
    authDomain: envValue('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: envValue('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: envValue('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: envValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: envValue('VITE_FIREBASE_APP_ID'),
  }
  const complete = ENV_KEYS.every((key) => {
    const value = config[envKeyToField(key)]
    return value.length > 0
  })
  return complete ? config : null
}

function envKeyToField(key: (typeof ENV_KEYS)[number]): keyof FirebaseWebConfig {
  switch (key) {
    case 'VITE_FIREBASE_API_KEY':
      return 'apiKey'
    case 'VITE_FIREBASE_AUTH_DOMAIN':
      return 'authDomain'
    case 'VITE_FIREBASE_PROJECT_ID':
      return 'projectId'
    case 'VITE_FIREBASE_STORAGE_BUCKET':
      return 'storageBucket'
    case 'VITE_FIREBASE_MESSAGING_SENDER_ID':
      return 'messagingSenderId'
    case 'VITE_FIREBASE_APP_ID':
      return 'appId'
  }
}

export function firebaseConfigured(): boolean {
  return readFirebaseConfig() !== null
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (app) return app
  const config = readFirebaseConfig()
  if (!config) throw new Error('Firebase is not configured')
  const existing = getApps()[0]
  app = existing ?? initializeApp(config)
  return app
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp())
}
