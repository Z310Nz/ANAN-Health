'use client';

import AppHeader from '@/components/header';
import PremiumCalculator from '@/components/premium-calculator';

export default function Dashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <AppHeader />
      <main className="flex flex-1 flex-col items-center p-4 sm:p-6 lg:p-8">
        <PremiumCalculator />
      </main>
    </div>
  );
}
