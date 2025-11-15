"use server";

import type {
  PremiumFormData,
  PremiumCalculation,
  YearlyPremium,
  Policy,
} from "@/lib/types";
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
  policyAmount: number,
  sqlClient?: any,
  rateMap?: Record<string, number | null>
): Promise<number> {
  // If a pre-fetched rate map is provided, prefer it to avoid extra DB queries
  if (rateMap) {
    const key = `${age}|${policyId}`;
    if (key in rateMap) {
      const interestVal = rateMap[key];
      if (interestVal === null) {
        const fallback = getLocalInterest(age, gender, policyId);
        if (fallback === null) return 0;
        return (policyAmount / 1000) * fallback;
      }
      return (policyAmount / 1000) * interestVal;
    }
  }
  // If DATABASE_URL is not set or DB host cannot be resolved, fall back to local rates
  if (!connectionString) {
    console.warn(
      "DATABASE_URL is not set — using local fallback interest rates for development."
    );
    const interest = getLocalInterest(age, gender, policyId);
    if (interest === null) return 0;
    return (policyAmount / 1000) * interest;
  }

  let sql;
  try {
    sql = sqlClient ?? getSqlClient();
  } catch (e) {
    // If DB not configured, fall back to in-memory rates
    const interest = getLocalInterest(age, gender, policyId);
    if (interest === null) return 0;
    return (policyAmount / 1000) * interest;
  }
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
        `[base] No interest rate found for age=${age} gender=${gender} segcode=${policyId} — falling back to local rates.`
      );
      const interest = getLocalInterest(age, gender, policyId);
      if (interest === null) return 0;
      return (policyAmount / 1000) * interest;
    }

    const interest = result[0].interest;
    const premium = (policyAmount / 1000) * interest;
    console.debug(
      `[base] age=${age} policy=${policyId} amount=${policyAmount} interest=${interest} premium=${premium}`
    );
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

async function getRiderInterest(
  age: number,
  gender: "male" | "female",
  segcode: string,
  sqlClient?: any
): Promise<number | null> {
  if (!connectionString) {
    // fallback to local interest lookup
    const interest = getLocalInterest(age, gender, segcode);
    return interest === null ? null : interest;
  }

  let sql;
  try {
    sql = sqlClient ?? getSqlClient();
  } catch (e) {
    const interest = getLocalInterest(age, gender, segcode);
    return interest === null ? null : interest;
  }
  try {
    // Log query intent for diagnostics (will appear in server logs).
    console.debug("Querying rider rate", { age, gender, segcode });
    const result = await sql`
      SELECT interest FROM rider
      WHERE age = ${age}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode = ${segcode}
      LIMIT 1
    `;

    if (result.length === 0) {
      console.debug("No rider row found for", { age, gender, segcode });
      // fallback to local rates
      const interest = getLocalInterest(age, gender, segcode);
      if (interest !== null) {
        console.debug("Using local fallback interest for rider", {
          age,
          gender,
          segcode,
          interest,
        });
      }
      return interest === null ? null : interest;
    }

    console.debug("Rider DB row found", {
      age,
      gender,
      segcode,
      interest: result[0].interest,
    });
    return result[0].interest;
  } catch (error) {
    console.error("Error fetching rider interest:", error);
    const interest = getLocalInterest(age, gender, segcode);
    return interest === null ? null : interest;
  }
}

