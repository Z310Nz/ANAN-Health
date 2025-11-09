'use client';

import type { User as AppUser } from '@/lib/types';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth as useFirebaseAuth, useFirebase } from '@/firebase';
import { Auth, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { checkUserByLineId } from '@/app/actions';
import liff from '@line/liff';

interface AuthContextType {
  liffUser: AppUser | null;
  firebaseUser: User | null;
  isRegistered: boolean | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
  liffError: string | null;
  reloadAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'anan-health-user';
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, isUserLoading: isFbUserLoading } = useFirebase();
  const [liffUser, setLiffUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [liffError, setLiffError] = useState<string | null>(null);

  const performUserCheck = useCallback(async (user: AppUser) => {
    // Check if user exists in our DB
    const dbUser = await checkUserByLineId(user.id);
    if (dbUser && !(dbUser as any).error) {
      setIsRegistered(true);
    } else {
      setIsRegistered(false);
    }

    // Sign in to Firebase anonymously to secure backend access
    if (auth && !auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (fbError) {
        console.error('Firebase anonymous sign-in failed:', fbError);
        // Handle failed Firebase sign-in, maybe show an error
      }
    }
  }, [auth]);


  const initialize = useCallback(async () => {
    setLoading(true);
    setIsRegistered(null);
    setLiffUser(null);

    try {
      if (!liffId) {
        throw new Error('LIFF ID is not configured. Please set NEXT_PUBLIC_LIFF_ID in your .env file.');
      }

      await liff.init({ liffId });

      if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        const user: AppUser = {
          id: profile.userId,
          displayName: profile.displayName,
          avatarUrl: profile.pictureUrl,
        };
        
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        setLiffUser(user);
        await performUserCheck(user);
      } else {
        // --- Development/Testing Bypass ---
        // This block allows access to the app from a normal web browser
        // by creating a mock user.
        console.warn('Not in LIFF browser. Using mock user for testing.');
        const mockUser: AppUser = {
            id: 'U-mock-1234567890abcdef',
            displayName: 'Test User',
            avatarUrl: 'https://picsum.photos/seed/testuser/200/200'
        };
        setLiffUser(mockUser);
        setIsRegistered(true); // Bypass registration check for mock user
        
        // Also sign in to Firebase for the mock user
        if (auth && !auth.currentUser) {
            try {
                await signInAnonymously(auth);
            } catch (fbError) {
                console.error('Firebase anonymous sign-in for mock user failed:', fbError);
            }
        }
        // --- End of Bypass ---
      }
    } catch (error: any) {
      console.error('LIFF Initialization or user check failed', error);
      setLiffError(error.toString());
      // Fallback to stored user if LIFF fails
      const storedUserJson = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUserJson) {
        const storedUser = JSON.parse(storedUserJson);
        setLiffUser(storedUser);
        setIsRegistered(false); // Assume we can't verify, so prompt for registration/login
      }
    } finally {
      setLoading(false);
    }
  }, [performUserCheck, auth]);
  
  useEffect(() => {
    initialize();
  }, [initialize]);


  useEffect(() => {
    if (!isFbUserLoading && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        if (!user) {
            // If firebase user logs out, try to sign in again if app user exists
            if(liffUser && auth) {
                signInAnonymously(auth).catch(err => console.error("Failed to re-authenticate anonymously", err));
            }
        }
      });
      return () => unsubscribe();
    }
  }, [auth, isFbUserLoading, liffUser]);

  const login = useCallback(() => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  }, []);

  const logout = useCallback(() => {
    if (liff.isLoggedIn()) {
      liff.logout();
    }
    if (auth) {
      auth.signOut();
    }
    localStorage.removeItem(USER_STORAGE_KEY);
    setLiffUser(null);
    setFirebaseUser(null);
    setIsRegistered(null);
    window.location.reload(); // Reload to clear state
  }, [auth]);

  const reloadAuth = useCallback(() => {
    initialize();
  }, [initialize]);


  const combinedLoading = loading || isFbUserLoading || isRegistered === null;

  return (
    <AuthContext.Provider value={{ liffUser, firebaseUser, isRegistered, login, logout, loading: combinedLoading, liffError, reloadAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
