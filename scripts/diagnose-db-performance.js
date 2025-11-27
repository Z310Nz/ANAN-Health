#!/usr/bin/env node

/**
 * Quick diagnostic script to identify Supabase performance bottlenecks
 * Run: node scripts/diagnose-db-performance.js
 */

const sql = require("postgres");

async function main() {
  console.log("🔍 Supabase Performance Diagnostic\n");

  // Check 1: DATABASE_URL Configuration
  console.log("1️⃣  Checking DATABASE_URL configuration...");
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("   ⚠️  DATABASE_URL is NOT set");
    console.log("   → Using local interest rates fallback (instant)\n");
    return;
  }
  console.log("   ✅ DATABASE_URL is set\n");

  // Check 2: Connection Test
  console.log("2️⃣  Testing database connection...");
  let client;
  try {
    console.time("   ⏱️  Connection time");
    client = sql(dbUrl, { ssl: "require", max: 1 });
    const result = await client`SELECT 1 as ok`;
    console.timeEnd("   ⏱️  Connection time");
    console.log("   ✅ Connection successful\n");
  } catch (err) {
    console.log(`   ❌ Connection failed: ${err.message}\n`);
    console.log("   Troubleshooting:");
    console.log("   - Check DATABASE_URL syntax");
    console.log("   - Verify Supabase database is running");
    console.log("   - Check firewall/network connectivity\n");
    return;
  }

  // Check 3: Table Existence
  console.log("3️⃣  Checking table existence...");
  try {
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const tableNames = tables.map((t) => t.table_name);
    console.log(`   Found tables: ${tableNames.join(", ")}`);

    const hasRider = tableNames.includes("rider");
    const hasRegular = tableNames.includes("regular");
    console.log(`   ${hasRider ? "✅" : "❌"} rider table`);
    console.log(`   ${hasRegular ? "✅" : "❌"} regular table\n`);

    if (!hasRider || !hasRegular) {
      console.log("   ⚠️  Missing tables - will use local rates\n");
      return;
    }
  } catch (err) {
    console.log(`   ❌ Error checking tables: ${err.message}\n`);
  }

  // Check 4: Row Counts
  console.log("4️⃣  Checking row counts...");
  try {
    console.time("   ⏱️  rider query time");
    const riderCount = await client`SELECT COUNT(*) as count FROM rider`;
    console.timeEnd("   ⏱️  rider query time");
    console.log(`   rider table: ${riderCount[0].count} rows`);

    console.time("   ⏱️  regular query time");
    const regularCount = await client`SELECT COUNT(*) as count FROM regular`;
    console.timeEnd("   ⏱️  regular query time");
    console.log(`   regular table: ${regularCount[0].count} rows\n`);
  } catch (err) {
    console.log(`   ❌ Error counting rows: ${err.message}\n`);
  }

  // Check 5: Index Status
  console.log("5️⃣  Checking database indexes...");
  try {
    const indexes = await client`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const riderIndexes = indexes.filter((i) => i.tablename === "rider");
    const regularIndexes = indexes.filter((i) => i.tablename === "regular");

    console.log(`   rider indexes (${riderIndexes.length}):`);
    if (riderIndexes.length === 0) {
      console.log("      ⚠️  No custom indexes - consider adding:");
      console.log(
        "      CREATE INDEX idx_rider_lookup ON rider(age, gender, segcode);"
      );
    } else {
      riderIndexes.forEach((idx) => console.log(`      ✅ ${idx.indexname}`));
    }

    console.log(`   regular indexes (${regularIndexes.length}):`);
    if (regularIndexes.length === 0) {
      console.log("      ⚠️  No custom indexes - consider adding:");
      console.log(
        "      CREATE INDEX idx_regular_lookup ON regular(age, gender, segcode);"
      );
    } else {
      regularIndexes.forEach((idx) => console.log(`      ✅ ${idx.indexname}`));
    }
    console.log();
  } catch (err) {
    console.log(`   ❌ Error checking indexes: ${err.message}\n`);
  }

  // Check 6: Sample Query Performance
  console.log("6️⃣  Testing sample query performance...");
  try {
    console.time("   ⏱️  Sample batch query (male, age 30-65, 5 riders)");
    const result = await client`
      SELECT age, segcode, interest FROM rider
      WHERE age >= 30 AND age <= 65
      AND lower(gender) = 'male'
      AND segcode IN ('HB', 'HB_EXTRA', 'CI_PLUS', 'CANCER', 'OTHER')
    `;
    console.timeEnd("   ⏱️  Sample batch query (male, age 30-65, 5 riders)");
    console.log(`   Returned ${result.length} rows\n`);
  } catch (err) {
    console.log(`   ❌ Error running sample query: ${err.message}\n`);
  }

  // Summary
  console.log("📊 Performance Summary:");
  console.log("   If all checks passed: ✅ System is optimized");
  console.log("   If queries take > 200ms: ⚠️  Consider adding indexes");
  console.log("   If connection takes > 1s: ⚠️  Check network/region\n");

  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
