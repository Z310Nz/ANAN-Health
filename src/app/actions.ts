'use server';

import { calculatePremiumSummary, type PremiumCalculationInput } from "@/ai/flows/premium-calculation-preview";
import type { PremiumFormData, PremiumCalculation, YearlyPremium } from "@/lib/types";

// Mock data generation for chart and table
function generateMockBreakdown(formData: PremiumFormData): { yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] } {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  
  const totalPolicyAmount = formData.policies?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  let baseYearlyPremium = totalPolicyAmount * (0.001 + (formData.userAge - 18) * 0.0001);
  
  if (formData.gender === 'female') {
    baseYearlyPremium *= 0.95; // 5% discount for females
  }

  // Discount is applied to the base premium
  if(formData.discount) {
    baseYearlyPremium *= (100 - formData.discount) / 100;
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
