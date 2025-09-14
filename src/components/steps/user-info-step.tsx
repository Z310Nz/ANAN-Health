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
  const { control, watch } = useFormContext();
  const userAge = watch('userAge');

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
            render={({ field }) => (
              <FormItem>
                <FormLabel>ความคุ้มครองจนถึงอายุ (ปี)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="กรุณาใส่อายุ" {...field} onChange={(e) => {
                     const coverageUntilAge = Number(e.target.value);
                     const coveragePeriod = coverageUntilAge - userAge;
                     field.onChange(coveragePeriod > 0 ? coveragePeriod : 0);
                  }} 
                  value={userAge > 0 && field.value > 0 ? userAge + field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
      </CardContent>
      <CardFooter className="flex flex-col gap-4 max-w-sm mx-auto">
        <Button type="button" onClick={onBackToWelcome} variant="outline" className="w-full rounded-full">ย้อนกลับ</Button>
        <Button type="button" onClick={onNext} className="w-full bg-teal-500 hover:bg-teal-600 rounded-full">ยืนยัน</Button>
        <Button type="button" onClick={onClear} variant="outline" className="w-full rounded-full">ล้างข้อมูล</Button>
      </CardFooter>
    </Card>
  );
}
