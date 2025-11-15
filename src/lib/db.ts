import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

/**
 * Create and return a configured postgres client. The function doesn't automatically
 * run queries — it just wraps postgres(connectionString).
 *
 * Use try/catch around queries to detect DNS errors (ENOTFOUND) quickly.
 */
export function getSqlClient() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  try {
    const sql = postgres(connectionString, { ssl: "require" });
    return sql;
  } catch (err) {
    // Re-wrap to add context
    throw new Error(
      `DB client creation failed: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

export async function testDbConnection() {
  try {
    const sql = getSqlClient();
    const result = await sql`select 1 as ok`;
    return result.length > 0;
  } catch (err) {
    // Return false for connectivity problems – callers will log/act accordingly
    return false;
  }
}

export default getSqlClient;
