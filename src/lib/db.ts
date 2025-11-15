import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

// Cached client to avoid creating many connections in server environments.
let cachedClient: ReturnType<typeof postgres> | null = null;

export function getSqlClient() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  if (cachedClient) return cachedClient;

  try {
    cachedClient = postgres(connectionString, { ssl: "require" });
    return cachedClient;
  } catch (err) {
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
    return false;
  }
}

export default getSqlClient;
