'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { Rider, Policy, PremiumFormData } from '@/lib/types';
import { getPoliciesForGender } from '@/app/actions';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
  'Infinite Care (new standard)': {
    male: [
      { label: 'ช 60,000,000 ทั่วโลก', value: '60M WW' },
      { label: 'ช 120,000,000 ทั่วโลก', value: '120M WW' },
      { label: 'ช 60,000,000 ยกเว้นUSA', value: '60M xUS' },
      { label: 'ช 120,000,000 ยกเว้นUSA', value: '120M xUS' },
    ],
    female: [
      { label: 'ญ 60,000,000 ทั่วโลก', value: '60M WW' },
      { label: 'ญ 120,000,000 ทั่วโลก', value: '120M WW' },
      { label: 'ญ 60,000,000 ยกเว้นUSA', value: '60M xUS' },
      { label: 'ญ 120,000,000 ยกเว้นUSA', value: '120M xUS' },
    ],
  },
  'Health Happy': {
    male: [
      { label: 'HH 1,000,000', value: 'HHM1' },
      { label: 'HH 5,000,000', value: 'HHM5' },
      { label: 'HH 15,000,000', value: 'HHM15' },
      { label: 'HH 25,000,000', value: 'HHM25' },
    ],
    female: [
      { label: 'HH 1,000,000', value: 'HHF1' },
      { label: 'HH 5,000,000', value: 'HHF5' },
      { label: 'HH 15,000,000', value: 'HHF15' },
      { label: 'HH 25,000,000', value: 'HHF25' },
    ],
  },
  'Health Happy Kids DD10K': {
    male: [
      { label: 'HH 1,000,000', value: 'HHM10K1' },
      { label: 'HH 5,000,000', value: 'HHM10K5' },
      { label: 'HH 15,000,000', value: 'HHM10K15' },
      { label: 'HH 25,000,000', value: 'HHM10K25' },
    ],
    female: [
      { label: 'HH 1,000,000', value: 'HHF10K1' },
      { label: 'HH 5,000,000', value: 'HHF10K5' },
      { label: 'HH 15,000,000', value: 'HHF10K15' },
      { label: 'HH 25,000,000', value: 'HHF10K25' },
    ],
  },
  'Health Happy Kids DD30K': {
    male: [
      { label: 'HH 1,000,000', value: 'HHM30K1' },
      { label: 'HH 5,000,000', value: 'HHM30K5' },
      { label: 'HH 15,000,000', value: 'HHM30K15' },
      { label: 'HH 25,000,000', value: 'HHM30K25' },
    ],
    female: [
      { label: 'HH 1,000,000', value: 'HHF30K1' },
      { label: 'HH 5,000,000', value: 'HHF30K5' },
      { label: 'HH 15,000,000', value: 'HHF30K15' },
      { label: 'HH 25,000,000', value: 'HHF30K25' },
    ],
  },
  'Infinite Care (new standard) DD 100K': {
    male: [
        { label: 'ช 60,000,000 ทั่วโลก', value: 'ICDM10M60' },
        { label: 'ช 120,000,000 ทั่วโลก', value: 'ICDM10M120' },
        { label: 'ช 60,000,000 ยกเว้นUSA', value: 'ICDM10MxUS60' },
        { label: 'ช 120,000,000 ยกเว้นUSA', value: 'ICDM10MxUS120' },
    ],
    female: [
        { label: 'ญ 60,000,000 ทั่วโลก', value: 'ICDF10M60' },
        { label: 'ญ 120,000,000 ทั่วโลก', value: 'ICDF10M120' },
        { label: 'ญ 60,000,000 ยกเว้นUSA', value: 'ICDF10MxUS60' },
        { label: 'ญ 120,000,000 ยกเว้นUSA', value: 'ICDF10MxUS120' },
    ],
  },
    'Infinite Care (new standard) DD 300K': {
    male: [
        { label: 'ช 60,000,000 ทั่วโลก', value: 'ICDM30M60' },
        { label: 'ช 120,000,000 ทั่วโลก', value: 'ICDM30M120' },
        { label: 'ช 60,000,000 ยกเว้นUSA', value: 'ICDM30MxUS60' },
        { label: 'ช 120,000,000 ยกเว้นUSA', value: 'ICDM30MxUS120' },
    ],
    female: [
        { label: 'ญ 60,000,000 ทั่วโลก', value: 'ICDF30M60' },
        { label: 'ญ 120,000,000 ทั่วโลก', value: 'ICDF30M120' },
        { label: 'ญ 60,000,000 ยกเว้นUSA', value: 'ICDF30MxUS60' },
        { label: 'ญ 120,000,000 ยกเว้นUSA', value: 'ICDF30MxUS120' },
    ],
  },
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, getValues, watch } = useFormContext<PremiumFormData>();
  
  const gender = getValues('gender');
  const riders = watch('riders') || [];
  
  const { fields: policyFields, append, remove } = useFieldArray({ control, name: "policies" });

  const [policies, setPolicies] = useState<Omit<Policy, 'ages'>[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);

  useEffect(() => {
    if (gender) {
        setPoliciesLoading(true);
        getPoliciesForGender(gender)
            .then(data => {
                setPolicies(data);
            })
            .catch(err => console.error("Failed to fetch policies:", err))
            .finally(() => setPoliciesLoading(false));
    }
  }, [gender]);

  const riderCategories = {
    'ค่ารักษา': riders.map((r, i) => ({...r, index: i})).filter(r => r.category === 'ค่ารักษา'),
    'ชดเชยรายวัน': riders.map((r, i) => ({...r, index: i})).filter(r => r.category === 'ชดเชยรายวัน'),
    'ชดเชยโรคร้ายแรง': riders.map((r, i) => ({...r, index: i})).filter(r => r.category === 'ชดเชยโรคร้ายแรง'),
    'ชดเชยอุบัติเหตุ': riders.map((r, i) => ({...r, index: i})).filter(r => r.category === 'ชดเชยอุบัติเหตุ'),
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">เลือกความคุ้มครอง</CardTitle>
        <CardDescription>เลือกกรมธรรม์หลักและอนุสัญญาที่ต้องการ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 max-w-lg mx-auto">
        <div>
          <h3 className="text-lg font-semibold mb-4">กรมธรรม์หลัก</h3>
          <div className="space-y-4">
            {policyFields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[2fr_1fr_auto] items-start gap-2">
                <FormField
                  control={control}
                  name={`policies.${index}.policy`}
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={policiesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={policiesLoading ? "กำลังโหลด..." : "เลือกกรมธรรม์"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {policies?.map((policy) => (
                            <SelectItem key={policy.id} value={policy.id}>{policy.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name={`policies.${index}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="number" placeholder="วงเงิน" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="mt-1 text-muted-foreground hover:text-destructive">
                    <span className="text-2xl">×</span>
                </Button>
              </div>
            ))}
             <Button type="button" variant="outline" size="sm" onClick={() => append({ policy: undefined, amount: undefined })}>
                เพิ่มกรมธรรม์
            </Button>
          </div>
        </div>
        
        <Separator className="my-8" />

        <div>
          <h3 className="text-lg font-semibold mb-4">อนุสัญญา (Riders)</h3>
          <div className="space-y-6">
            {Object.entries(riderCategories).map(([category, categoryRiders]) => (
              categoryRiders.length > 0 && (
                <div key={category}>
                  <h4 className="font-semibold mb-4 text-gray-600">{category}</h4>
                  <div className="space-y-4">
                    {categoryRiders.map((item) => (
                       <div key={item.index} className="grid grid-cols-[auto_1fr] items-center gap-4 p-2 rounded-md hover:bg-gray-50">
                         <FormField
                            control={control}
                            name={`riders.${item.index}.selected`}
                            render={({ field }) => (
                                <FormItem className="flex items-center h-10">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} id={`rider-check-${item.index}`}/>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <FormLabel htmlFor={`rider-check-${item.index}`} className="font-medium cursor-pointer">{item.name}</FormLabel>
                            
                            {item.type === 'input' && (
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
                                        value={field.value || ''} 
                                        onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                        disabled={!riders[item.index]?.selected}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {item.type === 'dropdown' && (
                              <FormField
                                control={control}
                                name={`riders.${item.index}.dropdownValue`}
                                render={({ field }) => (
                                  <FormItem>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value} 
                                      disabled={!riders[item.index]?.selected || !gender}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="เลือกแผน" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {(riderDropdownOptions[item.name]?.[gender] || []).map(option => (
                                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
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
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between max-w-lg mx-auto pt-8">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full px-10">ย้อนกลับ</Button>
        <Button type="button" onClick={onNext} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">ต่อไป</Button>
      </CardFooter>
    </Card>
  );
}
