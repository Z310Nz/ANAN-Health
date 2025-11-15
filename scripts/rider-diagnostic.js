#!/usr/bin/env node
// Simple diagnostic: query `rider` table for sample segcodes/ages/genders
// Usage: node scripts/rider-diagnostic.js [segcode1 segcode2 ...]

const postgres = require("postgres");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set. Set it in your environment or .env file."
  );
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require" });

const defaultSegcodes = [
  "HHM1",
  "HHF1",
  "Infinite_Care_M_60M_WW",
  "ICDM10M60",
  "HHM5",
  "HSEXM1500",
  "HSNM1000",
];

const args = process.argv.slice(2);
const segcodes = args.length > 0 ? args : defaultSegcodes;

const agesToCheck = [18, 25, 30, 35, 40, 45, 50];
const genders = ["male", "female"];

async function run() {
  try {
    console.log("Diagnostic: querying rider table for segcodes:", segcodes);
    for (const segcode of segcodes) {
      console.log("\n--- Segcode:", segcode, "---");
      for (const gender of genders) {
        for (const age of agesToCheck) {
          try {
            const rows = await sql`
              SELECT age, gender, segcode, interest
              FROM rider
              WHERE age = ${age}
                AND lower(gender) = ${gender.toLowerCase()}
                AND segcode = ${segcode}
              LIMIT 1
            `;

            if (rows.length === 0) {
              console.log(`no row -> age=${age} gender=${gender}`);
            } else {
              console.log(
                `found -> age=${age} gender=${gender} interest=${rows[0].interest}`
              );
            }
          } catch (err) {
            console.error(
              "query error for",
              { segcode, age, gender },
              err.message || err
            );
          }
        }
      }
    }
  } catch (err) {
    console.error("Diagnostic failed:", err.message || err);
  } finally {
    try {
      await sql.end();
    } catch (e) {}
    process.exit(0);
  }
}

run();
