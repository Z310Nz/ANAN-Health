export type User = {
  id: string;
  displayName: string;
  avatarUrl: string;
};

export type Policy = {
  id: string;
  name: string;
}

export type Rider = {
    name: string;
    category: string;
    selected?: boolean;
    amount?: number;
}

export type PremiumFormData = {
  userAge: number;
  gender: 'male' | 'female';
  coveragePeriod: number;
  policies?: { policy?: string, amount?: number }[];
  riders?: Rider[];
  // The following are deprecated and will be removed
  coverageAmount: number;
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
