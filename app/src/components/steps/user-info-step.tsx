'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type UserInfoStepProps = {
  onNext: () => void;
  onClear: () => void;
  onBackToWelcome: () => void;
};

export default function UserInfoStep({ onNext, onClear, onBackToWelcome }: UserInfoStepProps) {
  const { control, watch, setValue } = useFormContext();
  const userAge = watch('userAge');
  const coveragePeriod = watch('coveragePeriod');

  const handleCoverageUntilAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const coverageUntilAge = Number(e.target.value);
    if (!isNaN(coverageUntilAge) && userAge > 0) {
      const newCoveragePeriod = coverageUntilAge - userAge;
      setValue('coveragePeriod', newCoveragePeriod > 0 ? newCoveragePeriod : 0, { shouldValidate: true });
    } else {
        setValue('coveragePeriod', 0);
    }
  };
  
  const coverageUntilAgeValue = () => {
    if (userAge > 0 && coveragePeriod > 0) {
        return userAge + coveragePeriod;
    }
    return '';
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
                <Input type="number" placeholder="กรุณาใส่อายุ" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={control}
            name="coveragePeriod"
            render={({ field }) => ( // We bind to coveragePeriod but display and control via a synthetic field
              <FormItem>
                <FormLabel>ความคุ้มครองจนถึงอายุ (ปี)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="กรุณาใส่อายุ" 
                    onChange={handleCoverageUntilAgeChange}
                    value={coverageUntilAgeValue()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
      </CardContent>
      <CardFooter className="flex flex-col gap-4 max-w-sm mx-auto pt-6">
        <Button type="button" onClick={onNext} className="w-full bg-teal-500 hover:bg-teal-600 rounded-full">ยืนยัน</Button>
        <Button type="button" onClick={onClear} variant="outline" className="w-full rounded-full">ล้างข้อมูล</Button>
        <Button type="button" onClick={onBackToWelcome} variant="ghost" className="w-full rounded-full">ย้อนกลับ</Button>
      </CardFooter>
    </Card>
  );
}
