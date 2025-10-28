'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';

type UserInfoStepProps = {
  onNext: () => void;
  onClear: () => void;
};

export default function UserInfoStep({ onNext, onClear }: UserInfoStepProps) {
  const { control, watch, setValue, getValues } = useFormContext();
  const userAge = watch('userAge');
  const coveragePeriod = watch('coveragePeriod');
  
  const [coverageUntilAgeDisplay, setCoverageUntilAgeDisplay] = useState('');

  useEffect(() => {
    const currentAge = getValues('userAge');
    const period = getValues('coveragePeriod');
    if (currentAge > 0 && period > 0) {
      setCoverageUntilAgeDisplay((currentAge + period).toString());
    } else {
      setCoverageUntilAgeDisplay('');
    }
  }, [userAge, coveragePeriod, getValues]);

  const handleCoverageUntilAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    setCoverageUntilAgeDisplay(inputVal);

    const coverageUntilAge = Number(inputVal);
    const currentAge = Number(getValues('userAge'));

    if (!isNaN(coverageUntilAge) && currentAge > 0 && coverageUntilAge > currentAge) {
      const newCoveragePeriod = coverageUntilAge - currentAge;
      setValue('coveragePeriod', newCoveragePeriod, { shouldValidate: true });
    } else {
       setValue('coveragePeriod', 0, { shouldValidate: true });
    }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAge = Number(e.target.value);
      setValue('userAge', newAge, { shouldValidate: true });

      const coverageUntilAge = Number(coverageUntilAgeDisplay);
      if (!isNaN(coverageUntilAge) && newAge > 0 && coverageUntilAge > newAge) {
          const newCoveragePeriod = coverageUntilAge - newAge;
          setValue('coveragePeriod', newCoveragePeriod, { shouldValidate: true });
      } else if (newAge <= 0 || coverageUntilAge <= newAge) {
          setValue('coveragePeriod', 0, { shouldValidate: true });
      }
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">ข้อมูลส่วนตัว</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-sm mx-auto">
        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>เพศ *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <FormLabel>อายุปัจจุบัน (ปี)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="กรุณาใส่อายุ" {...field} value={field.value || ''} onChange={handleAgeChange} />
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
                <FormLabel>ความคุ้มครองจนถึงอายุ (ปี)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
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
        <Button type="button" onClick={onNext} className="w-full bg-teal-500 hover:bg-teal-600 rounded-full">ยืนยัน</Button>
        <Button type="button" onClick={onClear} variant="ghost" className="w-full rounded-full text-muted-foreground">ล้างข้อมูล</Button>
      </CardFooter>
    </Card>
  );
}
