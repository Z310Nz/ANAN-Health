'use server';

import { calculatePremiumSummary, type PremiumCalculationInput } from "@/ai/flows/premium-calculation-preview";
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
  { id: 'AnnSure9', name: 'AIA Annuity Sure 9' },
  { id: '10PLP', name: 'AIA Pay Life Plus (Non Par) 10' },
  { id: '15PLP', name: 'AIA Pay Life Plus (Non Par) 15' },
  { id: '20PLP', name: 'AIA Pay Life Plus (Non Par) 20' },
  { id: '10PLN', name: 'AIA 10 Pay Life (Non Par)' },
  { id: '15PLN', name: 'AIA 15 Pay Life (Non Par)' },
  { id: 'SVS', name: 'AIA Saving Sure (Non Par)' },
  { id: 'ALP10', name: 'AIA Legacy Prestige Plus 10' },
  { id: 'ALP10(20plus)', name: 'AIA Legacy Prestige Plus 10 (20M+)' },
  { id: 'ALP15', name: 'AIA Legacy Prestige Plus 15' },
  { id: 'ALP15(20plus)', name: 'AIA Legacy Prestige Plus 15 (20M+)' },
  { id: 'ALP20', name: 'AIA Legacy Prestige Plus 20' },
  { id: 'ALP20(20plus)', name: 'AIA Legacy Prestige Plus 20 (20M+)' }
];

const FEMALE_POLICIES: Policy[] = MALE_POLICIES; // Assuming they are the same for this mock

async function getPolicies(gender: 'male' | 'female'): Promise<Policy[]> {
  // This function now returns mock data, simulating a direct fetch from a source like Google Sheets.
  console.log(`Fetching policies for ${gender}`);
  if (gender === 'male') {
    return MALE_POLICIES;
  }
  return FEMALE_POLICIES;
}


// Mock data generation for chart and table
function generateMockBreakdown(formData: PremiumFormData): { yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] } {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  
  const totalPolicyAmount = formData.policies?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  let baseYearlyPremium = totalPolicyAmount * (0.001 + (formData.userAge - 18) * 0.0001);
  
  if (formData.gender === 'female') {
    baseYearlyPremium *= 0.95; // 5% discount for females
  }

  const selectedRiders = formData.riders?.filter(r => r.selected) || [];
  const ridersYearlyPremium = selectedRiders.reduce((sum, r) => sum + (r.amount || 0), 0);


  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    // Increase base premium slightly with age
    const base = baseYearlyPremium * (1 + (currentAge - formData.userAge) * 0.02);
    const ridersCost = ridersYearlyPremium * (1 + (currentAge - formData.userAge) * 0.01);
    const total = base + ridersCost;
    
    yearlyBreakdown.push({
      year: i,
      base: Math.round(base),
      riders: Math.round(ridersCost),
      total: Math.round(total),
    });
    
    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 0 || i === 1 || i === formData.coveragePeriod) {
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
  try {
    const totalPolicyAmount = formData.policies?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    const ridersList = formData.riders?.filter(r => r.selected).map(r => r.name) || [];

    const input: PremiumCalculationInput = {
      coverageAmount: totalPolicyAmount,
      coveragePeriod: formData.coveragePeriod,
      userAge: formData.userAge,
      riders: ridersList,
    };

    const aiResult = await calculatePremiumSummary(input);

    const { yearlyBreakdown, chartData } = generateMockBreakdown(formData);
    
    return {
      summary: aiResult.summary,
      note: aiResult.note,
      yearlyBreakdown,
      chartData,
    };
  } catch (error) {
    console.error('Error in getPremiumSummary server action:', error);
    // In a real app, you might want to log this error to a monitoring service
    throw new Error('Failed to calculate premium summary. Please try again later.');
  }
}

export async function getPoliciesForGender(gender: 'male' | 'female') {
    return getPolicies(gender);
}
