/**
 * Supabase client wrapper for server-side queries.
 *
 * Usage:
 * - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to your `.env` (service role key for server-side queries).
 * - Import `getInterestFromSupabase` to fetch interest rates for calculation.
 *
 * Security: never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Keep it server-side only.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // It's okay to allow imports in dev even if env is missing; errors will be thrown at call-time.
  // But we log once to help developers notice missing configuration.
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.warn(
      "Supabase env vars missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for server queries."
    );
  }
}

let client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: { headers: { "x-client-info": "anan-health-server" } },
  });
  return client;
}

export type Gender = "male" | "female";

/**
 * Query `regular` table for an interest rate matching the provided filters.
 * Returns the numeric `interest` value or null when not found.
 */
export async function getInterestFromSupabase(
  age: number,
  gender: Gender,
  segcode: string
): Promise<number | null> {
  const supabase = getSupabaseClient();

  // Use exact match for segcode and age. For gender we normalize to lower-case.
  const { data, error } = await supabase
    .from("regular")
    .select("interest")
    .eq("age", age)
    .eq("segcode", segcode)
    .ilike("gender", gender) // case-insensitive match for gender field
    .limit(1)
    .maybeSingle();

  if (error) {
    // Surface the error so callers can choose to fallback
    throw error;
  }

  if (!data) return null;

  // `data` might be an object like { interest: 123 }
  const interest = (data as any).interest;
  return typeof interest === "number" ? interest : Number(interest);
}

export default getSupabaseClient;
