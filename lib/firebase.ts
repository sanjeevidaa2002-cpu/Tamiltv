import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigFile from '../firebase-applet-config.json';

// Support both environment variable overrides and the provisioned firebase-applet-config.json
const resolvedConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigFile.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigFile.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigFile.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigFile.authDomain,
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigFile.firestoreDatabaseId || '(default)',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigFile.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFile.messagingSenderId,
};

if (!resolvedConfig.projectId || !resolvedConfig.apiKey) {
  console.error('Firebase configuration is missing or incomplete. Check environment variables or firebase-applet-config.json.');
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export const ADMIN_PRIMARY_EMAIL = 'titangaming4m@gmail.com';
export const ADMIN_EMAILS = ['titangaming4m@gmail.com', 'titangaming5m@gmail.com', 'sanjeevidaa16@gmail.com'];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase().trim() === cleanEmail);
}

const app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
export const db = getFirestore(app, resolvedConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Recursively strips undefined fields from an object or array.
 * Firestore setDoc / updateDoc rejects objects containing `undefined` values.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    if (typeof (data as any).isEqual === 'function') {
      return data;
    }
    if (Object.prototype.toString.call(data) !== '[object Object]') {
      return data;
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
if (typeof window !== 'undefined') {
  (async function testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firebase client is offline or network is unreachable.');
      }
    }
  })();
}
