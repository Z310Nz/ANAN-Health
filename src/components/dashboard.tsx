'use client';

import AppHeader from '@/components/header';
import PremiumCalculator from '@/components/premium-calculator';

type DashboardProps = {
  onBackToWelcome: () => void;
};

export default function Dashboard({ onBackToWelcome }: DashboardProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-primary">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center pt-8">
        <PremiumCalculator onBackToWelcome={onBackToWelcome} />
      </main>
    </div>
  );
}
