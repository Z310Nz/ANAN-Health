'use client';

import { useAuth } from '@/contexts/auth-context';
import LoginScreen from '@/components/login-screen';
import Dashboard from '@/components/dashboard';
import { Skeleton } from './ui/skeleton';

export default function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginScreen />;
}
