"use client";

import AppHeader from "@/components/header";
import PremiumCalculator from "@/components/premium-calculator";

type DashboardProps = {
  onBackToWelcome: () => void;
};

export default function Dashboard({ onBackToWelcome }: DashboardProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Header */}
      <AppHeader />

      {/* Main Content - Mobile Optimized */}
      <main className="flex flex-1 flex-col items-center justify-start w-full overflow-auto">
        <div className="w-full max-w-md px-3 py-4 sm:px-4 sm:py-6">
          <PremiumCalculator onBackToWelcome={onBackToWelcome} />
        </div>
      </main>
    </div>
  );
}
