import { useEffect, useState } from "react";
import { idbManager, type RateRecord } from "@/lib/indexeddb";

/**
 * Hook to lookup rates from IndexedDB
 * This provides browser-side caching without server queries
 */
export function useRateLookup() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkReady = async () => {
      try {
        const ready = await idbManager.isCacheReady();
        setIsReady(ready);
      } catch (error) {
        console.error("[useRateLookup] Error checking cache readiness:", error);
        setIsReady(false);
      }
    };

    checkReady();
  }, []);

  const getRegularRate = async (
    age: number,
    gender: string,
    segcode: string
  ): Promise<number | null | undefined> => {
    try {
      const record = await idbManager.getRatesByType(
        age,
        gender,
        segcode,
        "regular"
      );
      return record?.interest;
    } catch (error) {
      console.error("[useRateLookup] Error getting regular rate:", error);
      return undefined;
    }
  };

  const getRiderRate = async (
    age: number,
    gender: string,
    segcode: string
  ): Promise<number | null | undefined> => {
    try {
      const record = await idbManager.getRatesByType(
        age,
        gender,
        segcode,
        "rider"
      );
      return record?.interest;
    } catch (error) {
      console.error("[useRateLookup] Error getting rider rate:", error);
      return undefined;
    }
  };

  return {
    isReady,
    getRegularRate,
    getRiderRate,
  };
}
