'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { User } from 'lucide-react';

type UserInfoStepProps = {
  onNext: () => void;
};

export default function UserInfoStep({ onNext }: UserInfoStepProps) {
  const { control } = useFormContext();

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-headline">Tell us about yourself</CardTitle>
            <CardDescription>This will help us calculate your premium.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="userAge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Age</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button type="button" onClick={onNext}>Next</Button>
      </CardFooter>
    </Card>
  );
}