// Batch-fetch rider interests for a range of ages and segcodes for the given
// gender. Returns a map keyed by `${age}|${segcode}` -> interest (number).
async function fetchRiderInterestMap(
  gender: "male" | "female",
  minAge: number,
  maxAge: number,
  segcodes: string[],
  sqlClient?: any
): Promise<Record<string, number | null>> {
  const map: Record<string, number | null> = {};
  if (segcodes.length === 0) return map;

  if (!connectionString) {
    // local fallback for each combination
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }

  let sql: any;
  try {
    sql = sqlClient ?? getSqlClient();
  } catch (e) {
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }

  try {
    console.debug("Batch querying rider rates", { minAge, maxAge, segcodes });
    const result = await sql`
      SELECT age, segcode, interest FROM rider
      WHERE age >= ${minAge} AND age <= ${maxAge}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode IN (${segcodes})
    `;

    // Seed map with nulls so missing rows are explicit
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        map[`${age}|${seg}`] = null;
      }
    }

    for (const row of result) {
      const key = `${row.age}|${row.segcode}`;
      map[key] = row.interest;
    }

    // For any still-missing values, try local fallback
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const key = `${age}|${seg}`;
        if (map[key] === null) {
          const fallback = getLocalInterest(age, gender, seg);
          if (fallback !== null) map[key] = fallback;
        }
      }
    }

    return map;
  } catch (err) {
    console.error("Error batch fetching rider interests:", err);
    // On error, populate with local fallbacks
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }
}

// Batch-fetch regular (main policy) interests for a range of ages and segcodes.
// Returns a map keyed by `${age}|${segcode}` -> interest (number|null).
async function fetchRegularInterestMap(
  gender: "male" | "female",
  minAge: number,
  maxAge: number,
  segcodes: string[],
  sqlClient?: any
): Promise<Record<string, number | null>> {
  const map: Record<string, number | null> = {};
  if (segcodes.length === 0) return map;

  if (!connectionString) {
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }

  let sql: any;
  try {
    sql = sqlClient ?? getSqlClient();
  } catch (e) {
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }

  try {
    console.debug("Batch querying regular rates", { minAge, maxAge, segcodes });
    const result = await sql`
      SELECT age, segcode, interest FROM regular
      WHERE age >= ${minAge} AND age <= ${maxAge}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode IN (${segcodes})
    `;

    // Seed nulls
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        map[`${age}|${seg}`] = null;
      }
    }

    for (const row of result) {
      const key = `${row.age}|${row.segcode}`;
      map[key] = row.interest;
    }

    // Fill missing with local fallback if available
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const key = `${age}|${seg}`;
        if (map[key] === null) {
          const fallback = getLocalInterest(age, gender, seg);
          if (fallback !== null) map[key] = fallback;
        }
      }
    }

    return map;
  } catch (err) {
    console.error("Error batch fetching regular interests:", err);
    for (let age = minAge; age <= maxAge; age++) {
      for (const seg of segcodes) {
        const interest = getLocalInterest(age, gender, seg);
        map[`${age}|${seg}`] = interest === null ? null : interest;
      }
    }
    return map;
  }
}

/**
 * Calculate total riders premium for a specific age.
 * Uses segcode (from dropdownValue or name) and looks up interest in `rider` table.
 * Applies divisor rules based on rider name categories (per-1000, per-100000, or table-based).
 */
