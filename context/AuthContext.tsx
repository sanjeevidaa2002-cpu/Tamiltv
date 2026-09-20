'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isUserAdmin, cleanFirestoreData } from '@/lib/firebase';
import { AuthenticationSettings } from '@/lib/types';
import { getAuthSettings, subscribeToAuthSettings, DEFAULT_AUTH_SETTINGS } from '@/lib/authSettingsService';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  googleLoginEnabled: boolean;
  authSettings: AuthenticationSettings;
  authSettingsLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'forgot';
  openAuthModal: (mode?: 'login' | 'signup' | 'forgot', redirectVideoId?: string) => void;
  closeAuthModal: () => void;
  redirectVideoId: string | null;
  clearRedirectVideoId: () => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  registerWithEmail: (e: string, p: string, name: string) => Promise<void>;
  loginAsDemo: (role?: 'user' | 'admin') => Promise<void>;
  logout: () => Promise<void>;
  sendResetEmail: (e: string) => Promise<void>;
  claimAdminAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [googleLoginEnabled, setGoogleLoginEnabled] = useState<boolean>(true);
  const [authSettings, setAuthSettings] = useState<AuthenticationSettings>(DEFAULT_AUTH_SETTINGS);
  const [authSettingsLoading, setAuthSettingsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [redirectVideoId, setRedirectVideoId] = useState<string | null>(null);

  // Real-time listener for Authentication Settings (e.g. googleLoginEnabled toggle)
  useEffect(() => {
    const unsubscribeAuthSettings = subscribeToAuthSettings((settings) => {
      setAuthSettings(settings);
      setGoogleLoginEnabled(settings.googleLoginEnabled);
      setAuthSettingsLoading(false);
    });

    return () => unsubscribeAuthSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Verify admin status
        let adminStatus = false;
        if (currentUser.email && isUserAdmin(currentUser.email)) {
          adminStatus = true;
          // Auto-persist admin record in Firestore
          try {
            await setDoc(
              doc(db, 'admins', currentUser.uid),
              cleanFirestoreData({
                uid: currentUser.uid,
                email: currentUser.email,
                role: 'superadmin',
                createdAt: new Date().toISOString(),
              }),
              { merge: true }
            );
          } catch (e) {
            console.warn('Admin record sync note:', e);
          }
        } else {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists()) {
              adminStatus = true;
            }
          } catch (e) {
            console.warn('Could not check admin document:', e);
          }
        }
        setIsAdmin(adminStatus);

        // Sync user profile in Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          const now = new Date().toISOString();
          const userProfileData: Record<string, any> = {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            photoURL: currentUser.photoURL || '',
            lastLogin: now,
            lastLoginAt: now,
          };

          if (!userDocSnap.exists() || !userDocSnap.data()?.createdAt) {
            userProfileData.createdAt = now;
          }

          await setDoc(userDocRef, cleanFirestoreData(userProfileData), { merge: true });
        } catch (e) {
          console.warn('Could not sync user profile:', e);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openAuthModal = (mode: 'login' | 'signup' | 'forgot' = 'login', targetVideoId?: string) => {
    setAuthModalMode(mode);
    if (targetVideoId) {
      setRedirectVideoId(targetVideoId);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const clearRedirectVideoId = () => {
    setRedirectVideoId(null);
  };

  const loginWithGoogle = async () => {
    // 1. Application-level check: Verify Google Login is enabled in local state
    if (!googleLoginEnabled) {
      const err = new Error('Google Login is currently disabled by the administrator. Please use email and password.');
      (err as any).code = 'auth/google-disabled';
      throw err;
    }

    // 2. Server-level check: Fetch fresh settings directly from Firestore before showing popup
    try {
      const freshSettings = await getAuthSettings();
      if (!freshSettings.googleLoginEnabled) {
        setGoogleLoginEnabled(false);
        setAuthSettings(freshSettings);
        const err = new Error('Google Login is currently disabled by the administrator. Please use email and password.');
        (err as any).code = 'auth/google-disabled';
        throw err;
      }
    } catch (fetchErr: any) {
      if (fetchErr?.code === 'auth/google-disabled') {
        throw fetchErr;
      }
      console.warn('Settings pre-check failed, continuing with cached setting:', fetchErr);
    }

    // 3. Initiate Firebase Google Authentication
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const authenticatedUser = result.user;

      // 4. Double check setting after popup completion
      const postAuthSettings = await getAuthSettings();
      if (!postAuthSettings.googleLoginEnabled) {
        setGoogleLoginEnabled(false);
        await signOut(auth);
        const err = new Error('Google Login is currently disabled by the administrator. Please use email and password.');
        (err as any).code = 'auth/google-disabled';
        throw err;
      }

      // 5. Ensure profile is stored and synced without duplicate records
      if (authenticatedUser) {
        try {
          const userDocRef = doc(db, 'users', authenticatedUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          const now = new Date().toISOString();
          const profileData: Record<string, any> = {
            uid: authenticatedUser.uid,
            email: authenticatedUser.email || '',
            displayName: authenticatedUser.displayName || authenticatedUser.email?.split('@')[0] || 'User',
            photoURL: authenticatedUser.photoURL || '',
            lastLogin: now,
            lastLoginAt: now,
          };

          if (!userDocSnap.exists() || !userDocSnap.data()?.createdAt) {
            profileData.createdAt = now;
          }

          await setDoc(userDocRef, cleanFirestoreData(profileData), { merge: true });
        } catch (dbErr) {
          console.warn('Could not write user profile after Google sign-in:', dbErr);
        }
      }

      setIsAuthModalOpen(false);
    } catch (error: any) {
      const code = error?.code || '';
      const msg = error?.message || String(error);

      if (code === 'auth/google-disabled' || msg.includes('disabled by the administrator')) {
        throw error;
      }

      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        console.warn(
          '[Auth] Google Sign-In requires domain authorization in Firebase Console (Authentication > Settings > Authorized domains).'
        );
        const domainErr = new Error(
          'Firebase domain unauthorized: This deployment domain has not been added to your Firebase Authentication Authorized Domains list yet. Please sign in with Email & Password or authorize this domain in Firebase Console.'
        );
        (domainErr as any).code = 'auth/unauthorized-domain';
        throw domainErr;
      }

      if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed')) {
        const cancelErr = new Error('Sign-in cancelled by user.');
        (cancelErr as any).code = 'auth/popup-closed-by-user';
        throw cancelErr;
      }

      if (code === 'auth/popup-blocked') {
        const popupErr = new Error('Google Sign-In popup was blocked by your browser. Please allow popups for this site and try again.');
        (popupErr as any).code = 'auth/popup-blocked';
        throw popupErr;
      }

      if (code === 'auth/account-exists-with-different-credential') {
        const accountErr = new Error('An account already exists with the same email address using a different sign-in method. Please sign in using your email and password.');
        (accountErr as any).code = 'auth/account-exists-with-different-credential';
        throw accountErr;
      }

      console.warn('[Auth] Google sign-in error:', msg);
      throw error;
    }
  };

  const loginAsDemo = async (role: 'user' | 'admin' = 'user') => {
    setLoading(true);
    const email = role === 'admin' ? 'sanjeevidaa16@gmail.com' : 'viewer.demo@stream.com';
    const pass = 'demo123456';
    const displayName = role === 'admin' ? 'Sanjeevi (Admin)' : 'Demo Viewer';

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        try {
          const res = await createUserWithEmailAndPassword(auth, email, pass);
          if (res.user) {
            await updateProfile(res.user, { displayName });
            if (role === 'admin') {
              try {
                await setDoc(doc(db, 'admins', res.user.uid), {
                  uid: res.user.uid,
                  email: res.user.email,
                  role: 'superadmin',
                  createdAt: new Date().toISOString(),
                }, { merge: true });
              } catch (adminDocErr) {
                console.warn('Admin record sync note:', adminDocErr);
              }
            }
          }
          setIsAuthModalOpen(false);
        } catch (createErr: any) {
          if (createErr?.code === 'auth/email-already-in-use') {
            await signInWithEmailAndPassword(auth, email, pass);
            setIsAuthModalOpen(false);
          } else {
            console.warn('[Auth] Demo account setup note:', createErr?.message);
            throw createErr;
          }
        }
      } else {
        console.warn('[Auth] Demo login note:', err?.message);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user && name) {
        await updateProfile(res.user, { displayName: name });
      }
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const sendResetEmail = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  };

  const claimAdminAccess = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'admin',
        createdAt: new Date().toISOString(),
      }, { merge: true });
      setIsAdmin(true);
      return true;
    } catch (error) {
      console.error('Failed to claim admin access:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        googleLoginEnabled,
        authSettings,
        authSettingsLoading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        redirectVideoId,
        clearRedirectVideoId,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsDemo,
        logout,
        sendResetEmail,
        claimAdminAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
