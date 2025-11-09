'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";

// This file is now using mock data and calculations to bypass database connection issues.
// The logic from the original actions.ts that connected to Supabase is now in actions_original.ts for reference.

export async function checkUserByLineId(lineId: string) {
  console.log(`[MOCK] Checking for user with line_id: ${lineId}`);
  // For testing, assume the user is always found if they are a mock user.
  if (lineId.startsWith('U-mock-')) {
    return { line_id: lineId, full_name: 'Test User' };
  }
  // In a real scenario, you might want to return null to test the registration flow.
  return null;
}

export async function registerUser(userData: {
  line_id: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  display_name: string;
  picture_url?: string;
}) {
  console.log('[MOCK] Registering new user with line_id:', userData.line_id);
  // Return a mock user object.
  return { ...userData, created_at: new Date().toISOString() };
}

export async function getRegularData() {
    console.log('[MOCK] Fetching all data from "regular" table...');
    return [];
}

export async function getPremiumSessionsForUser(userId: string) {
    console.log(`[MOCK] Fetching sessions for user: ${userId}`);
    return [];
}

export async function savePremiumSession(sessionData: { userId: string, inputData: object, calculationResult: object }) {
    console.log('[MOCK] Saving new session for user:', sessionData.userId);
    return { id: 'session_mock_123', ...sessionData, created_at: new Date().toISOString() };
}

export async function updatePremiumSessionResult(sessionId: string, newResult: object) {
    console.log(`[MOCK] Updating session: ${sessionId}`);
    return { id: sessionId, calculation_result: newResult, updated_at: new Date().toISOString() };
}

export async function deletePremiumSession(sessionId: string) {
    console.log(`[MOCK] Deleting session: ${sessionId}`);
    return { id: sessionId };
}


// --- Premium Calculation Functions ---

export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Omit<Policy, 'ages'>[]> {
    const hardcodedPolicies = [
        { id: "20PLN", name: "AIA 20 Pay Life (Non Par)" },
        { id: "15Pay25", name: "AIA Endowment 15/25 (Non Par)" },
        { id: "Excel", name: "AIA Excellent (Non Par)" },
        { id: "CISC10", name: "AIA CI SuperCare 10/99" },
        { id: "CISC20", name: "AIA CI SuperCare 20/99" },
        { id: "CIPC", name: "AIA CI ProCare" },
        { id: "AnnFix", name: "AIA Annuity FIX" },
        { id: "AnnSure60", name: "AIA Annuity Sure 60" },
        { id: "AnnSure9", name: "AIA Annuity Sure 9" },
        { id: "10PLP", name: "AIA Pay Life Plus (Non Par) 10" },
        { id: "15PLP", name: "AIA Pay Life Plus (Non Par) 15" },
        { id: "20PLP", name: "AIA Pay Life Plus (Non Par) 20" },
        { id: "10PLN", name: "AIA 10 Pay Life (Non Par)" },
        { id: "15PLN", name: "AIA 15 Pay Life (Non Par)" },
        { id: "SVS", name: "AIA Saving Sure (Non Par)" },
        { id: "ALP10", name: "AIA Legacy Prestige Plus 10" },
        { id: "ALP15", name: "AIA Legacy Prestige Plus 15" },
        { id: "ALP20", name: "AIA Legacy Prestige Plus 20" },
    ];
    
    if (gender === 'male' || gender === 'female') {
        return hardcodedPolicies;
    }

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
