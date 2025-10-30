'use client';

import type { User as AppUser } from '@/lib/types';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth as useFirebaseAuth, useFirebase } from '@/firebase';
import { Auth, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import liff from '@line/liff';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
  liffError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'anan-health-user';
const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, isUserLoading: isFbUserLoading } = useFirebase();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    const initializeLiff = async () => {
      try {
        if (!liffId) {
          console.error('LIFF ID is not set. Please set NEXT_PUBLIC_LIFF_ID in your .env file.');
          setLiffError('LIFF ID is not configured.');
          setLoading(false);
          return;
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
          setAppUser(user);
          
          // Sign in to Firebase anonymously to secure backend access
          if (auth && !auth.currentUser) {
            await signInAnonymously(auth);
          }

        } else {
          // For this app, we assume it always runs in the LIFF browser and the user should be logged in.
          // If not, it could be a development environment or an issue.
          // You might want to call liff.login() here for non-LIFF browser scenarios.
          console.log('LIFF: Not logged in. Login may be required.');
          const storedUser = localStorage.getItem(USER_STORAGE_KEY);
          if (storedUser) {
            setAppUser(JSON.parse(storedUser));
          } else {
             // If not logged in and no user in storage, we can't proceed.
            // In a real app, you might redirect or show a login button.
            // liff.login(); 
          }
        }
      } catch (error: any) {
        console.error('LIFF Initialization failed', error);
        setLiffError(error.toString());
        // Try to load user from localStorage as a fallback
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          setAppUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    initializeLiff();
  }, [auth]);

  useEffect(() => {
    if (!isFbUserLoading && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        if (!user) {
            // If firebase user logs out, try to sign in again if app user exists
            if(appUser && auth) {
                signInAnonymously(auth).catch(err => console.error("Failed to re-authenticate anonymously", err));
            }
        }
      });
      return () => unsubscribe();
    }
  }, [auth, isFbUserLoading, appUser]);

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
    setAppUser(null);
    setFirebaseUser(null);
    window.location.reload(); // Reload to clear state
  }, [auth]);

  const combinedLoading = loading || isFbUserLoading;

  return (
    <AuthContext.Provider value={{ user: appUser, firebaseUser, login, logout, loading: combinedLoading, liffError }}>
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
