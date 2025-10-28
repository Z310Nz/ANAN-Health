export type Policy = {
  id: string;
  name: string;
  segment?: string;
  segment_Code?: string;
  Budget?: string;
  Condition?: string;
  ages?: Record<string, number>;
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
