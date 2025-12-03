"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { CacheLoadingOverlay } from "@/components/cache-loading-overlay";
import { idbManager } from "@/lib/indexeddb";

type UserInfoStepProps = {
  onNext: () => void;
  onClear: () => void;
};

export default function UserInfoStep({ onNext, onClear }: UserInfoStepProps) {
  const { control, watch, setValue, getValues } = useFormContext();
  const userAge = watch("userAge");
  const coveragePeriod = watch("coveragePeriod");

  const [coverageUntilAgeDisplay, setCoverageUntilAgeDisplay] = useState("");
  const [isCacheReady, setIsCacheReady] = useState(true);
  const [isCheckingCache, setIsCheckingCache] = useState(true);

  // Check if IndexedDB cache is ready when component mounts
  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        const isReady = await idbManager.isCacheReady();
        setIsCacheReady(isReady);
        if (isReady) {
          console.log("[UserInfoStep] IndexedDB cache is ready");
        } else {
          console.warn(
            "[UserInfoStep] IndexedDB cache is not ready - data will load from database"
          );
        }
      } catch (error) {
        console.error("[UserInfoStep] Error checking cache status:", error);
        setIsCacheReady(false);
      } finally {
        setIsCheckingCache(false);
      }
    };

    checkCacheStatus();
  }, []);

  useEffect(() => {
    const currentAge = getValues("userAge");
    const period = getValues("coveragePeriod");

    // If current age is 0 or period is 0, clear display
    if (currentAge === 0 || period === 0) {
      setCoverageUntilAgeDisplay("");
    } else if (currentAge > 0 && period > 0 && period >= currentAge) {
      // Display the coverage until age (which is stored as period in coveragePeriod)
      setCoverageUntilAgeDisplay(period.toString());
    } else {
      setCoverageUntilAgeDisplay("");
    }
  }, [userAge, coveragePeriod, getValues]);

  const handleCoverageUntilAgeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Only allow numeric characters
    const inputValue = e.target.value.replace(/[^\d]/g, "");
    const coverageUntilAge = inputValue === "" ? 0 : Number(inputValue);

    setCoverageUntilAgeDisplay(inputValue);

    const currentAge = Number(getValues("userAge"));

    // Set coveragePeriod to the coverage until age (which is the absolute age, not period)
    if (
      !isNaN(coverageUntilAge) &&
      currentAge >= 0 &&
      coverageUntilAge >= currentAge
    ) {
      setValue("coveragePeriod", coverageUntilAge, { shouldValidate: true });
    } else {
      setValue("coveragePeriod", 0, { shouldValidate: true });
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric characters
    const inputValue = e.target.value.replace(/[^\d]/g, "");
    const newAge = inputValue === "" ? 0 : Number(inputValue);

    // Set the value (numeric only)
    setValue("userAge", newAge, { shouldValidate: true });

    // Update coverage period if valid
    const coverageUntilAge = Number(coverageUntilAgeDisplay);
    if (!isNaN(coverageUntilAge) && newAge >= 0 && coverageUntilAge >= newAge) {
      const newCoveragePeriod = coverageUntilAge;
      setValue("coveragePeriod", newCoveragePeriod, { shouldValidate: true });
    } else if (newAge > coverageUntilAge) {
      setCoverageUntilAgeDisplay("");
      setValue("coveragePeriod", 0, { shouldValidate: true });
    }
  };

  return (
    <>
      <CacheLoadingOverlay isLoading={isCheckingCache} />
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">
            ข้อมูลส่วนตัว
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 max-w-sm mx-auto">
          <FormField
            control={control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>เพศ *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="กรุณาเลือกเพศ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">ชาย</SelectItem>
                    <SelectItem value="female">หญิง</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="userAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>อายุปัจจุบัน (ปี) *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="กรุณาใส่อายุ"
                    {...field}
                    value={field.value || ""}
                    onChange={handleAgeChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="coveragePeriod"
            render={() => (
              <FormItem>
                <FormLabel>ความคุ้มครองจนถึงอายุ (ปี) *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder="กรุณาใส่อายุ"
                    onChange={handleCoverageUntilAgeChange}
                    value={coverageUntilAgeDisplay}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 max-w-sm mx-auto pt-6">
          <Button
            type="button"
            onClick={onNext}
            className="w-full bg-teal-500 hover:bg-teal-600 rounded-full"
          >
            ยืนยัน
          </Button>
          <Button
            type="button"
            onClick={onClear}
            variant="ghost"
            className="w-full rounded-full text-muted-foreground"
          >
            ล้างข้อมูล
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
