export interface FundingOption {
  title: string;
  badge: string;
  type: string;
  amount: number;
  structure: string;
  payback: number;
  term: string;
  payment: string;
  frequency: string;
  delay: string;
  features: string[];
}

export interface FundingCategory {
  title: string;
  description: string;
  range: string;
  options: FundingOption[];
}

export const FUNDING_CATEGORIES: FundingCategory[] = [
  {
    title: 'Category 1 – Up to $100K',
    description: 'Funding options available for amounts up to $100,000',
    range: 'Up to $100K',
    options: [
      {
        title: 'Bridge Loan',
        badge: 'Short Term',
        type: 'short',
        amount: 50000,
        structure: 'MCA',
        payback: 70500,
        term: '6 months',
        payment: '≈ $2,711/wk',
        frequency: 'Weekly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Term Loan',
        badge: 'Guaranteed',
        type: 'guarantee',
        amount: 500000,
        structure: 'Guaranteed',
        payback: 600000,
        term: '60 months',
        payment: '$10K/mo',
        frequency: 'Monthly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Mid-Term Capital Injection',
        badge: 'Capital',
        type: 'capital',
        amount: 1000000,
        structure: 'Equity/Loan',
        payback: 1340000,
        term: '72 months',
        payment: '≈ $18.6K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      },
      {
        title: 'Long-Term Structured Capital',
        badge: 'Long Term',
        type: 'long',
        amount: 2000000,
        structure: 'Fixed loan',
        payback: 0,
        term: '10 years @10% APR',
        payment: '≈ $26.4K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      }
    ]
  },
  {
    title: 'Category 2 – Above $100K',
    description: 'Funding options available for amounts above $100,000',
    range: 'Above $100K',
    options: [
      {
        title: 'Bridge Loan',
        badge: 'Short Term',
        type: 'short',
        amount: 150000,
        structure: 'MCA',
        payback: 210000,
        term: '7 months',
        payment: '≈ $7,000/wk',
        frequency: 'Weekly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Term Loan',
        badge: 'Guaranteed',
        type: 'guarantee',
        amount: 1000000,
        structure: 'Guaranteed',
        payback: 1200000,
        term: '60 months',
        payment: '$20K/mo',
        frequency: 'Monthly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Mid-Term Capital Injection',
        badge: 'Capital',
        type: 'capital',
        amount: 2000000,
        structure: 'Equity/Loan',
        payback: 2660000,
        term: '72 months',
        payment: '≈ $36.9K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      },
      {
        title: 'Long-Term Structured Capital',
        badge: 'Long Term',
        type: 'long',
        amount: 3000000,
        structure: 'Fixed loan',
        payback: 0,
        term: '10 years @10% APR',
        payment: '≈ $39.6K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      }
    ]
  },
  {
    title: 'Category 3 – Above $200K',
    description: 'Funding options available for amounts above $200,000',
    range: 'Above $200K',
    options: [
      {
        title: 'Bridge Loan',
        badge: 'Short Term',
        type: 'short',
        amount: 250000,
        structure: 'MCA',
        payback: 345000,
        term: '8 months',
        payment: '≈ $9,857/wk',
        frequency: 'Weekly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Term Loan',
        badge: 'Guaranteed',
        type: 'guarantee',
        amount: 1500000,
        structure: 'Guaranteed',
        payback: 1740000,
        term: '60 months',
        payment: '$29K/mo',
        frequency: 'Monthly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Mid-Term Capital Injection',
        badge: 'Capital',
        type: 'capital',
        amount: 3000000,
        structure: 'Equity/Loan',
        payback: 3960000,
        term: '72 months',
        payment: '≈ $55K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      },
      {
        title: 'Long-Term Structured Capital',
        badge: 'Long Term',
        type: 'long',
        amount: 5000000,
        structure: 'Fixed loan',
        payback: 0,
        term: '10 years @10% APR',
        payment: '≈ $66K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      }
    ]
  },
  {
    title: 'Category 4 – Above $300K',
    description: 'Funding options available for amounts above $300,000',
    range: 'Above $300K',
    options: [
      {
        title: 'Bridge Loan',
        badge: 'Short Term',
        type: 'short',
        amount: 400000,
        structure: 'MCA',
        payback: 544000,
        term: '9 months',
        payment: '≈ $13,949/wk',
        frequency: 'Weekly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Term Loan',
        badge: 'Guaranteed',
        type: 'guarantee',
        amount: 2000000,
        structure: 'Guaranteed',
        payback: 2300000,
        term: '60 months',
        payment: '$38,333/mo',
        frequency: 'Monthly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Mid-Term Capital Injection',
        badge: 'Capital',
        type: 'capital',
        amount: 4000000,
        structure: 'Equity/Loan',
        payback: 5280000,
        term: '72 months',
        payment: '≈ $73.3K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      },
      {
        title: 'Long-Term Structured Capital',
        badge: 'Long Term',
        type: 'long',
        amount: 7000000,
        structure: 'Fixed loan',
        payback: 0,
        term: '10 years @10% APR',
        payment: '≈ $92K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      }
    ]
  },
  {
    title: 'Category 5 – Above $500K',
    description: 'Funding options available for amounts above $500,000',
    range: 'Above $500K',
    options: [
      {
        title: 'Bridge Loan',
        badge: 'Short Term',
        type: 'short',
        amount: 750000,
        structure: 'MCA',
        payback: 1020000,
        term: '10 months',
        payment: '≈ $23,182/wk',
        frequency: 'Weekly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Term Loan',
        badge: 'Guaranteed',
        type: 'guarantee',
        amount: 2500000,
        structure: 'Guaranteed',
        payback: 2875000,
        term: '60 months',
        payment: '$47,917/mo',
        frequency: 'Monthly',
        delay: 'Same day funding',
        features: []
      },
      {
        title: 'Mid-Term Capital Injection',
        badge: 'Capital',
        type: 'capital',
        amount: 5000000,
        structure: 'Equity/Loan',
        payback: 6600000,
        term: '72 months',
        payment: '≈ $91.6K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      },
      {
        title: 'Long-Term Structured Capital',
        badge: 'Long Term',
        type: 'long',
        amount: 10000000,
        structure: 'Fixed loan',
        payback: 0,
        term: '10 years @10% APR',
        payment: '≈ $132K/mo',
        frequency: 'Monthly',
        delay: '30-60 business days',
        features: []
      }
    ]
  }
];
