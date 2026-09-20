import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, cleanFirestoreData, OperationType, handleFirestoreError } from './firebase';
import { AuthenticationSettings } from './types';

export const DEFAULT_AUTH_SETTINGS: AuthenticationSettings = {
  googleLoginEnabled: true,
  emailLoginEnabled: true,
  registrationEnabled: true,
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch authentication settings from Firestore.
 * Priority: `settings/authentication` -> `settings/main` -> `DEFAULT_AUTH_SETTINGS`
 */
export async function getAuthSettings(): Promise<AuthenticationSettings> {
  const path = 'settings/authentication';
  try {
    const authSnap = await getDoc(doc(db, 'settings', 'authentication'));
    if (authSnap.exists()) {
      const data = authSnap.data() as Partial<AuthenticationSettings>;
      return {
        ...DEFAULT_AUTH_SETTINGS,
        ...data,
        googleLoginEnabled: data.googleLoginEnabled ?? DEFAULT_AUTH_SETTINGS.googleLoginEnabled,
      };
    }

    // Fallback check in settings/main
    const mainSnap = await getDoc(doc(db, 'settings', 'main'));
    if (mainSnap.exists()) {
      const mainData = mainSnap.data();
      const googleLogin = mainData?.authSettings?.googleLoginEnabled ?? mainData?.googleLoginEnabled ?? true;
      return {
        ...DEFAULT_AUTH_SETTINGS,
        googleLoginEnabled: Boolean(googleLogin),
        emailLoginEnabled: mainData?.authSettings?.emailLoginEnabled ?? true,
        registrationEnabled: mainData?.registrationEnabled ?? true,
      };
    }

    return DEFAULT_AUTH_SETTINGS;
  } catch (error) {
    console.warn('Could not fetch auth settings from Firestore, returning defaults:', error);
    return DEFAULT_AUTH_SETTINGS;
  }
}

/**
 * Update authentication settings in Firestore.
 * Stores in `settings/authentication` and mirrors to `settings/main` for backwards compatibility.
 */
export async function updateAuthSettings(
  updates: Partial<AuthenticationSettings>,
  updatedBy?: string
): Promise<AuthenticationSettings> {
  const path = 'settings/authentication';
  try {
    const now = new Date().toISOString();
    const cleaned = cleanFirestoreData({
      ...updates,
      updatedAt: now,
      ...(updatedBy ? { updatedBy } : {}),
    });

    // 1. Primary write to settings/authentication
    await setDoc(doc(db, 'settings', 'authentication'), cleaned, { merge: true });

    // 2. Synchronize with settings/main to ensure consistency
    try {
      await setDoc(
        doc(db, 'settings', 'main'),
        cleanFirestoreData({
          googleLoginEnabled: updates.googleLoginEnabled,
          authSettings: cleaned,
          updatedAt: now,
        }),
        { merge: true }
      );
    } catch (mirrorErr) {
      console.warn('Could not mirror auth settings to settings/main:', mirrorErr);
    }

    const current = await getAuthSettings();
    return current;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}

/**
 * Subscribe in real-time to authentication settings changes.
 * This guarantees the user panel instantly updates whenever the admin toggles Google Login.
 */
export function subscribeToAuthSettings(
  callback: (settings: AuthenticationSettings) => void
): () => void {
  try {
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'authentication'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<AuthenticationSettings>;
          callback({
            ...DEFAULT_AUTH_SETTINGS,
            ...data,
            googleLoginEnabled: data.googleLoginEnabled ?? DEFAULT_AUTH_SETTINGS.googleLoginEnabled,
          });
        } else {
          // If settings/authentication doesn't exist yet, check settings/main or provide default
          getAuthSettings().then(callback).catch(() => callback(DEFAULT_AUTH_SETTINGS));
        }
      },
      (err) => {
        console.warn('Real-time auth settings listener note:', err);
        // Fallback to one-time fetch
        getAuthSettings().then(callback).catch(() => callback(DEFAULT_AUTH_SETTINGS));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to initialize auth settings snapshot:', err);
    getAuthSettings().then(callback).catch(() => callback(DEFAULT_AUTH_SETTINGS));
    return () => {};
  }
}
