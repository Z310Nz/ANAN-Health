'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { Rider } from '@/lib/types';

type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, getValues } = useFormContext();
  
  const { fields: riderFields } = useFieldArray({
    control,
    name: "riders",
  });
  
  const riders: Rider[] = getValues('riders');

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
              <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-4">
                  <FormField
                  control={control}
                  name="policies.0.policy"
                  render={({ field }) => (
                      <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="เลือกกรมธรรม์" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          <SelectItem value="policy1">กรมธรรม์ 1</SelectItem>
                          <SelectItem value="policy2">กรมธรรม์ 2</SelectItem>
                          <SelectItem value="policy3">กรมธรรม์ 3</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={control}
                  name="policies.0.amount"
                  render={({ field }) => (
                      <FormItem>
                      <FormControl>
                          <Input type="number" placeholder="กรุณาใส่ตัวเลข" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <div className="w-10"/>
              </div>
            </div>
        </div>
        
        <Separator className="my-8" />

        <div>
            <h3 className="text-lg font-semibold mb-4">อนุสัญญา</h3>
            <div className="space-y-6">

            {Object.entries(riderCategories).map(([category, riders]) => (
              riders.length > 0 && (
                <div key={category}>
                    <h4 className="font-semibold mb-4 text-gray-600">{category}</h4>
                    <div className="space-y-4">
                        {riders.map((item) => (
                            <div key={item.id} className="grid grid-cols-[auto_1fr_1fr] items-start gap-4">
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
                                <span className="font-medium flex items-center h-10">{item.name}</span>
                                { category === 'ค่ารักษา' ? (
                                    <FormField
                                    control={control}
                                    name={`riders.${item.index}.amount`}
                                    render={({ field }) => (
                                        <FormItem>
                                        <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="เลือกวงเงิน" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="1000000">1,000,000</SelectItem>
                                                <SelectItem value="5000000">5,000,000</SelectItem>
                                                <SelectItem value="10000000">10,000,000</SelectItem>
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
                                                <Input type="number" placeholder="กรุณาใส่ตัวเลข" {...field} />
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
      <CardFooter className="flex justify-between max-w-lg mx-auto">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full px-10">
          ย้อนกลับ
        </Button>
        <Button type="button" onClick={onNext} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">
          ยืนยัน
        </Button>
      </CardFooter>
    </Card>
  );
}
