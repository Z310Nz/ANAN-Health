"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { Rider, Policy, PremiumFormData } from "@/lib/types";
import { getPoliciesForGender } from "@/app/actions";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

type DropdownOption = { label: string; value: string };
type RiderOptions = {
  male: DropdownOption[];
  female: DropdownOption[];
};

const riderDropdownOptions: Record<string, RiderOptions> = {
  "Infinite Care (new standard)": {
    male: [
      { label: "ช 60,000,000 ทั่วโลก", value: "Infinite_Care_M_60M_WW" },
      { label: "ช 120,000,000 ทั่วโลก", value: "Infinite_Care_M_120M_WW" },
      { label: "ช 60,000,000 ยกเว้นUSA", value: "Infinite_Care_M_60M_xUS" },
      { label: "ช 120,000,000 ยกเว้นUSA", value: "Infinite_Care_M_120M_xUS" },
    ],
    female: [
      { label: "ญ 60,000,000 ทั่วโลก", value: "Infinite_Care_F_60M_WW" },
      { label: "ญ 120,000,000 ทั่วโลก", value: "Infinite_Care_F_120M_WW" },
      { label: "ญ 60,000,000 ยกเว้นUSA", value: "Infinite_Care_F_60M_xUS" },
      { label: "ญ 120,000,000 ยกเว้นUSA", value: "Infinite_Care_F_120M_xUS" },
    ],
  },
  "Health Happy": {
    male: [
      { label: "HH 1,000,000", value: "HHM1" },
      { label: "HH 5,000,000", value: "HHM5" },
      { label: "HH 15,000,000", value: "HHM15" },
      { label: "HH 25,000,000", value: "HHM25" },
    ],
    female: [
      { label: "HH 1,000,000", value: "HHF1" },
      { label: "HH 5,000,000", value: "HHF5" },
      { label: "HH 15,000,000", value: "HHF15" },
      { label: "HH 25,000,000", value: "HHF25" },
    ],
  },
  "Health Happy Kids DD10K": {
    male: [
      { label: "HH 1,000,000", value: "HHM10K1" },
      { label: "HH 5,000,000", value: "HHM10K5" },
      { label: "HH 15,000,000", value: "HHM10K15" },
      { label: "HH 25,000,000", value: "HHM10K25" },
    ],
    female: [
      { label: "HH 1,000,000", value: "HHF10K1" },
      { label: "HH 5,000,000", value: "HHF10K5" },
      { label: "HH 15,000,000", value: "HHF10K15" },
      { label: "HH 25,000,000", value: "HHF10K25" },
    ],
  },
  "Health Happy Kids DD30K": {
    male: [
      { label: "HH 1,000,000", value: "HHM30K1" },
      { label: "HH 5,000,000", value: "HHM30K5" },
      { label: "HH 15,000,000", value: "HHM30K15" },
      { label: "HH 25,000,000", value: "HHM30K25" },
    ],
    female: [
      { label: "HH 1,000,000", value: "HHF30K1" },
      { label: "HH 5,000,000", value: "HHF30K5" },
      { label: "HH 15,000,000", value: "HHF30K15" },
      { label: "HH 25,000,000", value: "HHF30K25" },
    ],
  },
  "Health Saver": {
    male: [
      { label: "HSV1,500(200,000)", value: "HSVM1500" },
      { label: "HSV2,000(300,000)", value: "HSVM2000" },
      { label: "HSV3,000(400,000)", value: "HSVM3000" },
      { label: "HSV4,000(500,000)", value: "HSVM4000" },
    ],
    female: [
      { label: "HSV1,500(200,000)", value: "HSVF1500" },
      { label: "HSV2,000(300,000)", value: "HSVF2000" },
      { label: "HSV3,000(400,000)", value: "HSVF3000" },
      { label: "HSV4,000(500,000)", value: "HSVF4000" },
    ],
  },
  "H&S Extra (new standard)": {
    male: [
      { label: "H&S Extra 1,500", value: "HSEXM1500" },
      { label: "H&S Extra 2,000", value: "HSEXM2000" },
      { label: "H&S Extra 2,500", value: "HSEXM2500" },
      { label: "H&S Extra 3,500", value: "HSEXM3500" },
      { label: "H&S Extra 4,500", value: "HSEXM4500" },
      { label: "H&S Extra 5,500", value: "HSEXM5500" },
      { label: "H&S Extra 6,500", value: "HSEXM6500" },
    ],
    female: [
      { label: "H&S Extra 1,500", value: "HSEXF1500" },
      { label: "H&S Extra 2,000", value: "HSEXF2000" },
      { label: "H&S Extra 2,500", value: "HSEXF2500" },
      { label: "H&S Extra 3,500", value: "HSEXF3500" },
      { label: "H&S Extra 4,500", value: "HSEXF4500" },
      { label: "H&S Extra 5,500", value: "HSEXF5500" },
      { label: "H&S Extra 6,500", value: "HSEXF6500" },
    ],
  },
  "H&S (new standard)": {
    male: [
      { label: "H&S 1,000", value: "HSNM1000" },
      { label: "H&S 1,600", value: "HSNM1600" },
      { label: "H&S 2,200", value: "HSNM2200" },
      { label: "H&S 2,800", value: "HSNM2800" },
      { label: "H&S 3,400", value: "HSNM3400" },
      { label: "H&S 4,000", value: "HSNM4000" },
      { label: "H&S 5,000", value: "HSNM5000" },
    ],
    female: [
      { label: "H&S 1,000", value: "HSNF1000" },
      { label: "H&S 1,600", value: "HSNF1600" },
      { label: "H&S 2,200", value: "HSNF2200" },
      { label: "H&S 2,800", value: "HSNF2800" },
      { label: "H&S 3,400", value: "HSNF3400" },
      { label: "H&S 4,000", value: "HSNF4000" },
      { label: "H&S 5,000", value: "HSNF5000" },
    ],
  },
  "Infinite Care (new standard) DD 100K": {
    male: [
      { label: "ช 60,000,000 ทั่วโลก", value: "ICDM10M60" },
      { label: "ช 120,000,000 ทั่วโลก", value: "ICDM10M120" },
      { label: "ช 60,000,000 ยกเว้นUSA", value: "ICDM10MxUS60" },
      { label: "ช 120,000,000 ยกเว้นUSA", value: "ICDM10MxUS120" },
    ],
    female: [
      { label: "ญ 60,000,000 ทั่วโลก", value: "ICDF10F60" },
      { label: "ญ 120,000,000 ทั่วโลก", value: "ICDF10F120" },
      { label: "ญ 60,000,000 ยกเว้นUSA", value: "ICDF10FxUS60" },
      { label: "ญ 120,000,000 ยกเว้นUSA", value: "ICDF10FxUS120" },
    ],
  },
  "Infinite Care (new standard) DD 300K": {
    male: [
      { label: "ช 60,000,000 ทั่วโลก", value: "ICDM30M60" },
      { label: "ช 120,000,000 ทั่วโลก", value: "ICDM30M120" },
      { label: "ช 60,000,000 ยกเว้นUSA", value: "ICDM30MxUS60" },
      { label: "ช 120,000,000 ยกเว้นUSA", value: "ICDM30MxUS120" },
    ],
    female: [
      { label: "ญ 60,000,000 ทั่วโลก", value: "ICDF30F60" },
      { label: "ญ 120,000,000 ทั่วโลก", value: "ICDF30F120" },
      { label: "ญ 60,000,000 ยกเว้นUSA", value: "ICDF30FxUS60" },
      { label: "ญ 120,000,000 ยกเว้นUSA", value: "ICDF30FxUS120" },
    ],
  },
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, getValues, watch } = useFormContext<PremiumFormData>();

  const gender = getValues("gender");
  const riders = watch("riders") || [];

  const [policies, setPolicies] = useState<Omit<Policy, "ages">[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  useEffect(() => {
    if (gender) {
      setPoliciesLoading(true);
      getPoliciesForGender(gender)
        .then((data) => {
          setPolicies(data);
        })
        .catch((err) => console.error("Failed to fetch policies:", err))
        .finally(() => setPoliciesLoading(false));
    }
  }, [gender]);

  const riderCategories = {
    ค่ารักษา: riders
      .map((r, i) => ({ ...r, index: i }))
      .filter((r) => r.category === "ค่ารักษา"),
    ชดเชยรายวัน: riders
      .map((r, i) => ({ ...r, index: i }))
      .filter((r) => r.category === "ชดเชยรายวัน"),
    ชดเชยโรคร้ายแรง: riders
      .map((r, i) => ({ ...r, index: i }))
      .filter((r) => r.category === "ชดเชยโรคร้ายแรง"),
    ชดเชยอุบัติเหตุ: riders
      .map((r, i) => ({ ...r, index: i }))
      .filter((r) => r.category === "ชดเชยอุบัติเหตุ"),
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">
          เลือกความคุ้มครอง
        </CardTitle>
        <CardDescription>
          เลือกกรมธรรม์หลักและอนุสัญญาที่ต้องการ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 max-w-lg mx-auto">
        <div>
          <h3 className="text-lg font-semibold mb-4">กรมธรรม์หลัก</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-[2fr_1fr] items-start gap-2">
              <FormField
                control={control}
                name={`policies.0.policy`}
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={policiesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              policiesLoading ? "กำลังโหลด..." : "เลือกกรมธรรม์"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {policies?.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id}>
                            {policy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`policies.0.amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="วงเงิน"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value)
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div>
          <h3 className="text-lg font-semibold mb-4">อนุสัญญา (Riders)</h3>
          <div className="space-y-6">
            {Object.entries(riderCategories).map(
              ([category, categoryRiders]) =>
                categoryRiders.length > 0 && (
                  <div key={category}>
                    <h4 className="font-semibold mb-4 text-gray-600">
                      {category}
                    </h4>
                    <div className="space-y-4">
                      {categoryRiders.map((item) => (
                        <div
                          key={item.index}
                          className="grid grid-cols-[auto_1fr] items-center gap-4 p-2 rounded-md hover:bg-gray-50"
                        >
                          <FormField
                            control={control}
                            name={`riders.${item.index}.selected`}
                            render={({ field }) => (
                              <FormItem className="flex items-center h-10">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    id={`rider-check-${item.index}`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4 items-center">
                            <FormLabel
                              htmlFor={`rider-check-${item.index}`}
                              className="font-medium cursor-pointer"
                            >
                              {item.name}
                            </FormLabel>

                            {item.type === "input" && (
                              <FormField
                                control={control}
                                name={`riders.${item.index}.amount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="ระบุวงเงิน"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) =>
                                          field.onChange(
                                            e.target.value === ""
                                              ? undefined
                                              : Number(e.target.value)
                                          )
                                        }
                                        disabled={!riders[item.index]?.selected}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {item.type === "dropdown" && (
                              <FormField
                                control={control}
                                name={`riders.${item.index}.dropdownValue`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      disabled={
                                        !riders[item.index]?.selected || !gender
                                      }
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="เลือกแผน" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(
                                          riderDropdownOptions[item.name]?.[
                                            gender
                                          ] || []
                                        ).map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between max-w-lg mx-auto pt-8">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full px-10"
        >
          ย้อนกลับ
        </Button>
        <Button
          type="button"
          onClick={onNext}
          className="bg-teal-500 hover:bg-teal-600 rounded-full px-10"
        >
          ต่อไป
        </Button>
      </CardFooter>
    </Card>
  );
}
