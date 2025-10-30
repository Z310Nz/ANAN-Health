'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import type { PremiumFormData, PremiumCalculation } from '@/lib/types';
import { getPremiumSummary } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import UserInfoStep from '@/components/steps/user-info-step';
import CoverageStep from '@/components/steps/coverage-step';
import ReviewStep from '@/components/steps/review-step';
import SummaryStep from '@/components/steps/summary-step';
import { ArrowLeft } from 'lucide-react';

const SESSION_STORAGE_KEY = 'anan-health-calculator-session';

const policySchema = z.object({
  policy: z.string().optional(),
  amount: z.coerce.number().optional(),
});

const riderSchema = z.object({
  name: z.string(),
  category: z.string(),
  type: z.enum(['dropdown', 'input']),
  selected: z.boolean().optional(),
  amount: z.coerce.number().optional(),
  dropdownValue: z.string().optional(),
});

const FormSchema = z.object({
  userAge: z.coerce.number().min(18, "ต้องมีอายุอย่างน้อย 18 ปี").max(100, "อายุต้องไม่เกิน 100 ปี"),
  gender: z.enum(['male', 'female'], { required_error: "กรุณาเลือกเพศ" }),
  coveragePeriod: z.coerce.number().min(1, "Must be at least 1 year").max(50, "Cannot exceed 50 years"),
  policies: z.array(policySchema).optional(),
  riders: z.array(riderSchema).optional(),
});

type PremiumCalculatorProps = {
  onBackToWelcome: () => void;
};

export default function PremiumCalculator({ onBackToWelcome }: PremiumCalculatorProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [calculation, setCalculation] = useState<PremiumCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const methods = useForm<PremiumFormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      userAge: 30,
      gender: undefined,
      coveragePeriod: 20,
      policies: [{policy: undefined, amount: undefined}],
      riders: [
        { name: 'Infinite Care (new standard)', category: 'ค่ารักษา', type: 'dropdown', selected: false, amount: undefined },
        { name: 'Health Happy', category: 'ค่ารักษา', type: 'dropdown', selected: false, amount: undefined },
        { name: 'Health Happy Kids DD10K', category: 'ค่ารักษา', type: 'dropdown', selected: false, amount: undefined },
        { name: 'Health Happy Kids DD30K', category: 'ค่ารักษา', type: 'dropdown', selected: false, amount: undefined },
        { name: 'Health Saver', category: 'ค่ารักษา', type: 'input', selected: false, amount: undefined },
        { name: 'H&S Extra (new standard)', category: 'ค่ารักษา', type: 'input', selected: false, amount: undefined },
        { name: 'H&S (new standard)', category: 'ค่ารักษา', type: 'input', selected: false, amount: undefined },
        { name: 'Infinite Care (new standard) DD 100K', category: 'ค่ารักษา', 'type': 'dropdown', selected: false, amount: undefined },
        { name: 'Infinite Care (new standard) DD 300K', category: 'ค่ารักษา', 'type': 'dropdown', selected: false, amount: undefined },
        { name: 'HB', category: 'ชดเชยรายวัน', type: 'input', selected: false, amount: undefined },
        { name: 'HB Extra', category: 'ชดเชยรายวัน', type: 'input', selected: false, amount: undefined },
        { name: 'CI Plus', category: 'ชดเชยโรคร้ายแรง', type: 'input', selected: false, amount: undefined },
        { name: 'AI/RCC', category: 'ชดเชยอุบัติเหตุ', type: 'input', selected: false, amount: undefined },
      ],
    },
  });

  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const { formData, result, step } = JSON.parse(savedSession);
        methods.reset(formData);
        if (result) setCalculation(result);
        if (step) setCurrentStep(step);
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
          result: calculation,
          step: currentStep,
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error("Could not save session", e);
    }
  }, [watchedData, calculation, currentStep]);


  const handleNext = async () => {
    const fieldsToValidate: (keyof PremiumFormData)[] = 
      currentStep === 0 ? ['userAge', 'gender', 'coveragePeriod'] : ['policies', 'riders'];
    
    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);
  
  const handleCalculate = async (data: PremiumFormData) => {
    setIsLoading(true);
    try {
      const result = await getPremiumSummary(data);
      setCalculation(result);
      setCurrentStep(3);
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
    methods.reset({ ...methods.getValues(), userAge: 30, gender: undefined, coveragePeriod: 20 });
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <UserInfoStep onNext={handleNext} onClear={handleClear} />;
      case 1: return <CoverageStep onBack={handleBack} onNext={handleNext} />;
      case 2: return <ReviewStep onBack={handleBack} isLoading={isLoading} />;
      case 3: return calculation ? <SummaryStep calculation={calculation} onStartOver={handleStartOver} /> : null;
      default: return null;
    }
  }

  return (
    <Card className="w-full max-w-4xl shadow-lg border-none rounded-t-3xl mt-[-2.5rem] bg-white pt-2">
       <CardContent className="p-4 sm:p-8 relative">
        {currentStep === 0 && (
           <Button variant="ghost" size="sm" onClick={onBackToWelcome} className="absolute top-4 left-4 text-muted-foreground">
             <ArrowLeft className="h-4 w-4 mr-2" />
             กลับ
           </Button>
        )}
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleCalculate)}>
            <div className="animate-fade-in mt-8">{renderStep()}</div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
