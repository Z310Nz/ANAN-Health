export type Policy = {
  id: string;
  name: string;
  // This will store age-to-rate mappings, e.g., { '30': 1500, '31': 1600 }
  ages: Record<string, number>;
};

export type Rider = {
    name: string;
    category: string;
    type: 'dropdown' | 'input';
    selected?: boolean;
    amount?: number;
    dropdownValue?: string;
};

export type PremiumFormData = {
  userAge: number;
  gender: 'male' | 'female';
  coveragePeriod: number;
  policies?: { policy?: string, amount?: number }[];
  riders?: Rider[];
};

export type YearlyPremium = {
  year: number;
  base: number;
  riders: number;
  total: number;
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
