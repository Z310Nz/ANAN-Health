import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Query rider table using Supabase client
 * Fallback method when direct database connection is unavailable
 */
export async function queryRiderViaSupabase(
  age: number,
  gender: string,
  segcode?: string
): Promise<
  Array<{ age: string; gender: string; segcode: string; interest: number }>
> {
  try {
    let query = supabase.from("rider").select("age, gender, segcode, interest");

    if (age !== null && age !== undefined) {
      query = query.eq("age", age.toString());
    }

    if (gender) {
      query = query.eq("gender", gender.toLowerCase());
    }

    if (segcode) {
      query = query.eq("segcode", segcode);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error("[Supabase] Query error:", error);
      return [];
    }

    // Convert interest to number
    return (data || []).map((row: any) => ({
      ...row,
      interest: Number(row.interest),
    }));
  } catch (err) {
    console.error("[Supabase] Exception:", err);
    return [];
  }
}

/**
 * Batch query rider interest rates
 */
export async function queryRiderBatchViaSupabase(
  gender: string,
  minAge: number,
  maxAge: number,
  segcodes: string[]
): Promise<Record<string, number | null>> {
  const map: Record<string, number | null> = {};

  try {
    // Fetch all data and filter in JavaScript since PostgREST doesn't support numeric CAST in filters
    const { data, error } = await supabase
      .from("rider")
      .select("age, segcode, interest")
      .eq("gender", gender.toLowerCase())
      .in("segcode", segcodes);

    if (error) {
      console.error("[Supabase] Batch query error:", error);
      return map;
    }

    // Filter by age range and convert to map
    (data || []).forEach((row: any) => {
      const ageNum = parseInt(row.age, 10);
      // Only include rows within the age range
      if (ageNum >= minAge && ageNum <= maxAge) {
        const key = `${ageNum}|${row.segcode}`;
        map[key] = row.interest ? Number(row.interest) : null;
      }
    });
  } catch (err) {
    console.error("[Supabase] Batch query exception:", err);
  }

  return map;
}

/**
 * Query regular table using Supabase client
 */
export async function queryRegularViaSupabase(
  age: number,
  gender: string,
  segcode?: string
): Promise<
  Array<{ age: string; gender: string; segcode: string; interest: number }>
> {
  try {
    let query = supabase
      .from("regular")
      .select("age, gender, segcode, interest");

    if (age !== null && age !== undefined) {
      query = query.eq("age", age.toString());
    }

    if (gender) {
      query = query.eq("gender", gender.toLowerCase());
    }

    if (segcode) {
      query = query.eq("segcode", segcode);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error("[Supabase] Query error:", error);
      return [];
    }

    // Convert interest to number
    return (data || []).map((row: any) => ({
      ...row,
      interest: Number(row.interest),
    }));
  } catch (err) {
    console.error("[Supabase] Exception:", err);
    return [];
  }
}
