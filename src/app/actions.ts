'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in the environment variables.');
}

// --- User Management Functions ---

export async function checkUserByLineId(lineId: string) {
  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    const users = await sql`SELECT * FROM users WHERE line_id = ${lineId}`;
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error checking user by LINE ID:', error);
    return { error: 'Failed to query user.' };
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
  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    const newUser = await sql`
      INSERT INTO users (line_id, full_name, email, mobile_phone, display_name, picture_url)
      VALUES (${userData.line_id}, ${userData.full_name}, ${userData.email}, ${userData.mobile_phone}, ${userData.display_name}, ${userData.picture_url})
      RETURNING *
    `;
    return newUser[0];
  } catch (error) {
    console.error('Error registering user:', error);
    throw new Error('Failed to register user.');
  }
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

async function calculateBasePremium(age: number, gender: 'male' | 'female', policyId: string, policyAmount: number): Promise<number> {
  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    const result = await sql`
      SELECT interest FROM regular
      WHERE age = ${age}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode = ${policyId}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.warn(`No interest rate found for age: ${age}, gender: ${gender}, policy: ${policyId}`);
      return 0; // Return 0 if no rate is found for that year
    }
    
    const interest = result[0].interest;
    const premium = (policyAmount / 1000) * interest;
    return premium;

  } catch (error) {
    console.error('Error calculating base premium:', error);
    throw new Error('Failed to calculate base premium.');
  }
}

function calculateRidersPremium(formData: PremiumFormData): number {
  // This is a mock calculation for riders.
  // In a real scenario, this would also involve database lookups.
  return (formData.riders?.filter(r => r.selected).length || 0) * 1500;
}

async function generateBreakdown(formData: PremiumFormData): Promise<{ yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] }> {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];
  
  const mainPolicy = formData.policies?.[0];
  if (!mainPolicy?.policy || !mainPolicy.amount) {
    throw new Error('Main policy information is missing.');
  }

  const ridersPremium = calculateRidersPremium(formData);

  for (let i = 0; i < formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i;
    const year = i + 1;
    
    const basePremium = await calculateBasePremium(currentAge, formData.gender, mainPolicy.policy, mainPolicy.amount);
    
    const totalPremium = basePremium + ridersPremium;
    
    yearlyBreakdown.push({
      year: year,
      base: Math.round(basePremium),
      riders: Math.round(ridersPremium),
      total: Math.round(totalPremium),
    });

    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 0 || i === formData.coveragePeriod - 1) {
       chartData.push({
        year: `Year ${year}`,
        Base: Math.round(basePremium),
        Riders: Math.round(ridersPremium),
        Total: Math.round(totalPremium)
      });
    }
  }

  return { yearlyBreakdown, chartData };
}

export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Omit<Policy, 'ages'>[]> {
  const sql = postgres(connectionString, { ssl: 'require' });
  try {
    const policies = await sql<Omit<Policy, 'ages'>[]>`
      SELECT DISTINCT segcode as id, segment as name
      FROM regular
      WHERE lower(gender) = ${gender.toLowerCase()}
      ORDER BY segment
    `;
    if (!policies || policies.length === 0) {
      throw new Error('No policies found for the specified gender.');
    }
    return policies;
  } catch (error) {
    console.error('Error fetching policies:', error);
    throw new Error('Failed to fetch policies.');
  }
}

export async function getPremiumSummary(formData: PremiumFormData): Promise<PremiumCalculation> {
  console.log("Calculating premium with form data:", formData);
  
  try {
    const { yearlyBreakdown, chartData } = await generateBreakdown(formData);
    
    if(yearlyBreakdown.length === 0){
        throw new Error('Could not calculate premium breakdown.');
    }

    const summary = `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${formData.gender === 'male' ? 'ชาย' : 'หญิง'} อายุ ${formData.userAge} ปี`;
    const note = formData.userAge > 60 ? 'หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี' : undefined;

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
