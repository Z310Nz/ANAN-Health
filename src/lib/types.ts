export type User = {
  id: string;
  displayName: string;
  avatarUrl: string;
};

export type PremiumFormData = {
  userAge: number;
  coverageAmount: number;
  coveragePeriod: number;
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
