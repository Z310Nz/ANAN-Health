#!/usr/bin/env node
// Simulate calculateRidersPremium logic for a sample formData
const postgres = require("postgres");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(connectionString, { ssl: "require" });

async function getRiderInterest(age, gender, segcode) {
  const rows =
    await sql`SELECT interest FROM rider WHERE age=${age} AND lower(gender)=${gender.toLowerCase()} AND segcode=${segcode} LIMIT 1`;
  return rows.length ? rows[0].interest : null;
}

async function run() {
  const formData = {
    gender: "male",
    riders: [
      {
        name: "Infinite Care (new standard)",
        type: "dropdown",
        selected: true,
        dropdownValue: "Infinite_Care_M_60M_WW",
      },
    ],
  };
  const age = 30;
  let total = 0;
  for (const r of formData.riders.filter((r) => r.selected)) {
    const segcode = (r.dropdownValue || r.name).toString();
    console.log("evaluating", r.name, segcode);
    if (r.type === "dropdown") {
      const interest = await getRiderInterest(age, formData.gender, segcode);
      console.log("db interest", interest);
      if (interest !== null) total += interest;
    }
  }
  console.log("simulated riders total", total);
  await sql.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
