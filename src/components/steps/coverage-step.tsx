'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { Rider, Policy, PremiumFormData } from '@/lib/types';
import { getPoliciesForGender } from '@/app/actions';
import { useState, useEffect } from 'react';

type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

const riderDropdownOptions: Record<string, string[]> = {
  'Infinite Care (new standard)': ['แผน 1 ล้าน', 'แผน 5 ล้าน', 'แผน 10 ล้าน', 'แผน 30 ล้าน', 'แผน 60 ล้าน', 'แผน 100 ล้าน'],
  'Health Happy': ['แผน 1 ล้าน', 'แผน 5 ล้าน', 'แผน 15 ล้าน', 'แผน 25 ล้าน'],
  'Health Happy Kids DD10K': ['แผน 1 ล้าน', 'แผน 5 ล้าน'],
  'Health Happy Kids DD30K': ['แผน 1 ล้าน', 'แผน 5 ล้าน'],
  'Infinite Care (new standard) DD 100K': ['แผน 30 ล้าน', 'แผน 60 ล้าน', 'แผน 100 ล้าน'],
  'Infinite Care (new standard) DD 300K': ['แผน 60 ล้าน', 'แผน 100 ล้าน'],
};


export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, getValues, watch } = useFormContext<PremiumFormData>();
  
  const gender = getValues('gender');
  const riders = watch('riders') || [];
  
  const { fields: policyFields } = useFieldArray({ control, name: "policies" });
  
  const [policies, setPolicies] = useState<Omit<Policy, 'ages'>[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  useEffect(() => {
    if (gender) {
      setPoliciesLoading(true);
      getPoliciesForGender(gender).then(data => {
        console.log('Policies received in component:', data);
        setPolicies(data);
        setPoliciesLoading(false);
      }).catch(error => {
        console.error("Failed to get policies for gender:", error);
        setPoliciesLoading(false);
      });
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
        <CardTitle className="text-2xl font-headline">เลือกกรมธรรม์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-lg mx-auto">
        <div>
          <h3 className="text-lg font-semibold mb-4">กรมธรรม์หลัก</h3>
          <div className="space-y-4">
            {policyFields.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[1fr_1fr] items-start gap-4">
                <FormField
                  control={control}
                  name={`policies.${index}.policy`}
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={policiesLoading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={policiesLoading ? "Loading..." : "เลือกกรมธรรม์"} />
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
                        <Input type="number" placeholder="กรุณาใส่ตัวเลข" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
        </div>
        
        <Separator className="my-8" />

        <div>
          <h3 className="text-lg font-semibold mb-4">อนุสัญญา</h3>
          <div className="space-y-6">
            {Object.entries(riderCategories).map(([category, categoryRiders]) => (
              categoryRiders.length > 0 && (
                <div key={category}>
                  <h4 className="font-semibold mb-4 text-gray-600">{category}</h4>
                  <div className="space-y-4">
                    {categoryRiders.map((item) => (
                      <div key={item.index} className="grid grid-cols-[auto_1fr_1fr] items-start gap-4">
                        <FormField
                          control={control}
                          name={`riders.${item.index}.selected`}
                          render={({ field }) => (
                            <FormItem className='flex items-center h-10'>
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="font-medium flex items-center h-10">{item.name}</span>
                        
                        {item.type === 'input' && (
                           <FormField
                            control={control}
                            name={`riders.${item.index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="กรุณาใส่ตัวเลข" 
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
                                  disabled={!riders[item.index]?.selected}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="เลือกแผน" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(riderDropdownOptions[item.name] || []).map(option => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between max-w-lg mx-auto">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full px-10">ย้อนกลับ</Button>
        <Button type="button" onClick={onNext} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">ยืนยัน</Button>
      </CardFooter>
    </Card>
  );
}
