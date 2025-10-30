'use client';

import { useState } from 'react';
import WelcomeScreen from '@/components/welcome-screen';
import Dashboard from '@/components/dashboard';

const SESSION_STORAGE_KEY = 'anan-health-calculator-session';

export default function MainApp() {
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = () => {
    // Clear previous session when starting a new calculation from the welcome screen
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setIsStarted(true);
  };
  
  const handleStartOver = () => {
    setIsStarted(false);
  }

  if (!isStarted) {
    return <WelcomeScreen onStart={handleStart} />;
  }

  return <Dashboard onBackToWelcome={handleStartOver} />;
}
