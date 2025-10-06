'use client';

import type { User as AppUser } from '@/lib/types';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth as useFirebaseAuth, useFirebase } from '@/firebase';
import { Auth, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: User | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'anan-health-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, isUserLoading } = useFirebase();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        if (user) {
           try {
            const storedUser = localStorage.getItem(USER_STORAGE_KEY);
            if (storedUser) {
              setAppUser(JSON.parse(storedUser));
            } else {
              // Create a mock app user if none is stored
              const avatar = PlaceHolderImages.find(p => p.id === 'user-avatar-1');
              const mockUser: AppUser = {
                id: user.uid,
                displayName: user.displayName || 'Jane Doe',
                avatarUrl: user.photoURL || avatar?.imageUrl || "https://picsum.photos/seed/user1/100/100",
              };
              localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
              setAppUser(mockUser);
            }
          } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            localStorage.removeItem(USER_STORAGE_KEY);
            setAppUser(null);
          }
        } else {
          localStorage.removeItem(USER_STORAGE_KEY);
          setAppUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else if (!isUserLoading) {
        setLoading(false);
    }
  }, [auth, isUserLoading]);

  const login = useCallback(() => {
    if (auth) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed", error);
      });
    }
  }, [auth]);

  const logout = useCallback(() => {
    if (auth) {
      auth.signOut();
    }
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user: appUser, firebaseUser, login, logout, loading }}>
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
