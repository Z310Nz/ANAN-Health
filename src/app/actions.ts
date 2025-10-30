'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";
import Papa from 'papaparse';

async function fetchAndParseSheet(baseUrl: string, sheetName: string): Promise<any[]> {
  // If the base URL isn't set or is still the placeholder, don't even try to fetch.
  if (!baseUrl || baseUrl.includes("YOUR_")) {
    console.error(`Google Sheet URL is not configured. Please set the appropriate environment variable.`);
    return [];
  }
  
  const sheetId = await getSheetId(baseUrl, sheetName);
  if (sheetId === null) {
      console.error(`Could not find sheet with name "${sheetName}" in the published Google Sheet.`);
      return [];
  }
  
  const sheetUrl = `${baseUrl.replace('/pub?', '/pubhtml?').replace('/pubhtml', '/export?format=csv&gid=')}${sheetId}`;

  try {
    const response = await fetch(sheetUrl, { next: { revalidate: 3600 } }); // Revalidate every hour
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.statusText}`);
    }
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
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
        if (!response.ok) return '0'; // Default to first sheet if we can't fetch
        const html = await response.text();
        const sheetMenu = html.match(/<ul id="sheet-menu">(.*?)<\/ul>/);
        if (sheetMenu) {
            const links = sheetMenu[1].matchAll(/<a href="#gid=(\d+?)">(.*?)<\/a>/g);
            for (const link of links) {
                if (link[2].trim().toLowerCase() === sheetName.toLowerCase()) {
                    return link[1];
                }
            }
        }
    } catch (e) {
        console.error("Could not fetch sheet GID, defaulting to 0", e);
    }
    // If we are here, it means we couldn't find the sheet by name.
    // Let's check if the sheetName is 'Main' and we didn't find it, maybe it's the first one.
    if (sheetName.toLowerCase() === 'main') {
        return '0';
    }
    return null; // Return null if a specific sheet name (other than 'Main') is not found
}


function transformRawDataToPolicies(rawData: any[]): Policy[] {
  return rawData.map(row => {
    const ages: Record<string, number> = {};
    // Iterate over the keys in the row to find age columns
    for (const key in row) {
      // Check if the key is a number (representing an age)
      if (!isNaN(Number(key)) && row[key] !== null && row[key] !== undefined) {
        ages[key] = row[key];
      }
    }
    return {
      id: row.id,
      name: row.name,
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
  const policies = transformRawDataToPolicies(rawData);
  // Return only id and name for the selection list
  return policies.map(({ id, name }) => ({ id, name, ages: {} }));
}


function calculateBasePremium(age: number, mainPolicy: { policy?: string, amount?: number }, policies: Policy[]): number {
    if (!mainPolicy.policy || !mainPolicy.amount) {
        return 0;
    }
    
    const policyData = policies.find(p => p.id === mainPolicy.policy);

    if (!policyData || !policyData.ages || policyData.ages[age] === undefined || policyData.ages[age] === null) {
        // Rate for the specific age not found, return 0 or handle as an error
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
