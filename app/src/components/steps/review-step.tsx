'use client';

import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { PremiumFormData, Policy } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getPoliciesForGender } from '@/app/actions';

type ReviewStepProps = {
  onBack: () => void;
  isLoading: boolean;
};

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});


export default function ReviewStep({ onBack, isLoading }: ReviewStepProps) {
  const { getValues } = useFormContext<PremiumFormData>();
  const { policies: selectedPolicyInputs, riders, gender } = getValues();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  useEffect(() => {
    if (gender) {
      setLoadingPolicies(true);
      getPoliciesForGender(gender).then(data => {
        setPolicies(data);
        setLoadingPolicies(false);
      });
    }
  }, [gender]);


  const getPolicyName = (id: string) => {
    if (loadingPolicies) return 'กำลังโหลด...';
    return policies?.find(p => p.id === id)?.name || id;
  }

  const selectedPolicies = selectedPolicyInputs?.filter(p => p.policy && p.amount);
  const selectedRiders = riders?.filter(r => r.selected && r.amount);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">ตรวจสอบข้อมูล</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-lg mx-auto">
        <div>
          <h3 className="font-semibold mb-2 text-lg">กรมธรรม์หลัก</h3>
          <div className="space-y-2 rounded-lg border p-4">
            {selectedPolicies && selectedPolicies.length > 0 ? (
                selectedPolicies.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-gray-800">
                        <span>{getPolicyName(p.policy!)}</span>
                        <span className="font-semibold">{p.amount ? currencyFormatter.format(p.amount) : ''}</span>
                    </div>
                ))
            ) : (
                <p className="text-muted-foreground text-center">ไม่ได้เลือกกรมธรรม์หลัก</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-lg">อนุสัญญา (Riders)</h3>
          <div className="space-y-2 rounded-lg border p-4">
            {selectedRiders && selectedRiders.length > 0 ? (
                selectedRiders.map((r, i) => (
                  <div key={i} className="flex justify-between items-center text-gray-800">
                    <span>{r.name}</span>
                    <span className="font-semibold">{r.amount ? currencyFormatter.format(r.amount) : ''}</span>
                  </div>
                ))
            ) : (
                <p className="text-muted-foreground text-center">ไม่ได้เลือกอนุสัญญา</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between max-w-lg mx-auto mt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="rounded-full px-10">
          ย้อนกลับ
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังคำนวณ...
            </>
          ) : (
            'คำนวณเบี้ย'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
