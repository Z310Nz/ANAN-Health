#!/usr/bin/env node
/* Quick DB connection check script that uses the DATABASE_URL env var */

require("dotenv").config();
const postgres = require("postgres");

async function main() {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error(
      "DATABASE_URL is not set. Add it to your .env before running this script."
    );
    process.exit(1);
  }

  try {
    const sql = postgres(conn, { ssl: "require" });
    const res = await sql`select 1 as ok`;
    console.log("Connection successful:", res[0]);
    process.exit(0);
  } catch (err) {
    console.error("Failed to connect to the DB:", err);
    process.exit(2);
  }
}

main();
