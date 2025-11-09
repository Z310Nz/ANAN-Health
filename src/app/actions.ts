'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";
import Papa from 'papaparse';
import sql from '@/lib/db.js';

// --- Database Example Functions ---

/**
 * [READ] ดึงข้อมูลจากตาราง regular ทั้งหมด
 * @returns Array ของข้อมูลในตาราง regular
 */
export async function getRegularData() {
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
  console.log(`[DB] Fetching sessions for user: ${userId}`);
  // ใช้ tagged template literal ที่ปลอดภัยในการส่งค่า parameter
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
  console.log('[DB] Saving new session for user:', sessionData.userId);
  // `sql` จะช่วยแปลง object เป็น JSON string ให้โดยอัตโนมัติ
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
  console.log(`[DB] Deleting session: ${sessionId}`);
  const result = await sql`
    DELETE FROM premium_calculation_sessions
    WHERE id = ${sessionId}
    RETURNING *
  `;
  console.log('[DB] Session deleted:', result[0]);
  return result[0];
}


// --- Original Google Sheet Functions ---

async function fetchAndParseSheet(baseUrl: string, sheetName: string): Promise<any[]> {
  // If the base URL isn't set or is still the placeholder, don't even try to fetch.
  if (!baseUrl || baseUrl.includes("YOUR_")) {
    console.error(`Google Sheet URL is not configured. Please set the appropriate environment variable.`);
    return [];
  }
  
  const sheetId = await getSheetId(baseUrl, sheetName);
  if (sheetId === null) {
      console.error(`Could not find sheet with name "${sheetName}" in the published Google Sheet. Falling back to default GID '0'. If this is not correct, please ensure the sheet name is accurate and the sheet is published.`);
      // No return here, will proceed with sheetId = null which the next line handles.
  }
  
  // Construct the correct export URL. The base URL from user is like /pubhtml. We need /export?format=csv&gid=...
  const sheetUrl = `${baseUrl.replace('/pubhtml', '/export?format=csv')}&gid=${sheetId || '0'}`;
  console.log('Fetching from URL:', sheetUrl);

  try {
    const response = await fetch(sheetUrl, { next: { revalidate: 3600 } }); // Revalidate every hour
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    // Check if the response is an HTML page (error) instead of CSV
    if (text.trim().startsWith('<!DOCTYPE html>')) {
        console.error('Received an HTML page instead of CSV. This often means the Google Sheet URL is incorrect, not published correctly, or the GID is wrong.');
        return [];
    }
    console.log('Raw CSV data received:', text.substring(0, 500) + '...'); // Log first 500 chars
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().replace(/\s+/g, '_'),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.error('Papaparse errors:', results.errors);
          }
          console.log('Parsed data:', results.data);
          resolve(results.data);
        },
        error: (error) => {
          console.error('Papaparse error:', error);
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error("Error fetching or parsing sheet:", error);
    return [];
  }
}

// Helper function to find the GID of a sheet by its name from the published HTML
async function getSheetId(baseUrl: string, sheetName: string): Promise<string | null> {
    const htmlUrl = baseUrl.replace('/pub?', '/pubhtml?');
    try {
        const response = await fetch(htmlUrl, { next: { revalidate: 3600 } });
        if (!response.ok) {
            console.warn(`Could not fetch HTML to find GID (Status: ${response.status}). Will fall back to GID '0'.`);
            return '0';
        }
        
        const html = await response.text();
        const sheetMenu = html.match(/<ul id="sheet-menu".*?>(.*?)<\/ul>/s);

        if (sheetMenu && sheetMenu[1]) {
            const links = [...sheetMenu[1].matchAll(/<a href="#gid=(\d+?)".*?>(.*?)<\/a>/g)];
            for (const link of links) {
                // link[1] is gid, link[2] is sheet name
                if (link[2] && link[2].trim().toLowerCase() === sheetName.toLowerCase()) {
                    console.log(`Found sheet "${sheetName}" with GID: ${link[1]}`);
                    return link[1]; // Found the sheet by name
                }
            }
        }

        // If 'Main' is requested and not found by name, it's often the first sheet (gid=0)
        if (sheetName.toLowerCase() === 'main') {
            console.log(`Sheet "Main" not found by name. Assuming it is the default sheet with GID '0'.`);
            return '0';
        }

    } catch (e) {
        console.error("Could not fetch sheet GID due to an error. Falling back to GID '0'.", e);
        return '0';
    }
    
    console.warn(`Sheet with name "${sheetName}" not found. Returning null.`);
    return null; // Return null if a specific sheet name is not found
}


