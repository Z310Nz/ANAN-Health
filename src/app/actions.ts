'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";
import postgres from 'postgres';

// Helper function to get the database connection
function getDbConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('FATAL: DATABASE_URL is not set in the environment variables.');
    throw new Error('DATABASE_URL environment variable is not defined. Please configure it in your .env file.');
  }

  // Enforce SSL connection for Supabase/cloud databases
  return postgres(connectionString, {
    ssl: 'require',
  });
}


/**
 * [READ] Check if a user exists in the database by their LINE ID.
 * @param lineId - The user's LINE ID
 * @returns The user object if found, otherwise null
 */
export async function checkUserByLineId(lineId: string) {
  const sql = getDbConnection();
  console.log(`[DB] Checking for user with line_id: ${lineId}`);
  try {
    const users = await sql`
      SELECT * FROM users
      WHERE line_id = ${lineId}
      LIMIT 1
    `;
    if (users.count > 0) {
      console.log('[DB] User found:', users[0]);
      return users[0];
    }
    console.log('[DB] User not found.');
    return null;
  } catch (error) {
    console.error('[DB] Error checking user by LINE ID:', error);
    return { error: 'Failed to query database.' };
  }
}

/**
 * [CREATE] Register a new user in the database.
 * @param userData - The user data to save
 * @returns The newly created user object
 */
export async function registerUser(userData: {
  line_id: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  display_name: string;
  picture_url?: string;
}) {
  const sql = getDbConnection();
  console.log('[DB] Registering new user with line_id:', userData.line_id);
  try {
    const result = await sql`
      INSERT INTO users (line_id, full_name, email, mobile_phone, display_name, picture_url)
      VALUES (${userData.line_id}, ${userData.full_name}, ${userData.email}, ${userData.mobile_phone}, ${userData.display_name}, ${userData.picture_url || null})
      RETURNING *
    `;
    console.log('[DB] User registered successfully:', result[0]);
    return result[0];
  } catch (error) {
    console.error('[DB] Error registering user:', error);
    throw new Error('Failed to register user.');
  }
}


/**
 * [READ] ดึงข้อมูลจากตาราง regular ทั้งหมด
 * @returns Array ของข้อมูลในตาราง regular
 */
export async function getRegularData() {
  const sql = getDbConnection();
  console.log('[DB] Fetching all data from "regular" table...');
  try {
    const data = await sql`
      SELECT * FROM regular
    `;
    console.log('[DB] Successfully fetched data from "regular":', data);
    return data;
  } catch (error) {
    console.error('[DB] Error fetching data from "regular":', error);
    throw new Error('Failed to fetch data from regular table.');
  }
}


/**
 * [READ] ดึงข้อมูลเซสชันการคำนวณทั้งหมดของผู้ใช้คนนั้นๆ
 * @param userId - ID ของผู้ใช้
 * @returns Array ของ session objects
 */
