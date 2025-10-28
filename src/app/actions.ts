'use server';

import type { PremiumFormData, PremiumCalculation, YearlyPremium, Policy } from "@/lib/types";
import Papa from 'papaparse';

async function fetchAndParseSheet(url: string): Promise<any[]> {
  if (!url || url === "YOUR_MALE_CSV_URL_HERE" || url === "YOUR_FEMALE_CSV_URL_HERE") {
    console.error("Google Sheet URL is not configured. Please set it in .env.local");
    // Return a default structure to avoid crashing the app
    return [];
  }
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Revalidate every hour
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

function transformRawDataToPolicies(rawData: any[]): Policy[] {
  return rawData.map(row => {
    const ages: Record<string, number> = {};
    // Iterate over the keys in the row to find age columns
    for (const key in row) {
      // Check if the key is a number (representing an age)
      if (!isNaN(Number(key))) {
        ages[key] = row[key];
      }
    }
    return {
      id: row.id,
      name: row.name,
      ages: ages,
    };
  });
}

export async function getPoliciesForGender(gender: 'male' | 'female'): Promise<Policy[]> {
  const url = gender === 'male' 
    ? process.env.GOOGLE_SHEET_MALE_CSV_URL
    : process.env.GOOGLE_SHEET_FEMALE_CSV_URL;

  if (!url) {
    return [];
  }
  
  const rawData = await fetchAndParseSheet(url);
  const policies = transformRawDataToPolicies(rawData);
  // Return only id and name for the selection list
  return policies.map(({ id, name }) => ({ id, name, ages: {} }));
}


function calculateBasePremium(age: number, mainPolicy: { policy?: string, amount?: number }, policies: Policy[]): number {
    if (!mainPolicy.policy || !mainPolicy.amount) {
        return 0;
    }
    
    const policyData = policies.find(p => p.id === mainPolicy.policy);
    if (!policyData || !policyData.ages[age]) {
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
  
  const malePoliciesRaw = await fetchAndParseSheet(process.env.GOOGLE_SHEET_MALE_CSV_URL!);
  const femalePoliciesRaw = await fetchAndParseSheet(process.env.GOOGLE_SHEET_FEMALE_CSV_URL!);

  const allPolicies = {
    male: transformRawDataToPolicies(malePoliciesRaw),
    female: transformRawDataToPolicies(femalePoliciesRaw)
  };
  
  const relevantPolicies = allPolicies[formData.gender];

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