async function calculateRidersPremium(
  formData: PremiumFormData,
  age: number,
  sqlClient?: any,
  rateMap?: Record<string, number | null>
): Promise<number> {
  const selected = (formData.riders || []).filter((r) => r.selected);
  if (selected.length === 0) return 0;

  // Lists derived from your requirements: determine how to compute premium per rider
  const per1000 = new Set(["HB", "HB Extra"]);
  const per100000 = new Set([
    "Care for Cancer",
    "Health Cancer",
    "Multi-Pay CI Plus + Total care",
    "CI Plus",
    "CI Top Up",
    "TPD",
    "AI/RCC",
    "ADD/RCC",
    "ADB/RCC",
  ]);
  const tableBased = new Set([
    "Infinite Care (new standard)",
    "Health Happy",
    "Health Happy Kids DD10K",
    "Health Happy Kids DD30K",
    "Health Saver",
    "H&S Extra (new standard)",
    "H&S (new standard)",
    "Infinite Care (new standard) DD 100K",
    "Infinite Care (new standard) DD 300K",
  ]);

  let total = 0;
  for (const r of selected) {
    const segcode = (
      r.dropdownValue ||
      (r as any).id ||
      r.name ||
      ""
    ).toString();
    // determine divisor for input-type riders
    let divisor = 1000;
    if (per100000.has(r.name)) divisor = 100000;

    console.debug("[rider] evaluating", {
      name: r.name,
      segcode,
      rawAmount: r.amount,
      dropdownValue: r.dropdownValue,
      type: r.type,
      age,
    });

    // If rider uses a dropdown plan selection, treat DB `interest` as the
    // absolute annual premium for that plan (no sumInsured needed).
    if (r.type === "dropdown") {
      const key = `${age}|${segcode}`;
      const interest =
        rateMap && key in rateMap
          ? rateMap[key]
          : await getRiderInterest(age, formData.gender, segcode, sqlClient);
      if (interest === null) {
        console.debug("[rider] dropdown segcode has no interest; skipping", {
          name: r.name,
          segcode,
          age,
        });
        continue;
      }
      console.debug("[rider] dropdown premium used from DB", {
        name: r.name,
        segcode,
        age,
        premium: interest,
      });
      total += interest;
      continue;
    }

    // For input-type riders (numeric amounts), use divisor-based rate calculation.
    const key = `${age}|${segcode}`;
    const interest =
      rateMap && key in rateMap
        ? rateMap[key]
        : await getRiderInterest(age, formData.gender, segcode, sqlClient);
    if (interest === null) {
      console.debug("[rider] no interest row for input-type rider; skipping", {
        name: r.name,
        segcode,
        age,
      });
      continue;
    }

    const sumInsured =
      typeof r.amount === "number" ? r.amount : Number(r.amount) || 0;
    if (!sumInsured) {
      console.debug("[rider] amount missing or zero; skipping", {
        name: r.name,
        segcode,
        rawAmount: r.amount,
      });
      continue;
    }

    const premium = (sumInsured / divisor) * interest;
    console.debug("[rider] computed", {
      name: r.name,
      segcode,
      age,
      interest,
      divisor,
      sumInsured,
      premium,
    });
    total += premium;
  }

  console.debug("[rider] total riders premium for age", { age, total });
  return Math.round(total);
}