export async function getPremiumSessionsForUser(userId: string) {
  const sql = getDbConnection();
  console.log(`[DB] Fetching sessions for user: ${userId}`);
  const sessions = await sql`
    SELECT * FROM premium_calculation_sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  console.log(`[DB] Found ${sessions.length} sessions.`);
  return sessions;
}

/**
 * [CREATE] บันทึกเซสชันการคำนวณใหม่ลงในฐานข้อมูล
 * @param sessionData - ข้อมูล session ที่จะบันทึก
 * @returns ข้อมูล session ที่ถูกสร้างขึ้น
 */
export async function savePremiumSession(sessionData: { userId: string, inputData: object, calculationResult: object }) {
  const sql = getDbConnection();
  console.log('[DB] Saving new session for user:', sessionData.userId);
  const result = await sql`
    INSERT INTO premium_calculation_sessions (user_id, input_data, calculation_result)
    VALUES (${sessionData.userId}, ${JSON.stringify(sessionData.inputData)}, ${JSON.stringify(sessionData.calculationResult)})
    RETURNING *
  `;
  console.log('[DB] Session saved:', result[0]);
  return result[0];
}

/**
 * [UPDATE] อัปเดตผลลัพธ์การคำนวณของเซสชันที่มีอยู่
 * @param sessionId - ID ของเซสชันที่ต้องการอัปเดต
 * @param newResult - ข้อมูลผลลัพธ์ใหม่
 * @returns ข้อมูล session ที่ถูกอัปเดต
 */
export async function updatePremiumSessionResult(sessionId: string, newResult: object) {
  const sql = getDbConnection();
  console.log(`[DB] Updating session: ${sessionId}`);
  const result = await sql`
    UPDATE premium_calculation_sessions
    SET calculation_result = ${JSON.stringify(newResult)}, updated_at = NOW()
    WHERE id = ${sessionId}
    RETURNING *
  `;
  console.log('[DB] Session updated:', result[0]);
  return result[0];
}

/**
 * [DELETE] ลบเซสชันการคำนวณ
 * @param sessionId - ID ของเซสชันที่ต้องการลบ
 * @returns ข้อมูล session ที่ถูกลบ
 */
export async function deletePremiumSession(sessionId: string) {
  const sql = getDbConnection();
  console.log(`[DB] Deleting session: ${sessionId}`);
  const result = await sql`
    DELETE FROM premium_calculation_sessions
    WHERE id = ${sessionId}
    RETURNING *
  `;
  console.log('[DB] Session deleted:', result[0]);
  return result[0];
}


// --- Premium Calculation Functions ---

/**
 * Fetches a list of main policies for a given gender.
 * @param gender - The gender ('male' or 'female') to fetch policies for.
 * @returns A promise that resolves to an array of policies with id and name.
 */
export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Omit<Policy, 'ages'>[]> {
    // Hardcoded list of policies to bypass database connection issues for the dropdown.
    // The ID (segcode) will still be used to query the database for calculation.
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
    
    // We can still have gender-specific logic if needed in the future
    if (gender === 'male' || gender === 'female') {
        return hardcodedPolicies;
    }

    return [];
}

/**
 * Calculates the base premium for a single policy at a specific age.
 * @param age - The current age of the insured person.
 * @param gender - The gender of the insured person.
 * @param policyId - The code of the selected policy (segcode).
 * @param amount - The coverage amount for the policy.
 * @returns A promise that resolves to the calculated premium for one year.
 */
async function calculateBasePremium(age: number, gender: 'male' | 'female', policyId: string, amount: number): Promise<number> {
    const sql = getDbConnection();
    try {
        const result = await sql`
            SELECT interest FROM regular
            WHERE age = ${age}
            AND lower(gender) = ${gender}
            AND segcode = ${policyId}
            LIMIT 1
        `;

        if (result.count === 0) {
            console.warn(`Rate not found for age ${age}, gender ${gender}, policy ${policyId}.`);
            return 0;
        }

        const interest = result[0].interest;
        const premium = (amount / 1000) * interest;
        return premium;

    } catch (error) {
        console.error(`[DB] Error calculating base premium:`, error);
        throw new Error('Failed to calculate base premium.');
    }
}


async function generateBreakdown(formData: PremiumFormData): Promise<{ yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] }> {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];

  const selectedRiders = formData.riders?.filter(r => r.selected) || [];
  const ridersYearlyPremium = selectedRiders.reduce((sum, r) => sum + (r.amount || 1000) * 0.2, 0); // Mock calculation for riders

  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    
    let totalBasePremium = 0;
    if (formData.policies) {
        for (const selectedPolicy of formData.policies) {
            if (selectedPolicy.policy && selectedPolicy.amount) {
                totalBasePremium += await calculateBasePremium(currentAge, formData.gender, selectedPolicy.policy, selectedPolicy.amount);
            }
        }
    }
    
    const total = totalBasePremium + ridersYearlyPremium;
    
    yearlyBreakdown.push({
      year: i,
      base: Math.round(totalBasePremium),
      riders: Math.round(ridersYearlyPremium),
      total: Math.round(total),
    });
    
    if (formData.coveragePeriod <= 15 || i % Math.floor(formData.coveragePeriod / 15) === 1 || i === formData.coveragePeriod) {
       chartData.push({
        year: `Year ${i}`,
        Base: Math.round(totalBasePremium),
        Riders: Math.round(ridersYearlyPremium),
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
  
  try {
    const { yearlyBreakdown, chartData } = await generateBreakdown(formData);
    
    const summary = `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${formData.gender === 'male' ? 'ชาย' : 'หญิง'} อายุ ${formData.userAge} ปี การคำนวณนี้เป็นการประมาณการเบื้องต้น`;
    const note = formData.userAge > 60 ? 'หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี' : undefined;
    
    if(yearlyBreakdown.length === 0){
        throw new Error('ไม่สามารถคำนวณเบี้ยประกันได้ กรุณาตรวจสอบว่าเลือกกรมธรรม์และใส่ข้อมูลถูกต้อง');
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
