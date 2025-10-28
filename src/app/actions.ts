'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";

const MALE_POLICIES: Policy[] = [
  { id: '20PLN', name: 'AIA 20 Pay Life (Non Par)' },
  { id: '15Pay25', name: 'AIA Endowment 15/25 (Non Par)' },
  { id: 'Excel', name: 'AIA Excellent (Non Par)' },
  { id: 'CISC10', name: 'AIA CI SuperCare 10/99' },
  { id: 'CISC20', name: 'AIA CI SuperCare 20/99' },
  { id: 'CIPC', name: 'AIA CI ProCare' },
  { id: 'AnnFix', name: 'AIA Annuity FIX' },
  { id: 'AnnSure60', name: 'AIA Annuity Sure 60' },
];

const FEMALE_POLICIES: Policy[] = MALE_POLICIES; // Assuming they are the same for this mock

export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Policy[]> {
  console.log(`Fetching policies for ${gender}`);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  if (gender === 'male') {
    return MALE_POLICIES;
  }
  return FEMALE_POLICIES;
}

function generateMockBreakdown(formData: PremiumFormData): { yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] } {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  
  const totalPolicyAmount = formData.policies?.reduce((sum, p) => sum + (p.amount || 0), 0) || 500000;
  
  let baseYearlyPremium = totalPolicyAmount * (0.02 + (formData.userAge - 18) * 0.0005);
  
  if (formData.gender === 'female') {
    baseYearlyPremium *= 0.95;
  }

  const selectedRiders = formData.riders?.filter(r => r.selected) || [];
  const ridersYearlyPremium = selectedRiders.reduce((sum, r) => sum + ((r.amount || 1000) * 0.1), 0);

  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    const ageFactor = 1 + (currentAge - formData.userAge) * 0.015;
    const base = baseYearlyPremium * ageFactor;
    const ridersCost = ridersYearlyPremium * ageFactor;
    const total = base + ridersCost;
    
    yearlyBreakdown.push({
      year: i,
      base: Math.round(base),
      riders: Math.round(ridersCost),
      total: Math.round(total),
    });
    
    // For chart, sample ~15 points for better readability
    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 1 || i === formData.coveragePeriod) {
       chartData.push({
        year: `Year ${i}`,
        Base: Math.round(base),
        Riders: Math.round(ridersCost),
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
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing time
  
  try {
    const { yearlyBreakdown, chartData } = generateMockBreakdown(formData);
    
    const mockAiResult = {
      summary: `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${formData.gender === 'male' ? 'ชาย' : 'หญิง'} อายุ ${formData.userAge} ปี การคำนวณนี้เป็นการประมาณการเบื้องต้นเท่านั้น`,
      note: formData.userAge > 60 ? 'หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี เนื่องจากความเสี่ยงที่เพิ่มขึ้น' : undefined,
    };
    
    return {
      summary: mockAiResult.summary,
      note: mockAiResult.note,
      yearlyBreakdown,
      chartData,
    };
  } catch (error) {
    console.error('Error in getPremiumSummary server action:', error);
    throw new Error('ไม่สามารถคำนวณเบี้ยประกันได้ กรุณาลองใหม่อีกครั้ง');
  }
}
