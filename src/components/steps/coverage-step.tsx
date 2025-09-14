'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';

const riders = [
  { id: 'critical_illness', label: 'Critical Illness' },
  { id: 'accidental_death', label: 'Accidental Death' },
  { id: 'waiver_of_premium', label: 'Waiver of Premium' },
];

type CoverageStepProps = {
  onBack: () => void;
  isLoading: boolean;
};

export default function CoverageStep({ onBack, isLoading }: CoverageStepProps) {
  const { control } = useFormContext();

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-headline">Customize Your Coverage</CardTitle>
            <CardDescription>Select the coverage amount, period, and any additional riders.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="coverageAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coverage Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 500,000" {...field} />
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
                <FormLabel>Coverage Period (Years)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={control}
          name="riders"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Additional Riders</FormLabel>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {riders.map((item) => (
                  <FormField
                    key={item.id}
                    control={control}
                    name="riders"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), item.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            'Calculate Premium'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
