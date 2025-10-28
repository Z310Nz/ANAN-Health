'use client';

import AppHeader from '@/components/header';
import PremiumCalculator from '@/components/premium-calculator';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-primary">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center pt-8">
        <PremiumCalculator />
      </main>
    </div>
  );
}
