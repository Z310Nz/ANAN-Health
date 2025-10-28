'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { Rider, Policy } from '@/lib/types';
import { getPoliciesForGender } from '@/app/actions';
import { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';


type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, getValues, watch } = useFormContext();
  
  const gender: 'male' | 'female' = getValues('gender');
  const watchedRiders = watch('riders');
  
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "policies",
  });

  useEffect(() => {
    if (gender) {
      setPoliciesLoading(true);
      getPoliciesForGender(gender).then(data => {
        setPolicies(data);
        setPoliciesLoading(false);
      });
    }
  }, [gender]);


  const riderCategories = {
    'ค่ารักษา': watchedRiders.map((r: Rider, i: number) => ({...r, index: i})).filter((r: Rider & { index: number }) => r.category === 'ค่ารักษา'),
    'ชดเชยรายวัน': watchedRiders.map((r: Rider, i: number) => ({...r, index: i})).filter((r: Rider & { index: number }) => r.category === 'ชดเชยรายวัน'),
    'ชดเชยโรคร้ายแรง': watchedRiders.map((r: Rider, i: number) => ({...r, index: i})).filter((r: Rider & { index: number }) => r.category === 'ชดเชยโรคร้ายแรง'),
    'ชดเชยอุบัติเหตุ': watchedRiders.map((r: Rider, i: number) => ({...r, index: i})).filter((r: Rider & { index: number }) => r.category === 'ชดเชยอุบัติเหตุ'),
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">เลือกกรมธรรม์และความคุ้มครอง</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-2xl mx-auto">
        <div>
            <h3 className="text-lg font-semibold mb-4">กรมธรรม์หลัก</h3>
            <div className="space-y-4">
              {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-4">
                    <FormField
                    control={control}
                    name={`policies.${index}.policy`}
                    render={({ field }) => (
                        <FormItem>
                        <Select onValueChange={field.onChange} value={field.value} disabled={policiesLoading}>
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
                            <Input type="number" placeholder="ทุนประกัน" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append({ policy: '', amount: 500000 })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                เพิ่มกรมธรรม์หลัก
              </Button>
            </div>
        </div>
        
        <Separator className="my-8" />

        <div>
            <h3 className="text-lg font-semibold mb-4">อนุสัญญา (Riders)</h3>
            <div className="space-y-6">

            {Object.entries(riderCategories).map(([category, riders]) => (
              riders.length > 0 && (
                <div key={category}>
                    <h4 className="font-semibold mb-4 text-gray-600">{category}</h4>
                    <div className="space-y-4">
                        {(riders as (Rider & { index: number })[]).map((item) => (
                            <div key={item.index} className="grid grid-cols-[auto_1fr_1fr] items-start gap-4">
                                <FormField
                                    control={control}
                                    name={`riders.${item.index}.selected`}
                                    render={({ field }) => (
                                        <FormItem className='flex items-center h-10'>
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <label className="font-medium flex items-center h-10 cursor-pointer" htmlFor={`riders.${item.index}.selected`}>{item.name}</label>
                                { item.category === 'ค่ารักษา' ? (
                                    <FormField
                                    control={control}
                                    name={`riders.${item.index}.amount`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger disabled={!watchedRiders[item.index]?.selected}>
                                                    <SelectValue placeholder="เลือกวงเงิน" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1000000">1,000,000</SelectItem>
                                                <SelectItem value="5000000">5,000,000</SelectItem>
                                                <SelectItem value="15000000">15,000,000</SelectItem>
                                                <SelectItem value="30000000">30,000,000</SelectItem>
                                                <SelectItem value="60000000">60,000,000</SelectItem>
                                                <SelectItem value="120000000">120,000,000</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                ) : (
                                    <FormField
                                    control={control}
                                    name={`riders.${item.index}.amount`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input type="number" placeholder="ทุนประกัน" {...field} disabled={!watchedRiders[item.index]?.selected} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                                            </FormControl>
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
      <CardFooter className="flex justify-between max-w-2xl mx-auto">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full px-10">
          ย้อนกลับ
        </Button>
        <Button type="button" onClick={onNext} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">
          ถัดไป
        </Button>
      </CardFooter>
    </Card>
  );
}
