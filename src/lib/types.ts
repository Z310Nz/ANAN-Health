export type User = {
  id: string;
  displayName: string;
  avatarUrl: string;
};

export type Policy = {
  policy?: string;
  amount?: number;
}

export type PremiumFormData = {
  userAge: number;
  gender: 'male' | 'female';
  coveragePeriod: number;
  policies?: Policy[];
  discount?: number;
  // The following are deprecated and will be removed
  coverageAmount: number;
  riders: string[];
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
  }[];
};
