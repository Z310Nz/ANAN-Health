'use server';

import { calculatePremiumSummary, type PremiumCalculationInput } from "@/ai/flows/premium-calculation-preview";
import type { PremiumFormData, PremiumCalculation, YearlyPremium } from "@/lib/types";

// Mock data generation for chart and table
function generateMockBreakdown(formData: PremiumFormData): { yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] } {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  let baseYearlyPremium = formData.coverageAmount * (0.001 + (formData.userAge - 18) * 0.0001);
  
  if (formData.gender === 'female') {
    baseYearlyPremium *= 0.95; // 5% discount for females
  }

  const ridersYearlyPremium = (formData.riders?.length || 0) * 150;

  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    // Increase base premium slightly with age
    const base = baseYearlyPremium * (1 + (currentAge - formData.userAge) * 0.02);
    const riders = ridersYearlyPremium;
    const total = base + riders;
    
    yearlyBreakdown.push({
      year: i,
      base: Math.round(base),
      riders: Math.round(riders),
      total: Math.round(total),
    });
    
    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 0 || i === 1 || i === formData.coveragePeriod) {
       chartData.push({
        year: `Year ${i}`,
        Base: Math.round(base),
        Riders: Math.round(riders),
      });
    }
  }

  return { yearlyBreakdown, chartData };
}

export async function getPremiumSummary(
  formData: PremiumFormData
): Promise<PremiumCalculation> {
  try {
    const input: PremiumCalculationInput = {
      coverageAmount: formData.coverageAmount,
      coveragePeriod: formData.coveragePeriod,
      userAge: formData.userAge,
      riders: formData.riders || [],
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
