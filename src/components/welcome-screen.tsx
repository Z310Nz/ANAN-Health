"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { initializeRatesCache } from "@/app/actions";
import { idbManager } from "@/lib/indexeddb";

type WelcomeScreenProps = {
  onStart: () => void;
};

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { liffUser } = useAuth();
  const [isInitializing, setIsInitializing] = useState(false);

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const handleStart = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeRatesCache();
      if (result.success) {
        console.log("Cache initialized successfully:", result.cacheMetadata);

        // Populate IndexedDB with the fetched records
        if (result.idbRecords && result.idbRecords.length > 0) {
          console.log(
            `[IDB] Populating IndexedDB with ${result.idbRecords.length} records...`
          );
          await idbManager.addRates(result.idbRecords);
          console.log("[IDB] IndexedDB populated successfully");
        }
      } else {
        console.warn("Cache initialization failed:", result.error);
      }
    } catch (error) {
      console.error("Error initializing cache:", error);
    } finally {
      setIsInitializing(false);
      onStart();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 p-4 text-center">
      {/* Logo/Branding */}
      <div className="mb-6">
        <a
          href="https://nongfaa.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-700 hover:underline font-medium transition-colors text-sm"
        >
          nongfaa.com
        </a>
      </div>

      {/* User Avatar */}
      <Avatar className="h-40 w-40 mb-8 shadow-lg ring-4 ring-teal-200">
        <AvatarImage src={liffUser?.avatarUrl} alt={liffUser?.displayName} />
        <AvatarFallback className="text-3xl font-bold bg-teal-500 text-white">
          {getInitials(liffUser?.displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Welcome Message */}
      <h1 className="text-3xl font-bold text-foreground mb-2">
        ยินดีต้อนรับ "{liffUser?.displayName || "คุณ"}"
      </h1>
      <h2 className="text-2xl font-bold text-teal-600 mb-4">
        เข้าสู่ระบบคำนวณเบี้ยประกันภัย
      </h2>

      {/* Disclaimer */}
      <p className="max-w-md text-sm text-red-600 font-medium mb-8 leading-relaxed">
        ⚠️ ใช้เพื่อการวางแผนเท่านั้น<br />
        มิใช่ข้อเสนอประกันชีวิตและสุขภาพ
      </p>

      {/* Start Button */}
      <Button
        size="lg"
        onClick={handleStart}
        disabled={isInitializing}
        className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full px-12 py-6 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg w-full max-w-xs"
      >
        {isInitializing ? "🔄 กำลังโหลดข้อมูล..." : "🚀 กดเพื่อเริ่มคำนวน"}
      </Button>

      {/* Info Text */}
      <p className="mt-8 text-xs text-gray-600 max-w-sm">
        ระบบจะโหลดข้อมูลอัตราเบี้ยและอื่น ๆ<br />
        ใช้เวลาสักครู่กรุณารอสักครู่
      </p>
    </div>
  );
}
