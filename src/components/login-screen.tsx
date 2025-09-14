'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { HeartPulse } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex items-center gap-4 mb-4 text-primary">
        <HeartPulse className="h-16 w-16" />
        <h1 className="text-5xl font-bold font-headline tracking-tight text-foreground">
          ANAN Health
        </h1>
      </div>
      <p className="max-w-md text-lg text-muted-foreground mb-8">
        Your trusted partner in health insurance. Get a personalized premium preview in seconds.
      </p>
      <Button
        size="lg"
        onClick={login}
        className="bg-[#00B900] hover:bg-[#00A300] text-white font-bold"
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mr-2 fill-current"
        >
          <title>LINE</title>
          <path d="M18.882 14.154c.488 0 .882.395.882.883s-.394.883-.882.883H5.118c-.488 0-.882-.395-.882-.883s.394-.883.882-.883h13.764zm-3.235-3.3c.488 0 .882.395.882.882s-.394.883-.882.883H5.118c-.488 0-.882-.395-.882-.883s.394-.882.882-.882h10.529zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.147 18.232c-.3-.213-.68-.333-1.09-.333a1.764 1.764 0 0 1-1.49-2.336s.385-1.547-1.12-1.547c-.833 0-1.33.56-1.532.743-.325.302-.51.42-.71.42-.192 0-.348-.103-.473-.243-.326-.358-1.01-1.12-2.113-2.223C6.52 11.648 5.61 10.32 5.61 9.14c0-1.764 1.437-3.2 3.2-3.2.883 0 1.68.358 2.263.94.584.584.94 1.38.94 2.264v.002h.017c.12-.002.24-.002.36-.002 1.764 0 3.2 1.437 3.2 3.2 0 1.07-.528 2.01-1.343 2.585z"/>
        </svg>
        Login with LINE
      </Button>
    </div>
  );
}
