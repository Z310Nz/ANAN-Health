'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

type RidersStepProps = {
  onBack: () => void;
  onNext: () => void;
};

export default function RidersStep({ onBack, onNext }: RidersStepProps) {
  const { control } = useFormContext();
  const { fields } = useFieldArray({
    control,
    name: "riders",
  });

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">เลือกอนุสัญญา</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-w-lg mx-auto">
        {fields.map((item, index) => (
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
