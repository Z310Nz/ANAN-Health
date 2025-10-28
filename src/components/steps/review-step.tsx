'use client';

import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { PremiumFormData, Policy } from '@/lib/types';
import { getPoliciesForGender } from '@/app/actions';
import { useEffect, useState } from 'react';

type ReviewStepProps = {
  onBack: () => void;
  isLoading: boolean;
};

export default function ReviewStep({ onBack, isLoading }: ReviewStepProps) {
  const { getValues } = useFormContext<PremiumFormData>();
  const { policies: selectedPolicyIds, riders, gender } = getValues();
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

  const getPolicyName = (id: string | undefined) => {
    if (loadingPolicies) return 'Loading...';
    if (!id) return '';
    return policies?.find(p => p.id === id)?.name || id;
  }

  const selectedPolicies = selectedPolicyIds?.filter(p => p.policy);
  const selectedRiders = riders?.filter(r => r.selected);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">สรุปเบี้ยประกัน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 max-w-lg mx-auto">
        <div>
          <h3 className="font-semibold mb-2">กรมธรรม์หลัก</h3>
          <div className="space-y-2">
            {selectedPolicies && selectedPolicies.length > 0 ? (
                selectedPolicies.map((p, i) => (
                    <div key={i} className="bg-gray-100 rounded-md p-3 text-gray-700">
                        {getPolicyName(p.policy)}
                    </div>
                ))
            ) : (
                <p className="text-muted-foreground">ไม่ได้เลือกกรมธรรม์หลัก</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">อนุสัญญา</h3>
          <div className="bg-gray-100 rounded-md p-3 space-y-2">
            {selectedRiders && selectedRiders.length > 0 ? (
                selectedRiders.map((r, i) => <div key={i} className="text-gray-700">{r.name}</div>)
            ) : (
                <p className="text-muted-foreground">ไม่ได้เลือกอนุสัญญา</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between max-w-lg mx-auto">
        <Button type="button" variant="outline" onClick={onBack} disabled={isLoading} className="rounded-full px-10">ย้อนกลับ</Button>
        <Button type="submit" disabled={isLoading} className="bg-teal-500 hover:bg-teal-600 rounded-full px-10">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังคำนวณ...
            </>
          ) : (
            'ยืนยัน'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
