// Simple premium calculator for main policies and riders
// Usage: node scripts/premium-calculator.js

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Main policy formula: (ทุนประกัน / 1000) * (อายุความคุ้มครองสูงสุด - อายุปัจจุบัน)
function calcMainPremium(sumInsured, age, maxAge) {
  return round2((sumInsured / 1000) * (maxAge - age));
}

// Rider categories handled according to user specification
// types: 'per1000', 'per100000', 'table' (table means rate lookup required)
function calcRiderPremium(rider, age, defaultMaxAge) {
  const maxAge = rider.maxAge ?? defaultMaxAge;
  if (rider.type === "per1000") {
    return round2((rider.sumInsured / 1000) * (maxAge - age));
  }
  if (rider.type === "per100000") {
    return round2((rider.sumInsured / 100000) * (maxAge - age));
  }
  // table-based: cannot compute without a rate table
  if (rider.type === "table") {
    return null; // indicates requires rate lookup
  }
  throw new Error("Unknown rider type: " + rider.type);
}

// Generate yearly table from currentAge to maxAge (inclusive)
function generatePremiumTable({ currentAge, maxAge, mainPolicy, riders }) {
  const rows = [];
  for (let age = currentAge; age <= maxAge; age++) {
    const main = calcMainPremium(mainPolicy.sumInsured, age, maxAge);
    const riderValues = {};
    let riderSum = 0;
    for (const r of riders) {
      const v = calcRiderPremium(r, age, maxAge);
      riderValues[r.name] = v === null ? "N/A (rate table)" : v;
      if (typeof v === "number") riderSum += v;
    }
    const total = round2(main + riderSum);
    rows.push({
      age,
      mainPremium: main,
      ...riderValues,
      total,
    });
  }
  return rows;
}

// Pretty-print table to console. Uses console.table when available.
function printTable(rows) {
  if (console.table) {
    console.table(rows);
    return;
  }
  // fallback
  for (const r of rows) {
    console.log(JSON.stringify(r));
  }
}

// Example data
const example = {
  currentAge: 30,
  maxAge: 65,
  mainPolicy: {
    name: "AIA 20 Pay Life (Non Par)",
    sumInsured: 1000000, // 1,000,000
  },
  riders: [
    { name: "HB", type: "per1000", sumInsured: 50000 },
    { name: "HB Extra", type: "per1000", sumInsured: 20000 },
    { name: "CI Plus", type: "per100000", sumInsured: 1000000 },
    { name: "Care for Cancer", type: "per100000", sumInsured: 500000 },
    { name: "Infinite Care (new standard)", type: "table", sumInsured: 100000 },
  ],
};

const rows = generatePremiumTable(example);
printTable(rows);

// Export functions for reuse if required by app
module.exports = {
  calcMainPremium,
  calcRiderPremium,
  generatePremiumTable,
};
