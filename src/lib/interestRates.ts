// Lightweight local fallback interest rates used for development when the DB is unavailable.
// This file provides a very small, deterministic mapping for ages/genders/policy codes.
// It is intentionally simple — real rates should come from your production database.

export type Gender = "male" | "female";

type RateEntry = {
  minAge: number;
  maxAge: number;
  gender: Gender | "any";
  segcode: string | "any";
  interest: number;
};

const rates: RateEntry[] = [
  // Generic fallbacks — tune these to better match your real data if you have sample rates.
  { minAge: 0, maxAge: 17, gender: "any", segcode: "any", interest: 50 },
  { minAge: 18, maxAge: 30, gender: "any", segcode: "any", interest: 100 },
  { minAge: 31, maxAge: 45, gender: "any", segcode: "any", interest: 150 },
  { minAge: 46, maxAge: 60, gender: "any", segcode: "any", interest: 250 },
  { minAge: 61, maxAge: 120, gender: "any", segcode: "any", interest: 500 },

  // Small overrides for some segcodes (example)
  { minAge: 18, maxAge: 60, gender: "any", segcode: "CISC10", interest: 200 },
  { minAge: 18, maxAge: 60, gender: "any", segcode: "CISC20", interest: 220 },
];

export function getLocalInterest(
  age: number,
  gender: Gender,
  segcode: string
): number | null {
  // Prefer exact segcode matches, then fall back to broader age/gender rules.
  const exact = rates.find(
    (r) =>
      r.segcode !== "any" &&
      r.segcode.toLowerCase() === segcode.toLowerCase() &&
      age >= r.minAge &&
      age <= r.maxAge &&
      (r.gender === "any" || r.gender === gender)
  );
  if (exact) return exact.interest;

  const general = rates.find(
    (r) =>
      r.segcode === "any" &&
      age >= r.minAge &&
      age <= r.maxAge &&
      (r.gender === "any" || r.gender === gender)
  );
  return general ? general.interest : null;
}

export default getLocalInterest;
