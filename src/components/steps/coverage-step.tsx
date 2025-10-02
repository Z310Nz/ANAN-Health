'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { X } from 'lucide-react';

type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control } = useFormContext();
  
  const { fields: policyFields, append: appendPolicy, remove: removePolicy } = useFieldArray({
    control,
    name: "policies",
  });

  const { fields: riderFields } = useFieldArray({
    control,
    name: "riders",
  });

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
            <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-4">
                <FormField
                control={control}
                name={`policies.${index}.policy`}
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
                name={`policies.${index}.amount`}
                render={({ field }) => (
                    <FormItem>
                    <FormControl>
                        <Input type="number" placeholder="กรุณาใส่ตัวเลข" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {policyFields.length > 1 ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePolicy(index)}
                        className="text-red-500 hover:text-red-700"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                ) : <div className="w-10"/>}
            </div>
            ))}
            {policyFields.length < 4 && (
                <Button type="button" variant="link" onClick={() => appendPolicy({ policy: '', amount: undefined })}>
                    + เพิ่มกรมธรรม์
                </Button>
            )}
            </div>
        </div>
        
        <Separator className="my-8" />

        <div>
            <h3 className="text-lg font-semibold mb-4">อนุสัญญา</h3>
            <div className="space-y-4">
            {riderFields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr_1fr] items-center gap-4">
                    <FormField
                    control={control}
                    name={`riders.${index}.selected`}
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        </FormItem>
                    )}
                    />
                    <span className="font-medium">{`Package ${index + 1}`}</span>
                    <FormField
                    control={control}
                    name={`riders.${index}.amount`}
                    render={({ field }) => (
                        <FormItem>
                        <FormControl>
                            <Input type="number" placeholder="กรุณาใส่ตัวเลข" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
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
