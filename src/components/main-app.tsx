'use client';

import { useState } from 'react';
import WelcomeScreen from '@/components/welcome-screen';
import Dashboard from '@/components/dashboard';

export default function MainApp() {
  const [isStarted, setIsStarted] = useState(false);

  if (!isStarted) {
    return <WelcomeScreen onStart={() => setIsStarted(true)} />;
  }

  return <Dashboard onBackToWelcome={() => setIsStarted(false)} />;
}
