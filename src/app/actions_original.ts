'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";

// This file is now using DOMParser, which is not available in this environment.
// The logic has been moved to actions.ts and this file is kept for historical reference.
// We are returning empty arrays and mock data to prevent build errors.

export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Omit<Policy, 'ages'>[]> {
  console.log(`Fetching policies for gender: ${gender}`);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
}

function calculateMockPremium(formData: PremiumFormData): { yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] } {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  
  const basePremiumStart = formData.userAge * 50 + (formData.policies?.[0]?.amount || 50000) * 0.02;
  const ridersPremium = (formData.riders?.filter(r => r.selected).length || 0) * 1500;

  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    const base = basePremiumStart + (currentAge - formData.userAge) * 100;
    const total = base + ridersPremium;
    
    yearlyBreakdown.push({
      year: i,
      base: Math.round(base),
      riders: Math.round(ridersPremium),
      total: Math.round(total),
    });
    
    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 1 || i === formData.coveragePeriod) {
       chartData.push({
        year: `Year ${i}`,
        Base: Math.round(base),
        Riders: Math.round(ridersPremium),
        Total: Math.round(total)
      });
    }
  }

  return { yearlyBreakdown, chartData };
}

export async function getPremiumSummary(
  formData: PremiumFormData
): Promise<PremiumCalculation> {
  console.log("Calculating premium with form data:", formData);
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  try {
    const { yearlyBreakdown, chartData } = calculateMockPremium(formData);
    
    const summary = `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${formData.gender === 'male' ? 'ชาย' : 'หญิง'} อายุ ${formData.userAge} ปี`;
    const note = formData.userAge > 60 ? 'หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี' : undefined;
    
    if(yearlyBreakdown.length === 0){
        throw new Error('Could not calculate premium');
    }

    return {
      summary,
      note,
      yearlyBreakdown,
      chartData,
    };
  } catch (error) {
    console.error('Error in getPremiumSummary server action:', error);
    const message = error instanceof Error ? error.message : 'ไม่สามารถคำนวณเบี้ยประกันได้ กรุณาลองใหม่อีกครั้ง';
    throw new Error(message);
  }
}
