'use client';

import MainApp from '@/components/main-app';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading, liffError } = useAuth();

  if (loading) {
    return (
      <main className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Initializing...</p>
      </main>
    );
  }

  if (liffError) {
      return (
      <main className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-xl font-bold text-destructive mb-4">LIFF Initialization Error</h1>
        <p className="text-muted-foreground mb-2">Could not initialize the LIFF application.</p>
        <p className="text-xs text-muted-foreground bg-gray-100 p-2 rounded-md">{liffError}</p>
        <p className="mt-4 text-sm text-muted-foreground">Please make sure you are opening this app through LINE and that the LIFF ID is correct.</p>
      </main>
    );
  }

  // If we are not in the LIFF browser or not logged in, we might want to show a message.
  // For now, we assume the user is always logged in via LIFF.
  return (
    <main>
      <MainApp />
    </main>
  );
}
