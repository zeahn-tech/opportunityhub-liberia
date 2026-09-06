import { County, OpportunityType, UserRole } from '../types';

export const LIBERIAN_COUNTIES: County[] = [
  'Montserrado',
  'Nimba',
  'Bong',
  'Grand Bassa',
  'Margibi',
  'Maryland',
  'Lofa',
  'Bomi',
  'Grand Cape Mount',
  'Sinoe',
  'Grand Gedeh',
  'River Gee',
  'Grand Kru',
  'Rivercess',
  'Gbarpolu'
];

export const OPPORTUNITY_TYPES: { id: OpportunityType; label: string; description: string }[] = [
  { id: 'job', label: 'Jobs & Employment', description: 'Full-time, part-time, and contracted professional employment.' },
  { id: 'internship', label: 'Internships', description: 'Early-career experiential training and graduate programs.' },
  { id: 'scholarship', label: 'Scholarships', description: 'Domestic and international academic and vocational funding.' },
  { id: 'fellowship', label: 'Fellowships', description: 'Leadership, research, and public health professional fellowships.' },
  { id: 'training', label: 'Training & TVET', description: 'Vocational training, technology bootcamps, and trade certifications.' },
  { id: 'contract', label: 'Commercial Contracts', description: 'B2B supply, construction, maintenance, and logistics.' },
  { id: 'tender', label: 'Public & Private Tenders', description: 'Formal competitive procurement and RFPs.' },
  { id: 'consultancy', label: 'Consultancies', description: 'Specialist advisory terms of reference.' },
  { id: 'grant', label: 'Grants & Subsidies', description: 'Non-dilutive community, youth, and agricultural funding.' },
  { id: 'partnership', label: 'Business Partnerships', description: 'Joint ventures, distribution, and commercial co-ventures.' },
  { id: 'business_sale', label: 'Businesses for Sale', description: 'Operating enterprises, concessions, and asset transfers.' },
  { id: 'investment', label: 'Investment & Capital', description: 'Equity, angel capital, and growth funding.' },
  { id: 'volunteer', label: 'Volunteer', description: 'Unpaid volunteer and community service roles.' }
];

export const EXCHANGE_RATES = {
  USD_TO_LRD: 195.0, // Benchmark rate: 1 USD = 195 LRD
  LRD_TO_USD: 1 / 195.0
};

export const PLATFORM_ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'job_seeker', label: 'Job Seeker / Talent', description: 'Search opportunities, build profile, submit applications.' },
  { id: 'employer', label: 'Employer / Org Admin', description: 'Publish vacancies, manage hiring pipeline, view candidates.' },
  { id: 'recruiter', label: 'Recruiter / Agency', description: 'Source candidates, coordinate client requisitions.' },
  { id: 'investor_buyer', label: 'Investor / Buyer', description: 'Browse M&A businesses, submit NDA access requests.' },
  { id: 'verification_officer', label: 'Verification Officer', description: 'Audit business registrations, tax clearance, issue badges.' },
  { id: 'platform_admin', label: 'Platform Administrator', description: 'System governance, global audit logs, trust & safety.' }
];

export const APP_METADATA = {
  name: 'OpportunityHub Liberia',
  shortName: 'OppHub LR',
  tagline: "Liberia's Digital Opportunity Marketplace",
  supportEmail: 'support@opportunityhub.lr',
  version: '1.0.0-foundation',
  defaultPageSize: 10
};
