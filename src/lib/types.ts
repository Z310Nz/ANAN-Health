export type Policy = {
  id: string;
  name: string;
  // This will store age-to-rate mappings, e.g., { '30': 1500, '31': 1600 }
  ages: Record<string, number>;
};

export type Rider = {
  name: string;
  category: string;
  type: "dropdown" | "input";
  // Optional identifier used for DB lookups (prefers this over `name` when present)
  id?: string;
  selected?: boolean;
  amount?: number;
  dropdownValue?: string;
};

export type PremiumFormData = {
  userAge: number;
  gender: "male" | "female";
  coveragePeriod: number;
  policies?: { policy?: string; amount?: number }[];
  riders?: Rider[];
};

export type YearlyPremium = {
  year: number;
  base: number;
  riders: number;
  total: number;
  // Cumulative total of premiums from start until this year
  cumulativeTotal: number;
  // Per-rider premiums for this year, keyed by rider name
  riderDetails?: Record<string, number>;
};

export type PremiumCalculation = {
  summary: string;
  note?: string;
  yearlyBreakdown: YearlyPremium[];
  chartData: {
    year: string;
    Base: number;
    Riders: number;
    Total: number;
  }[];
};

// Represents the application user, from LINE
export type User = {
  id: string; // From LINE: userId
  displayName: string;
  avatarUrl?: string; // From LINE: pictureUrl
};
