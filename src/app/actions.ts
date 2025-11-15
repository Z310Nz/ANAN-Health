"use server";

import type {
  PremiumFormData,
  PremiumCalculation,
  YearlyPremium,
  Policy,
  Rider,
} from "@/lib/types";

// --- User Management Functions (Mocks) ---

export async function checkUserByLineId(lineId: string) {
  console.log(`[MOCK] Checking user: ${lineId}`);
  // In a real scenario, you'd check your database.
  // Returning null simulates an unregistered user for testing.
  // Returning a user object simulates a registered user.
  return {
    id: 'mock-user-id-123',
    line_id: lineId,
    full_name: 'Mock User',
    email: 'mock@example.com',
    mobile_phone: '0812345678',
    display_name: 'Mock Display Name',
    picture_url: 'https://placehold.co/100x100',
  };
}

export async function registerUser(userData: {
  line_id: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  display_name: string;
  picture_url?: string;
}) {
  console.log("[MOCK] Registering new user:", userData);
  // Simulate successful registration
  return { ...userData, id: "mock-user-id-new" };
}

export async function getPremiumSessionsForUser(userId: string) {
  console.log(`[MOCK] Fetching sessions for user: ${userId}`);
  return [];
}

export async function savePremiumSession(sessionData: {
  userId: string;
  inputData: object;
  calculationResult: object;
}) {
  console.log("[MOCK] Saving new session for user:", sessionData.userId);
  return {
    id: "session_mock_123",
    ...sessionData,
    created_at: new Date().toISOString(),
  };
}

export async function updatePremiumSessionResult(
  sessionId: string,
  newResult: object
) {
  console.log(`[MOCK] Updating session: ${sessionId}`);
  return {
    id: sessionId,
    calculation_result: newResult,
    updated_at: new Date().toISOString(),
  };
}

export async function deletePremiumSession(sessionId: string) {
  console.log(`[MOCK] Deleting session: ${sessionId}`);
  return { id: sessionId };
}

// --- Premium Calculation Functions ---

// This function now calculates the ANNUAL premium for the main policy
function calculateMainPolicyAnnualPremium(formData: PremiumFormData): number {
  const mainPolicy = formData.policies?.[0];
  if (!mainPolicy?.policy || !mainPolicy.amount) {
    return 0;
  }
  // Formula: (Policy Amount / 1000)
  // This is interpreted as an annual premium, not total.
  return (mainPolicy.amount / 1000);
}


function getRiderDivisor(riderName: string): number {
    const ridersDividedBy100000 = [
        "Care for Cancer", "Health Cancer", "Multi-Pay CI Plus + Total care",
        "CI Plus", "CI Top Up", "TPD", "AI/RCC", "ADD/RCC", "ADB/RCC"
    ];
    if (ridersDividedBy100000.includes(riderName)) {
        return 100000;
    }
    // "HB" and "HB Extra" are divided by 1000
    if (["HB", "HB Extra"].includes(riderName)) {
        return 1000;
    }
    // Default for other riders (Health, H&S, etc.) is 0, as they don't follow the provided formula.
    return 0;
}


// This function now calculates the total ANNUAL premium for all selected riders
function calculateRidersAnnualPremium(formData: PremiumFormData): number {
  if (!formData.riders) {
    return 0;
  }

  return formData.riders.reduce((total, rider) => {
    if (rider.selected && rider.amount) {
        const divisor = getRiderDivisor(rider.name);
        if (divisor > 0) {
            // Formula: (Rider Amount / Divisor)
            // This is interpreted as an annual premium.
            return total + (rider.amount / divisor);
        }
    }
    return total;
  }, 0);
}


async function generateBreakdown(formData: PremiumFormData): Promise<{
  yearlyBreakdown: YearlyPremium[];
  chartData: PremiumCalculation["chartData"];
}> {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation["chartData"] = [];

  const mainPolicyAnnualPremium = calculateMainPolicyAnnualPremium(formData);
  const ridersAnnualPremium = calculateRidersAnnualPremium(formData);
  const totalAnnualPremium = mainPolicyAnnualPremium + ridersAnnualPremium;
  
  if (totalAnnualPremium <= 0) {
      throw new Error("Could not calculate premium. Please check policy and rider amounts.");
  }

  for (let i = 0; i < formData.coveragePeriod; i++) {
    const year = i + 1;

    // Premiums are constant per year in this new logic
    yearlyBreakdown.push({
      year: year,
      base: Math.round(mainPolicyAnnualPremium),
      riders: Math.round(ridersAnnualPremium),
      total: Math.round(totalAnnualPremium),
    });

    if (
      formData.coveragePeriod <= 15 ||
      i % Math.floor(formData.coveragePeriod / 15) === 0 ||
      i === formData.coveragePeriod - 1
    ) {
      chartData.push({
        year: `Year ${year}`,
        Base: Math.round(mainPolicyAnnualPremium),
        Riders: Math.round(ridersAnnualPremium),
        Total: Math.round(totalAnnualPremium),
      });
    }
  }

  return { yearlyBreakdown, chartData };
}

export async function getPoliciesForGender(
  gender: "male" | "female"
): Promise<Omit<Policy, "ages">[]> {
  console.log(`[HARDCODED] Fetching policies for gender: ${gender}`);
  const hardcodedPolicies: Omit<Policy, "ages">[] = [
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
  return hardcodedPolicies;
}

export async function getPremiumSummary(
  formData: PremiumFormData
): Promise<PremiumCalculation> {
  console.log("Calculating premium with form data:", formData);

  try {
    const { yearlyBreakdown, chartData } = await generateBreakdown(formData);

    if (yearlyBreakdown.length === 0) {
      throw new Error("Could not calculate premium breakdown.");
    }
    
    const totalAnnualPremium = yearlyBreakdown[0]?.total || 0;

    const summary = `เบี้ยประกันรายปีโดยประมาณของคุณคือ ${totalAnnualPremium.toLocaleString('th-TH')} บาท สำหรับเพศ ${
      formData.gender === "male" ? "ชาย" : "หญิง"
    } อายุ ${formData.userAge} ปี`;
    const note =
      formData.userAge > 60
        ? "หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี"
        : "เบี้ยประกันนี้เป็นเพียงการประมาณการเบื้องต้น";

    return {
      summary,
      note,
      yearlyBreakdown,
      chartData,
    };
  } catch (error) {
    console.error("Error in getPremiumSummary server action:", error);
    const message =
      error instanceof Error
        ? error.message
        : "ไม่สามารถคำนวณเบี้ยประกันได้ กรุณาลองใหม่อีกครั้ง";
    throw new Error(message);
  }
}
