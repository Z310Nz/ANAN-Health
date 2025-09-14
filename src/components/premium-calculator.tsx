'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { PremiumFormData, PremiumCalculation } from '@/lib/types';
import { getPremiumSummary } from '@/app/actions';
import { exportToCsv } from '@/lib/csv';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent } from '@/components/ui/card';
import { StepperIndicator } from '@/components/stepper-indicator';
import UserInfoStep from '@/components/steps/user-info-step';
import CoverageStep from '@/components/steps/coverage-step';
import SummaryStep from '@/components/steps/summary-step';
import { Button } from './ui/button';

const SESSION_STORAGE_KEY = 'anan-health-calculator-session';

const FormSchema = z.object({
  userAge: z.coerce.number().min(18, "ต้องมีอายุอย่างน้อย 18 ปี").max(100, "อายุต้องไม่เกิน 100 ปี"),
  gender: z.enum(['male', 'female'], { required_error: "กรุณาเลือกเพศ" }),
  coverageAmount: z.coerce.number().min(10000, "Must be at least 10,000").max(10000000, "Cannot exceed 10,000,000"),
  coveragePeriod: z.coerce.number().min(1, "Must be at least 1 year").max(50, "Cannot exceed 50 years"),
  riders: z.array(z.string()).optional(),
});

const steps = ["ข้อมูลส่วนตัว", "รายละเอียดความคุ้มครอง", "สรุป"];

export default function PremiumCalculator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [calculation, setCalculation] = useState<PremiumCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const methods = useForm<PremiumFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userAge: 30,
      gender: undefined,
      coverageAmount: 500000,
      coveragePeriod: 20,
      riders: ["critical_illness"],
    },
  });

  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const { formData, result } = JSON.parse(savedSession);
        methods.reset(formData);
        if (result) {
          setCalculation(result);
          setCurrentStep(2);
        }
      }
    } catch (e) {
      console.error("Could not load session", e);
    }
  }, [methods]);
  
  const watchedData = methods.watch();

  useEffect(() => {
    try {
        const session = {
            formData: watchedData,
            result: calculation
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
        console.error("Could not save session", e);
    }
  }, [watchedData, calculation]);


  const handleNext = async () => {
    const fields: (keyof PremiumFormData)[] = [['userAge', 'gender'], ['coverageAmount', 'coveragePeriod', 'riders']][currentStep] as any;
    const isValid = await methods.trigger(fields);
    if (isValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };
  
  const handleCalculate = async (data: PremiumFormData) => {
    setIsLoading(true);
    try {
      const result = await getPremiumSummary(data);
      setCalculation(result);
      setCurrentStep(2);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Calculation Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setCalculation(null);
    methods.reset();
    setCurrentStep(0);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  };
  
  const handleClear = () => {
    methods.reset({
      ...methods.getValues(),
      userAge: 30,
      gender: undefined,
    });
  }


  const handleExport = () => {
    if (calculation) {
      const headers = ["Year", "Base Premium", "Riders Premium", "Total Premium"];
      const data = calculation.yearlyBreakdown.map(y => [y.year, y.base, y.riders, y.total]);
      exportToCsv("premium_breakdown.csv", headers, data);
    }
  };

  return (
    <Card className="w-full max-w-4xl shadow-lg">
      <CardContent className="p-4 sm:p-8">
        <div className="mb-8">
          <StepperIndicator steps={steps} currentStep={currentStep} />
        </div>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleCalculate)}>
            <div className="animate-fade-in">
              {currentStep === 0 && <UserInfoStep onNext={handleNext} onClear={handleClear} />}
              {currentStep === 1 && <CoverageStep onBack={handleBack} isLoading={isLoading} />}
              {currentStep === 2 && calculation && (
                <SummaryStep
                  calculation={calculation}
                  onStartOver={handleStartOver}
                  onExport={handleExport}
                />
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
