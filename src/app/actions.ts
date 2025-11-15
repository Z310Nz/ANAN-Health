"use server";

import type {
  PremiumFormData,
  PremiumCalculation,
  YearlyPremium,
  Policy,
} from "@/lib/types";
import postgres from "postgres";
import { getSqlClient, testDbConnection } from "@/lib/db";
import getLocalInterest from "@/lib/interestRates";

const connectionString = process.env.DATABASE_URL;

// --- User Management Functions ---

export async function checkUserByLineId(lineId: string) {
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Skipping user check.");
    // Return a mock unregistered user to allow testing registration flow.
    return null;
  }
  let sql;
  try {
    sql = getSqlClient();
  } catch (err) {
    console.error("DB client could not be created:", err);
    return { error: "DB client unavailable" };
  }
  try {
    const users = await sql`SELECT * FROM users WHERE line_id = ${lineId}`;
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error("Error checking user by LINE ID:", error);
    return { error: "Failed to query user." };
  }
}

export async function registerUser(userData: {
  line_id: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  display_name: string;
  picture_url?: string;
}) {
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Mocking user registration.");
    return { ...userData, id: "mock-user-id" };
  }
  let sql;
  try {
    sql = getSqlClient();
  } catch (err) {
    console.error("DB client could not be created:", err);
    return { ...userData, id: "mock-user-id" };
  }
  try {
    const newUser = await sql`
      INSERT INTO users (line_id, full_name, email, mobile_phone, display_name, picture_url)
      VALUES (${userData.line_id}, ${userData.full_name}, ${userData.email}, ${
      userData.mobile_phone
    }, ${userData.display_name}, ${userData.picture_url ?? null})
      RETURNING *
    `;
    return newUser[0];
  } catch (error) {
    console.error("Error registering user:", error);
    throw new Error("Failed to register user.");
  }
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

async function calculateBasePremium(
  age: number,
  gender: "male" | "female",
  policyId: string,
  policyAmount: number
): Promise<number> {
  // If DATABASE_URL is not set or DB host cannot be resolved, fall back to local rates
  if (!connectionString) {
    console.warn(
      "DATABASE_URL is not set — using local fallback interest rates for development."
    );
    const interest = getLocalInterest(age, gender, policyId);
    if (interest === null) return 0;
    return (policyAmount / 1000) * interest;
  }

  const sql = postgres(connectionString, { ssl: "require" });
  try {
    const result = await sql`
      SELECT interest FROM regular
      WHERE age = ${age}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode = ${policyId}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.warn(
        `No interest rate found for age: ${age}, gender: ${gender}, segcode: ${policyId} — falling back to local rates.`
      );
      const interest = getLocalInterest(age, gender, policyId);
      if (interest === null) return 0;
      return (policyAmount / 1000) * interest;
    }

    const interest = result[0].interest;
    const premium = (policyAmount / 1000) * interest;
    return premium;
  } catch (error) {
    console.error("Error calculating base premium:", error);
    // Try fallback to local rates in case of DNS/network issue
    const interest = getLocalInterest(age, gender, policyId);
    if (interest !== null) {
      console.warn("Using local fallback interest due to DB error.");
      return (policyAmount / 1000) * interest;
    }
    throw new Error("Failed to calculate base premium.");
  }
}

function calculateRidersPremium(formData: PremiumFormData): number {
  // This is a mock calculation for riders.
  // In a real scenario, this would also involve database lookups.
  return (formData.riders?.filter((r) => r.selected).length || 0) * 1500;
}

async function generateBreakdown(formData: PremiumFormData): Promise<{
  yearlyBreakdown: YearlyPremium[];
  chartData: PremiumCalculation["chartData"];
}> {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation["chartData"] = [];

  const mainPolicy = formData.policies?.[0];
  if (!mainPolicy?.policy || !mainPolicy.amount) {
    throw new Error("Main policy information is missing.");
  }

  const ridersPremium = calculateRidersPremium(formData);

  for (let i = 0; i < formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i;
    const year = i + 1;

    const basePremium = await calculateBasePremium(
      currentAge,
      formData.gender,
      mainPolicy.policy,
      mainPolicy.amount
    );

    const totalPremium = basePremium + ridersPremium;

    yearlyBreakdown.push({
      year: year,
      base: Math.round(basePremium),
      riders: Math.round(ridersPremium),
      total: Math.round(totalPremium),
    });

    if (
      formData.coveragePeriod <= 15 ||
      i % Math.floor(formData.coveragePeriod / 15) === 0 ||
      i === formData.coveragePeriod - 1
    ) {
      chartData.push({
        year: `Year ${year}`,
        Base: Math.round(basePremium),
        Riders: Math.round(ridersPremium),
        Total: Math.round(totalPremium),
      });
    }
  }

  return { yearlyBreakdown, chartData };
}

export async function getPoliciesForGender(
  gender: "male" | "female"
): Promise<Omit<Policy, "ages">[]> {
  // Reverting to hardcoded policies as requested to bypass DB connection issues for the dropdown.
  // The actual calculation will still try to hit the database.
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

  if (!connectionString) {
    console.warn(
      "DATABASE_URL is not set; proceeding with local fallback rates for premium calculations."
    );
  }

  try {
    const { yearlyBreakdown, chartData } = await generateBreakdown(formData);

    if (yearlyBreakdown.length === 0) {
      throw new Error("Could not calculate premium breakdown.");
    }

    const summary = `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${
      formData.gender === "male" ? "ชาย" : "หญิง"
    } อายุ ${formData.userAge} ปี`;
    const note =
      formData.userAge > 60
        ? "หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี"
        : undefined;

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