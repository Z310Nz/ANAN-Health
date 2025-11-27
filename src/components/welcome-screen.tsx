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
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
      <a
        href="https://nongfaa.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-600 hover:text-teal-700 hover:underline mb-4 font-medium transition-colors"
      >
        nongfaa.com
      </a>
      <Avatar className="h-48 w-48 mb-8">
        <AvatarImage src={liffUser?.avatarUrl} alt={liffUser?.displayName} />
        <AvatarFallback>{getInitials(liffUser?.displayName)}</AvatarFallback>
      </Avatar>
      <h1 className="text-2xl font-bold text-foreground mb-2">
        ยินดีต้อนรับ “{liffUser?.displayName || "คุณ"}”
      </h1>
      <h2 className="text-2xl font-bold text-foreground mb-4">
        เข้าสู่ระบบคำนวณเบี้ยประกันภัย
      </h2>
      <p className="max-w-md text-sm text-red-500 mb-8">
        **ใช้เพื่อการวางแผนเท่านั้น มิใช่ข้อเสนอประกันชีวิตและสุขภาพ**
      </p>
      <Button
        size="lg"
        onClick={handleStart}
        disabled={isInitializing}
        className="bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full px-12 py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isInitializing ? "กำลังโหลดข้อมูล..." : "กดเพื่อเริ่มคำนวน"}
      </Button>
    </div>
  );
}
