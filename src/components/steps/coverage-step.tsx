'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type CoverageStepProps = {
  onBack: () => void;
  onNext: () => void;
};

export default function CoverageStep({ onBack, onNext }: CoverageStepProps) {
  const { control, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "policies",
  });

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">เลือกกรมธรรม์หลัก</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg mx-auto">
        {fields.map((item, index) => (
          <div key={item.id} className="grid grid-cols-2 gap-4">
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
          </div>
        ))}
         {fields.length < 4 && (
            <Button type="button" variant="link" onClick={() => append({ policy: '', amount: '' })}>
                + เพิ่มกรมธรรม์
            </Button>
         )}

        <div className="flex items-center gap-4 pt-4">
            <FormLabel className="w-24">ส่วนลด</FormLabel>
            <FormField
                control={control}
                name="discount"
                render={({ field }) => (
                <FormItem className="flex-grow">
                    <FormControl>
                    <Input type="number" placeholder="กรุณาใส่ส่วนลด" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <span className="text-lg">%</span>
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
