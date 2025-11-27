"use server";

import type {
  PremiumFormData,
  PremiumCalculation,
  YearlyPremium,
  Policy,
} from "@/lib/types";
import { getSqlClient, testDbConnection } from "@/lib/db";
import getLocalInterest from "@/lib/interestRates";
import {
  initializeCache,
  buildRateratesCache,
  type CacheData,
  getCachedRiderRate,
  getCachedRegularRate,
  isCacheAvailable,
  clearCache,
  getCacheMetadata,
} from "@/lib/cache";
import {
  idbManager,
  buildIndexedDBRecords,
  type RateRecord,
} from "@/lib/indexeddb";

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

// --- Cache Initialization ---

/**
 * Initialize cache with all rate data from Supabase
 * Called when user clicks "กดเพื่อเริ่มคำนวน" on welcome screen
 * Fetches both rider and regular rates for the full age range (18-100)
 * Populates both server-side cache and returns data for browser IndexedDB
 */
export async function initializeRatesCache(): Promise<{
  success: boolean;
  error?: string;
  cacheMetadata?: Record<string, any>;
  idbRecords?: RateRecord[];
}> {
  console.log("[CACHE-INIT] Starting cache initialization...");
  console.time("[CACHE-INIT] Total initialization time");

  try {
    // Define age range to cache (use 0-100 to match actual data in database)
    const minAge = 0;
    const maxAge = 100;
    const genders = ["male", "female"];

    if (!connectionString) {
      console.warn(
        "[CACHE-INIT] DATABASE_URL not set, cache will use local fallback"
      );
      clearCache();
      return {
        success: true,
        cacheMetadata: {
          mode: "local-fallback",
          message: "No database available",
        },
      };
    }

    let sqlClient: any;
    try {
      sqlClient = getSqlClient();
    } catch (err) {
      console.warn("[CACHE-INIT] Could not create SQL client:", err);
      clearCache();
      return {
        success: true,
        cacheMetadata: {
          mode: "local-fallback",
          message: "SQL client unavailable",
        },
      };
    }

    // Verify tables exist before querying
    console.log("[CACHE-INIT] Verifying table existence...");
    try {
      const tables = await sqlClient`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('rider', 'regular')
      `;
      const tableNames = tables.map((t: any) => t.table_name);
      console.log(`[CACHE-INIT] Found tables: ${tableNames.join(", ")}`);

      if (!tableNames.includes("rider") || !tableNames.includes("regular")) {
        console.warn(
          "[CACHE-INIT] Missing rider or regular table - will use local fallback"
        );
        return {
          success: true,
          cacheMetadata: {
            mode: "local-fallback",
            message: "Tables not found in database",
          },
        };
      }
    } catch (err) {
      console.error("[CACHE-INIT] Error verifying tables:", err);
    }

    // Check column names and sample data from rider table
    console.log("[CACHE-INIT] Inspecting rider table structure...");
    try {
      const columns = await sqlClient`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'rider'
        ORDER BY ordinal_position
      `;
      console.log(
        "[CACHE-INIT] Rider columns:",
        columns.map((c: any) => `${c.column_name}(${c.data_type})`).join(", ")
      );

      const sampleCount = await sqlClient`SELECT COUNT(*) as count FROM rider`;
      console.log(
        `[CACHE-INIT] Rider table total rows: ${sampleCount[0].count}`
      );

      const sampleRows = await sqlClient`SELECT * FROM rider LIMIT 3`;
      console.log(
        "[CACHE-INIT] Sample rider rows:",
        JSON.stringify(sampleRows, null, 2)
      );

      const genderValues = await sqlClient`
        SELECT DISTINCT gender FROM rider LIMIT 10
      `;
      console.log(
        "[CACHE-INIT] Distinct gender values in rider:",
        genderValues.map((r: any) => r.gender).join(", ")
      );

      const ageValues = await sqlClient`
        SELECT DISTINCT age FROM rider ORDER BY age LIMIT 10
      `;
      console.log(
        "[CACHE-INIT] Sample ages in rider:",
        ageValues.map((r: any) => r.age).join(", ")
      );
    } catch (err) {
      console.error("[CACHE-INIT] Error inspecting rider table:", err);
    }

    // Check column names and sample data from regular table
    console.log("[CACHE-INIT] Inspecting regular table structure...");
    try {
      const columns = await sqlClient`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'regular'
        ORDER BY ordinal_position
      `;
      console.log(
        "[CACHE-INIT] Regular columns:",
        columns.map((c: any) => `${c.column_name}(${c.data_type})`).join(", ")
      );

      const sampleCount =
        await sqlClient`SELECT COUNT(*) as count FROM regular`;
      console.log(
        `[CACHE-INIT] Regular table total rows: ${sampleCount[0].count}`
      );

      const sampleRows = await sqlClient`SELECT * FROM regular LIMIT 3`;
      console.log(
        "[CACHE-INIT] Sample regular rows:",
        JSON.stringify(sampleRows, null, 2)
      );

      const genderValues = await sqlClient`
        SELECT DISTINCT gender FROM regular LIMIT 10
      `;
      console.log(
        "[CACHE-INIT] Distinct gender values in regular:",
        genderValues.map((r: any) => r.gender).join(", ")
      );

      const ageValues = await sqlClient`
        SELECT DISTINCT age FROM regular ORDER BY age LIMIT 10
      `;
      console.log(
        "[CACHE-INIT] Sample ages in regular:",
        ageValues.map((r: any) => r.age).join(", ")
      );
    } catch (err) {
      console.error("[CACHE-INIT] Error inspecting regular table:", err);
    }

    // Fetch all rider rates for all genders
    console.time("[CACHE-INIT] Fetch rider rates");
    let riderRows: any[] = [];
    for (const gender of genders) {
      try {
        console.log(
          `[CACHE-INIT] Querying rider rates for gender: ${gender}, age range: ${minAge}-${maxAge}`
        );
        const results = await sqlClient`
          SELECT age, gender, segcode, CAST(interest AS NUMERIC) as interest FROM rider
          WHERE CAST(age AS INTEGER) >= ${minAge} AND CAST(age AS INTEGER) <= ${maxAge}
          AND lower(gender) = ${gender.toLowerCase()}
        `;
        console.log(
          `[CACHE-INIT] Rider results for ${gender}: ${results.length} rows`
        );
        riderRows.push(...results);
      } catch (err) {
        console.error(
          `[CACHE-INIT] Error fetching rider rates for ${gender}:`,
          err
        );
      }
    }
    console.timeEnd("[CACHE-INIT] Fetch rider rates");
    console.log(`[CACHE-INIT] Fetched ${riderRows.length} rider rate rows`);

    // Fetch all regular (main policy) rates for all genders
    console.time("[CACHE-INIT] Fetch regular rates");
    let regularRows: any[] = [];
    for (const gender of genders) {
      try {
        console.log(
          `[CACHE-INIT] Querying regular rates for gender: ${gender}, age range: ${minAge}-${maxAge}`
        );
        const results = await sqlClient`
          SELECT age, gender, segcode, interest FROM regular
          WHERE CAST(age AS INTEGER) >= ${minAge} AND CAST(age AS INTEGER) <= ${maxAge}
          AND lower(gender) = ${gender.toLowerCase()}
        `;
        console.log(
          `[CACHE-INIT] Regular results for ${gender}: ${results.length} rows`
        );
        regularRows.push(...results);
      } catch (err) {
        console.error(
          `[CACHE-INIT] Error fetching regular rates for ${gender}:`,
          err
        );
      }
    }
    console.timeEnd("[CACHE-INIT] Fetch regular rates");
    console.log(`[CACHE-INIT] Fetched ${regularRows.length} regular rate rows`);

    // Build cache from fetched data
    const cacheData = buildRateratesCache(
      riderRows,
      regularRows,
      minAge,
      maxAge
    );

    // Initialize the in-memory cache
    initializeCache(cacheData);

    // Build IndexedDB records
    const idbRecords = buildIndexedDBRecords(riderRows, regularRows);

    const metadata = getCacheMetadata();
    console.timeEnd("[CACHE-INIT] Total initialization time");
    console.log("[CACHE-INIT] Cache initialized successfully:", metadata);
    console.log(
      `[CACHE-INIT] Prepared ${idbRecords.length} records for IndexedDB`
    );

    return {
      success: true,
      cacheMetadata: metadata || {},
      idbRecords,
    };
  } catch (error) {
    console.error("[CACHE-INIT] Failed to initialize cache:", error);
    clearCache();
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
  // 1. Check in-memory cache first
  if (isCacheAvailable()) {
    const cachedRate = getCachedRegularRate(age, gender, policyId);
    if (cachedRate !== undefined) {
      const interest = cachedRate === null ? null : cachedRate;
      if (interest === null) {
        const fallback = getLocalInterest(age, gender, policyId);
        if (fallback === null) return 0;
        console.debug("[base-cache] Using local fallback after cache miss", {
          age,
          policyId,
          fallback,
        });
        return (policyAmount / 1000) * fallback;
      }
      console.debug("[base-cache] Cache hit", { age, policyId, interest });
      return (policyAmount / 1000) * interest;
    }
  }

  // 2. If a pre-fetched rate map is provided, use it to avoid extra DB queries
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

  // 3. If DATABASE_URL is not set or DB host cannot be resolved, fall back to local rates
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
    console.debug("[base-db] Querying database (cache miss)", {
      age,
      policyId,
    });
    const result = await sql`
      SELECT interest FROM regular
      WHERE CAST(age AS INTEGER) = ${age}
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
  // 1. Check in-memory cache first
  if (isCacheAvailable()) {
    const cachedRate = getCachedRiderRate(age, gender, segcode);
    if (cachedRate !== undefined) {
      if (cachedRate === null) {
        const fallback = getLocalInterest(age, gender, segcode);
        console.debug("[rider-cache] Cache hit (null), using fallback", {
          age,
          segcode,
          fallback,
        });
        return fallback === null ? null : fallback;
      }
      console.debug("[rider-cache] Cache hit", { age, segcode, cachedRate });
      return cachedRate;
    }
  }

  // 2. Fallback to local if no database
  if (!connectionString) {
    console.debug("[rider-cache] No database, using local interest");
    const interest = getLocalInterest(age, gender, segcode);
    return interest === null ? null : interest;
  }

  let sql;
  try {
    sql = sqlClient ?? getSqlClient();
  } catch (e) {
    console.debug("[rider-cache] SQL client error, using local interest");
    const interest = getLocalInterest(age, gender, segcode);
    return interest === null ? null : interest;
  }
  try {
    console.debug("[rider-db] Querying database (cache miss)", {
      age,
      segcode,
    });

    // First check: What data exists in the rider table?
    const allRiderRows = await sql`
      SELECT DISTINCT segcode, age, gender, CAST(interest AS NUMERIC) as interest FROM rider
      WHERE segcode = ${segcode}
      LIMIT 5
    `;
    console.debug("[rider-db] All rider rows for this segcode:", {
      segcode,
      rowsFound: allRiderRows.length,
      rows: allRiderRows.map((r: any) => ({
        age: r.age,
        gender: r.gender,
        interest: r.interest,
      })),
    });

    const result = await sql`
      SELECT CAST(interest AS NUMERIC) as interest FROM rider
      WHERE CAST(age AS INTEGER) = ${age}
      AND lower(gender) = ${gender.toLowerCase()}
      AND segcode = ${segcode}
      LIMIT 1
    `;

    console.debug("[rider-db] Query result for exact match:", {
      age,
      gender,
      segcode,
      resultFound: result.length > 0,
      result: result,
    });

    if (result.length === 0) {
      console.debug("No rider row found for", { age, gender, segcode });
      // fallback to local rates
      const interest = getLocalInterest(age, gender, segcode);
      console.debug("[rider-db] Using local fallback interest", {
        age,
        gender,
        segcode,
        interest,
      });
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
      SELECT age, segcode, CAST(interest AS NUMERIC) as interest FROM rider
      WHERE CAST(age AS INTEGER) >= ${minAge} AND CAST(age AS INTEGER) <= ${maxAge}
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
      WHERE CAST(age AS INTEGER) >= ${minAge} AND CAST(age AS INTEGER) <= ${maxAge}
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

    // Dropdown-type riders are excluded from premium calculation per user
    // request. We skip them here so they are not added to the total.
    if (r.type === "dropdown") {
      console.debug(
        "[rider] skipping dropdown-type rider in total calculation",
        {
          name: r.name,
          segcode,
          age,
        }
      );
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
  rateMap?: Record<string, number | null>,
  dropdownPremiums?: Record<string, number>
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

  // Process each rider and store in details object
  for (const r of selected) {
    // compute per-rider premium
    let riderPremium = 0;

    // Handle dropdown-type riders: use pre-calculated premium from minAge lookup
    if (r.type === "dropdown") {
      const dropdownSegcode = r.dropdownValue?.toString() || "";
      if (!dropdownSegcode) {
        console.debug(
          "[rider-detail] ❌ DROPDOWN rider - segcode missing; skipping",
          {
            name: r.name,
            type: "dropdown",
            dropdownValue: r.dropdownValue,
          }
        );
        details[r.name] = 0;
        continue;
      }

      // Use the pre-calculated premium from minAge (passed in dropdownPremiums)
      if (dropdownPremiums && dropdownSegcode in dropdownPremiums) {
        riderPremium = Number(dropdownPremiums[dropdownSegcode]) || 0;
        console.log(
          "[rider-detail] ✅ DROPDOWN - Direct Value (Reusing from minAge)",
          {
            riderName: r.name,
            segcode: dropdownSegcode,
            currentAge: age,
            minAge: formData.userAge,
            step1_LookupAtMinAge: {
              SQL: `SELECT interest FROM rider WHERE CAST(age AS INTEGER)=${formData.userAge} AND gender='${formData.gender}' AND segcode='${dropdownSegcode}'`,
              result: `interest = ${riderPremium}`,
            },
            step2_DirectPremium: {
              formula: "Premium = Interest (no multiplier)",
              calculation: `${riderPremium} (direct from interest value)`,
            },
            step3_ReuseForAllAges: {
              explanation:
                "Same premium reused for all ages in coverage period",
              appliesTo: `Ages ${formData.userAge} to ${
                formData.userAge + formData.coveragePeriod
              }`,
            },
            finalPremium: Math.round(riderPremium),
          }
        );
        details[r.name] = Math.round(riderPremium);
        continue;
      }

      // Fallback if dropdownPremiums not provided (shouldn't happen in normal flow)
      console.warn(
        "[rider-detail] ❌ DROPDOWN rider - premium not pre-calculated; this shouldn't happen",
        { name: r.name, segcode: dropdownSegcode }
      );
      details[r.name] = 0;
      continue;
    }

    // input-type -> use divisor based calculation
    // For input riders, MUST use the id field as segcode (required, not optional)
    const inputSegcode = (r as any).id;
    if (!inputSegcode) {
      console.debug(
        "[rider-detail] ❌ INPUT rider - id field missing (REQUIRED); skipping",
        { name: r.name, type: "input", riderObject: r }
      );
      details[r.name] = 0;
      continue;
    }

    console.debug("[rider-detail] INPUT rider lookup - Using ID as segcode", {
      name: r.name,
      id: inputSegcode,
      segcode: inputSegcode,
    });

    // determine divisor for input-type riders
    let divisor = 1000;
    if (per100000.has(r.name)) divisor = 100000;

    const key = `${age}|${inputSegcode}`;

    console.debug("[rider-detail] Looking up interest rate:", {
      age,
      inputSegcode,
      key,
      rateMapExists: !!rateMap,
      keyInRateMap: rateMap ? key in rateMap : false,
      rateMapValue: rateMap ? rateMap[key] : "no rateMap",
      allKeysInRateMap: rateMap
        ? Object.keys(rateMap)
            .filter((k) => k.includes(inputSegcode))
            .slice(0, 3)
        : [],
    });

    const interestRaw =
      rateMap && key in rateMap
        ? rateMap[key]
        : await getRiderInterest(age, formData.gender, inputSegcode, sqlClient);

    // Convert interest to number - handle strings with commas
    let interest: number | null = null;
    if (interestRaw !== null && interestRaw !== undefined) {
      // If it's a string with commas (e.g., '2,900'), remove them first
      const cleanedValue =
        typeof interestRaw === "string"
          ? (interestRaw as string).replace(/,/g, "")
          : interestRaw;
      const parsed = Number(cleanedValue);
      interest = isNaN(parsed) ? null : parsed;
    }
    if (interest === null) {
      console.debug(
        "[rider-detail] ❌ INPUT rider - no interest row found; skipping",
        { name: r.name, type: "input", segcode: inputSegcode, age }
      );
      details[r.name] = 0;
      continue;
    }

    const sumInsured =
      typeof r.amount === "number" ? r.amount : Number(r.amount) || 0;
    if (!sumInsured) {
      console.debug(
        "[rider-detail] ❌ INPUT rider - amount missing or zero; skipping",
        {
          name: r.name,
          type: "input",
          segcode: inputSegcode,
          rawAmount: r.amount,
        }
      );
      details[r.name] = 0;
      continue;
    }

    riderPremium = (sumInsured / divisor) * interest;

    // Determine which divisor category this rider belongs to
    let divisorCategory = "per-1000";
    if (per100000.has(r.name)) divisorCategory = "per-100000";
    else if (per1000.has(r.name)) divisorCategory = "per-1000";

    console.log("[rider-detail] ✅ INPUT - Divisor Formula (Full Age Range)", {
      riderName: r.name,
      riderIdUsed: inputSegcode,
      note: "Using rider.id as segcode for database lookup",
      step0_RiderIdExtraction: {
        riderId: inputSegcode,
        segcodeForLookup: inputSegcode,
      },
      step1_LookupAtCurrentAge: {
        currentAge: age,
        SQL: `SELECT interest FROM rider WHERE CAST(age AS INTEGER)=${age} AND gender='${formData.gender}' AND segcode='${inputSegcode}'`,
        result: `interest = ${interest}`,
      },
      step2_CalculatePremium: {
        divisorCategory: divisorCategory,
        divisor: divisor,
        formula: `Premium = (SumInsured ÷ ${divisor}) × Interest`,
        sumInsured: sumInsured,
        interest: interest,
      },
      step3_Calculation: {
        breakdown: `(${sumInsured} ÷ ${divisor}) × ${interest}`,
        intermediate: `${sumInsured / divisor} × ${interest}`,
        result: riderPremium.toFixed(2),
      },
      finalPremium: Math.round(riderPremium),
    });

    details[r.name] = Math.round(riderPremium);
  }

  // Calculate total using sum() method
  const totalRidersPremium = Object.values(details).reduce(
    (sum, premium) => sum + premium,
    0
  );

  console.log("[rider-detail] 📊 TOTAL Riders Premium for Age", {
    currentAge: age,
    step1_CollectAllRiderPremiums: {
      breakdown: Object.entries(details).map(([name, premium]) => ({
        riderName: name,
        premium: premium,
      })),
      premiumValues: Object.values(details),
    },
    step2_SumAllPremiums: {
      formula: `sum(${Object.values(details).join(" + ")})`,
      calculation: Object.entries(details)
        .map(([name, premium]) => `${name}: ${premium}`)
        .join(" + "),
      result: totalRidersPremium,
    },
    step3_FinalTotal: {
      method: "Using Object.values().reduce()",
      totalRidersPremium: totalRidersPremium,
    },
  });

  return { total: totalRidersPremium, details };
}

async function generateBreakdown(formData: PremiumFormData): Promise<{
  yearlyBreakdown: YearlyPremium[];
  chartData: PremiumCalculation["chartData"];
}> {
  console.time("[PERF] generateBreakdown total");
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

  // Separate riders into dropdown and input types
  const selectedRiders = (formData.riders || []).filter((r) => r.selected);
  const dropdownRiders = selectedRiders.filter((r) => r.type === "dropdown");
  const inputRiders = selectedRiders.filter((r) => r.type === "input");

  console.debug("[PERF] Rider breakdown", {
    total: selectedRiders.length,
    dropdown: dropdownRiders.length,
    input: inputRiders.length,
    selectedRidersDetail: selectedRiders.map((r) => ({
      name: r.name,
      type: r.type,
      id: (r as any).id,
      selected: r.selected,
    })),
  });

  const regularSegcodes = [mainPolicy.policy];
  const minAge = formData.userAge;
  const maxAge = formData.userAge + formData.coveragePeriod; // inclusive

  // Fetch regular rates once (used for all ages)
  console.time("[PERF] batch fetch regular rate maps");
  const regularRateMap = await fetchRegularInterestMap(
    formData.gender,
    minAge,
    maxAge,
    regularSegcodes,
    sqlClient
  );
  console.timeEnd("[PERF] batch fetch regular rate maps");

  // Calculate main policy premium once at the applicant's current age
  console.time("[PERF] calculate base premium");
  const basePremiumStatic = await calculateBasePremium(
    formData.userAge,
    formData.gender,
    mainPolicy.policy,
    mainPolicy.amount,
    sqlClient,
    regularRateMap
  );
  console.timeEnd("[PERF] calculate base premium");

  // Pre-fetch all dropdown rider rates (only at minAge)
  console.time("[PERF] fetch dropdown rider rates");
  const dropdownSegcodes = dropdownRiders
    .map((r) => r.dropdownValue?.toString() || "")
    .filter((seg) => seg);
  const dropdownRateMap: Record<string, number | null> = {};
  if (dropdownSegcodes.length > 0) {
    // For dropdown riders, we only need rates at minAge
    for (const seg of dropdownSegcodes) {
      const key = `${minAge}|${seg}`;
      const interest = await getRiderInterest(
        minAge,
        formData.gender,
        seg,
        sqlClient
      );
      dropdownRateMap[key] = interest === null ? null : interest;
      console.debug("[PERF] Fetched dropdown rider rate", {
        segcode: seg,
        age: minAge,
        interest,
      });
    }
  }
  console.timeEnd("[PERF] fetch dropdown rider rates");

  // Pre-fetch all input rider rates (full age range)
  console.time("[PERF] fetch input rider rates");
  const inputSegcodes = inputRiders
    .map((r) => (r as any).id)
    .filter((seg) => seg);
  console.debug("[PERF] Input rider segcodes to fetch (Using IDs ONLY)", {
    segcodes: inputSegcodes,
    note: "Each segcode is extracted from rider.id field (NOT rider.name)",
    fromRiders: inputRiders.map((r) => ({
      riderName: r.name,
      riderIdUsed: (r as any).id,
      willUseAsSegcode: (r as any).id,
    })),
  });
  const inputRateMap = await fetchRiderInterestMap(
    formData.gender,
    minAge,
    maxAge,
    inputSegcodes,
    sqlClient
  );
  console.timeEnd("[PERF] fetch input rider rates");

  // Combine rate maps for lookup
  const allRiderRateMap = { ...dropdownRateMap, ...inputRateMap };

  // Pre-calculate dropdown rider premiums at minAge (only once)
  console.time("[PERF] calculate dropdown rider premiums at minAge");
  const dropdownPremiums: Record<string, number> = {};
  for (const r of dropdownRiders) {
    const dropdownSegcode = r.dropdownValue?.toString() || "";
    if (!dropdownSegcode) continue;

    const key = `${minAge}|${dropdownSegcode}`;
    const interest =
      dropdownRateMap && key in dropdownRateMap
        ? dropdownRateMap[key]
        : await getRiderInterest(
            minAge,
            formData.gender,
            dropdownSegcode,
            sqlClient
          );

    if (interest !== null && interest !== undefined) {
      dropdownPremiums[dropdownSegcode] = interest;
      console.debug("[PERF] Pre-calculated dropdown premium", {
        name: r.name,
        segcode: dropdownSegcode,
        age: minAge,
        premium: interest,
      });
    }
  }
  console.timeEnd("[PERF] calculate dropdown rider premiums at minAge");

  // coveragePeriod in the form is set as `coverageUntilAge - userAge` in the UI.
  // The user expects the breakdown to include the coverage end age itself,
  // so iterate from 0..coveragePeriod inclusive (e.g., if coveragePeriod=35
  // and userAge=30, iterate ages 30..65).
  const totalSteps = formData.coveragePeriod + 1;
  let cumulativeSum = 0;

  console.time("[PERF] yearly loop");
  for (let i = 0; i < totalSteps; i++) {
    const currentAge = formData.userAge + i;

    // Use the static base premium computed at current user age.
    const basePremium = basePremiumStatic;

    const { total: ridersPremium, details: riderDetails } =
      await calculateRidersPremiumDetailed(
        formData,
        currentAge,
        sqlClient,
        allRiderRateMap,
        dropdownPremiums
      );

    const totalPremium = basePremium + ridersPremium;
    cumulativeSum += totalPremium;

    yearlyBreakdown.push({
      year: currentAge,
      base: Math.round(basePremium),
      riders: Math.round(ridersPremium),
      total: Math.round(totalPremium),
      cumulativeTotal: Math.round(cumulativeSum),
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
  console.timeEnd("[PERF] yearly loop");

  console.timeEnd("[PERF] generateBreakdown total");
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

  // Debug: Check if riders have id field
  if (formData.riders && formData.riders.length > 0) {
    console.log("[premium] Riders received at server:", {
      totalRiders: formData.riders.length,
      inputRidersDetail: formData.riders
        .filter((r) => r.type === "input")
        .map((r) => ({
          name: r.name,
          id: (r as any).id,
          hasIdField: (r as any).id !== undefined,
        })),
      dropdownRidersDetail: formData.riders
        .filter((r) => r.type === "dropdown")
        .map((r) => ({
          name: r.name,
          dropdownValue: r.dropdownValue,
          hasDropdownValue: r.dropdownValue !== undefined,
        })),
    });
  }

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