// New: returns both total and per-rider breakdown for a specific age
async function calculateRidersPremiumDetailed(
  formData: PremiumFormData,
  age: number,
  sqlClient?: any,
  rateMap?: Record<string, number | null>
): Promise<{ total: number; details: Record<string, number> }> {
  const details: Record<string, number> = {};
  const selected = (formData.riders || []).filter((r) => r.selected);
  if (selected.length === 0) return { total: 0, details };

  const per1000 = new Set(["HB", "HB Extra"]);
  const per100000 = new Set([
    "Care for Cancer",
    "Health Cancer",
    "Multi-Pay CI Plus + Total care",
    "CI Plus",
    "CI Top Up",
    "TPD",
    "AI/RCC",
    "ADD/RCC",
    "ADB/RCC",
  ]);
  const tableBased = new Set([
    "Infinite Care (new standard)",
    "Health Happy",
    "Health Happy Kids DD10K",
    "Health Happy Kids DD30K",
    "Health Saver",
    "H&S Extra (new standard)",
    "H&S (new standard)",
    "Infinite Care (new standard) DD 100K",
    "Infinite Care (new standard) DD 300K",
  ]);

  let total = 0;
  for (const r of selected) {
    const segcode = (
      r.dropdownValue ||
      (r as any).id ||
      r.name ||
      ""
    ).toString();
    // determine divisor for input-type riders
    let divisor = 1000;
    if (per100000.has(r.name)) divisor = 100000;

    // compute per-rider premium
    let riderPremium = 0;

    // dropdown -> DB interest is treated as the annual premium for that plan
    if (r.type === "dropdown") {
      const key = `${age}|${segcode}`;
      const interest =
        rateMap && key in rateMap
          ? rateMap[key]
          : await getRiderInterest(age, formData.gender, segcode, sqlClient);
      if (interest === null) {
        console.debug("[rider-detail] dropdown segcode no interest; skipping", {
          name: r.name,
          segcode,
          age,
        });
        details[r.name] = 0;
        continue;
      }
      riderPremium = interest;
      details[r.name] = Math.round(riderPremium);
      total += riderPremium;
      continue;
    }

    // input-type -> use divisor based calculation
    const key = `${age}|${segcode}`;
    const interest =
      rateMap && key in rateMap
        ? rateMap[key]
        : await getRiderInterest(age, formData.gender, segcode, sqlClient);
    if (interest === null) {
      console.debug(
        "[rider-detail] no interest row for input-type rider; skipping",
        { name: r.name, segcode, age }
      );
      details[r.name] = 0;
      continue;
    }

    const sumInsured =
      typeof r.amount === "number" ? r.amount : Number(r.amount) || 0;
    if (!sumInsured) {
      console.debug("[rider-detail] amount missing or zero; skipping", {
        name: r.name,
        segcode,
        rawAmount: r.amount,
      });
      details[r.name] = 0;
      continue;
    }

    riderPremium = (sumInsured / divisor) * interest;
    details[r.name] = Math.round(riderPremium);
    total += riderPremium;
  }

  return { total: Math.round(total), details };
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

  // Create a single DB client for the lifetime of this calculation to avoid
  // exhausting Postgres connection slots when looping many ages.
  let sqlClient: any = undefined;
  if (connectionString) {
    try {
      sqlClient = getSqlClient();
    } catch (err) {
      console.warn(
        "Could not create shared SQL client, will fallback per-call:",
        err
      );
      sqlClient = undefined;
    }
  }

  // Prepare batch fetch for regular and rider interests to avoid per-age DB queries.
  const selectedRiders = (formData.riders || []).filter((r) => r.selected);
  const riderSegcodesSet = new Set<string>();
  for (const r of selectedRiders) {
    const seg = (r.dropdownValue || (r as any).id || r.name || "").toString();
    if (seg) riderSegcodesSet.add(seg);
  }
  const riderSegcodes = Array.from(riderSegcodesSet);
  const regularSegcodes = [mainPolicy.policy];
  const minAge = formData.userAge;
  const maxAge = formData.userAge + formData.coveragePeriod; // inclusive

  const [riderRateMap, regularRateMap] = await Promise.all([
    fetchRiderInterestMap(
      formData.gender,
      minAge,
      maxAge,
      riderSegcodes,
      sqlClient
    ),
    fetchRegularInterestMap(
      formData.gender,
      minAge,
      maxAge,
      regularSegcodes,
      sqlClient
    ),
  ]);

  // Calculate main policy premium once at the applicant's current age — use regularRateMap
  // (if available) to avoid an extra DB query.
  const basePremiumStatic = await calculateBasePremium(
    formData.userAge,
    formData.gender,
    mainPolicy.policy,
    mainPolicy.amount,
    sqlClient,
    regularRateMap
  );

  // coveragePeriod in the form is set as `coverageUntilAge - userAge` in the UI.
  // The user expects the breakdown to include the coverage end age itself,
  // so iterate from 0..coveragePeriod inclusive (e.g., if coveragePeriod=35
  // and userAge=30, iterate ages 30..65).
  const totalSteps = formData.coveragePeriod + 1;
  for (let i = 0; i < totalSteps; i++) {
    const currentAge = formData.userAge + i;

    // Use the static base premium computed at current user age.
    const basePremium = basePremiumStatic;

    const { total: ridersPremium, details: riderDetails } =
      await calculateRidersPremiumDetailed(
        formData,
        currentAge,
        sqlClient,
        riderRateMap
      );

    const totalPremium = basePremium + ridersPremium;

    yearlyBreakdown.push({
      year: currentAge,
      base: Math.round(basePremium),
      riders: Math.round(ridersPremium),
      total: Math.round(totalPremium),
      riderDetails,
    });

    // Build a sampling interval for chart points so we don't plot too many
    // points; use totalSteps when computing the divisor.
    const sampleDivisor = Math.max(1, Math.floor(totalSteps / 15));
    if (totalSteps <= 15 || i % sampleDivisor === 0 || i === totalSteps - 1) {
      chartData.push({
        year: `${currentAge}`,
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

export async function getRidersForGender(gender: "male" | "female"): Promise<
  {
    name: string;
    category: string;
    type: "dropdown" | "input";
    id?: string;
  }[]
> {
  console.log(`[HARDCODED] Fetching riders for gender: ${gender}`);
  // Return the same rider list used previously as defaults in the form
  const hardcodedRiders: {
    name: string;
    category: string;
    type: "dropdown" | "input";
    id?: string;
  }[] = [
    {
      name: "Infinite Care (new standard)",
      category: "ค่ารักษา",
      type: "dropdown",
    },
    { name: "Health Happy", category: "ค่ารักษา", type: "dropdown" },
    { name: "Health Happy Kids DD10K", category: "ค่ารักษา", type: "dropdown" },
    { name: "Health Happy Kids DD30K", category: "ค่ารักษา", type: "dropdown" },
    { name: "Health Saver", category: "ค่ารักษา", type: "dropdown" },
    {
      name: "H&S Extra (new standard)",
      category: "ค่ารักษา",
      type: "dropdown",
    },
    { name: "H&S (new standard)", category: "ค่ารักษา", type: "dropdown" },
    {
      name: "Infinite Care (new standard) DD 100K",
      category: "ค่ารักษา",
      type: "dropdown",
    },
    {
      name: "Infinite Care (new standard) DD 300K",
      category: "ค่ารักษา",
      type: "dropdown",
    },
    { name: "HB", category: "ชดเชยรายวัน", type: "input", id: "HB" },
    {
      name: "HB Extra",
      category: "ชดเชยรายวัน",
      type: "input",
      id: "HBX",
    },
    {
      name: "Care for Cancer",
      category: "ชดเชยโรคร้ายแรง",
      type: "input",
      id: "CFC",
    },
    {
      name: "Health Cancer",
      category: "ชดเชยโรคร้ายแรง",
      type: "input",
      id: "AHC",
    },
    {
      name: "Multi-Pay CI Plus + Total care",
      category: "ชดเชยโรคร้ายแรง",
      type: "input",
      id: "MPCIP10",
    },
    {
      name: "CI Plus",
      category: "ชดเชยโรคร้ายแรง",
      type: "input",
      id: "CIP",
    },
    {
      name: "CI Top Up",
      category: "ชดเชยโรคร้ายแรง",
      type: "input",
      id: "CIT",
    },
    { name: "TPD", category: "ชดเชยโรคร้ายแรง", type: "input", id: "TPD" },
    {
      name: "AI/RCC",
      category: "ชดเชยอุบัติเหตุ",
      type: "input",
      id: "AI_RCC",
    },
    {
      name: "ADD/RCC",
      category: "ชดเชยอุบัติเหตุ",
      type: "input",
      id: "ADD_RCC",
    },
    {
      name: "ADB/RCC",
      category: "ชดเชยอุบัติเหตุ",
      type: "input",
      id: "ADB_RCC",
    },
  ];

  return hardcodedRiders;
}

export async function getPremiumSummary(
  formData: PremiumFormData
): Promise<PremiumCalculation> {
  console.log(
    "[premium] Calculating premium with form data:",
    JSON.stringify(formData)
  );

  if (!connectionString) {
    console.warn(
      "DATABASE_URL is not set; proceeding with local fallback rates for premium calculations."
    );
  }

  // Defensive validation: if the main policy or its amount is missing, return
  // a friendly, non-throwing response so the server action doesn't produce a
  // 500 during page renders or when the client calls this action without
  // selecting a main policy yet.
  const mainPolicy = formData?.policies?.[0];
  if (!mainPolicy || !mainPolicy.policy || !mainPolicy.amount) {
    const summary = `ไม่พบข้อมูลกรมธรรม์หลัก กรุณาเลือกกรมธรรม์หลักและจำนวนผลประโยชน์`;
    return {
      summary,
      note: undefined,
      yearlyBreakdown: [],
      chartData: [],
    };
  }

  try {
    console.log("[premium] Starting generateBreakdown");
    const { yearlyBreakdown, chartData } = await generateBreakdown(formData);
    console.log(
      "[premium] Finished generateBreakdown — rows:",
      yearlyBreakdown.length
    );

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
