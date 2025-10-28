'use client';

import type { User as AppUser } from '@/lib/types';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface AuthContextType {
  user: AppUser | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'anan-health-user';

// Mock Auth Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a logged-in user
    setLoading(true);
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(() => {
    setLoading(true);
    const avatar = PlaceHolderImages.find(p => p.id === 'user-avatar-1');
    const mockUser: AppUser = {
      id: 'mock-user-id',
      displayName: 'คุณากร',
      avatarUrl: avatar?.imageUrl || "https://picsum.photos/seed/user1/100/100",
    };
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error('Failed to save user to localStorage', error);
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    setLoading(true);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error('Failed to remove user from localStorage', error);
    }
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