function transformRawDataToPolicies(rawData: any[]): Policy[] {
  return rawData.map(row => {
    const ages: Record<string, number> = {};
    // Iterate over the keys in the row to find age columns
    for (const key in row) {
      // Check if the key is a number (representing an age) and has a value
      if (!isNaN(Number(key)) && row[key] !== null && row[key] !== undefined) {
        ages[key] = Number(row[key]);
      }
    }
    return {
      id: row.segment_Code,
      name: row.segment,
      ages: ages,
    };
  }).filter(p => p.id && p.name); // Filter out rows without id or name
}


export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Omit<Policy, 'ages'>[]> {
  const url = gender === 'male' 
    ? process.env.GOOGLE_SHEET_MALE_URL
    : process.env.GOOGLE_SHEET_FEMALE_URL;

  if (!url) {
    console.error(`Google Sheet URL for ${gender} is not defined in environment variables.`);
    return [];
  }
  
  const rawData = await fetchAndParseSheet(url, 'Main');
  console.log('Raw data for policy transformation:', rawData);
  const policies = transformRawDataToPolicies(rawData);
  // Return only id and name for the selection list, which is what the component needs
  const selectionList = policies.map(({ id, name }) => ({ id, name, ages: {} }));
  console.log('Transformed policies for dropdown:', selectionList);
  return selectionList;
}


function calculateBasePremium(age: number, mainPolicy: { policy?: string, amount?: number }, policies: Policy[]): number {
    if (!mainPolicy.policy || !mainPolicy.amount) {
        return 0;
    }
    
    const policyData = policies.find(p => p.id === mainPolicy.policy);

    if (!policyData || !policyData.ages || policyData.ages[age] === undefined || policyData.ages[age] === null) {
        console.warn(`Rate for age ${age} in policy ${mainPolicy.policy} not found.`);
        return 0;
    }
    
    const ratePer1000 = policyData.ages[age];
    const premium = (mainPolicy.amount / 1000) * ratePer1000;
    
    return premium;
}


async function generateBreakdown(formData: PremiumFormData): Promise<{ yearlyBreakdown: YearlyPremium[], chartData: PremiumCalculation['chartData'] }> {
  const yearlyBreakdown: YearlyPremium[] = [];
  const chartData: PremiumCalculation['chartData'] = [];

  const sheetUrl = formData.gender === 'male' 
    ? process.env.GOOGLE_SHEET_MALE_URL
    : process.env.GOOGLE_SHEET_FEMALE_URL;

  if (!sheetUrl) {
    throw new Error(`Google Sheet URL for ${formData.gender} is not configured.`);
  }

  const policiesRaw = await fetchAndParseSheet(sheetUrl, 'Main');
  const relevantPolicies = transformRawDataToPolicies(policiesRaw);

  // For this simplified example, we'll assume riders have a fixed cost per year.
  // A real implementation would fetch rider rates from a sheet as well.
  const selectedRiders = formData.riders?.filter(r => r.selected) || [];
  const ridersYearlyPremium = selectedRiders.reduce((sum, r) => sum + (r.amount || 1000) * 0.2, 0); // Mock calculation for riders

  for (let i = 1; i <= formData.coveragePeriod; i++) {
    const currentAge = formData.userAge + i - 1;
    
    let totalBasePremium = 0;
    if (formData.policies) {
        for (const selectedPolicy of formData.policies) {
            totalBasePremium += calculateBasePremium(currentAge, selectedPolicy, relevantPolicies);
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
    
    // Simple summary, can be enhanced with GenAI later
    const summary = `นี่คือตัวอย่างสรุปเบี้ยประกันสำหรับเพศ ${formData.gender === 'male' ? 'ชาย' : 'หญิง'} อายุ ${formData.userAge} ปี การคำนวณนี้เป็นการประมาณการเบื้องต้นจากข้อมูลใน Google Sheet`;
    const note = formData.userAge > 60 ? 'หมายเหตุ: เบี้ยประกันอาจสูงขึ้นสำหรับผู้ที่มีอายุเกิน 60 ปี' : undefined;
    
    if(yearlyBreakdown.length === 0){
        throw new Error('Could not calculate premium. Please check if the Google Sheet is configured correctly and if the age range is valid.');
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
