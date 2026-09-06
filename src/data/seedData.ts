import {
  AccountRestriction,
  BusinessListing,
  ContentModerationRecord,
  ContentReport,
  County,
  Opportunity,
  Organization,
  SuspiciousActivityEvent,
  VerificationAudit,
  VerificationRequest
} from '../types';

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

export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-save-children',
    name: 'Save the Children Liberia',
    slug: 'save-the-children-liberia',
    type: 'ngo',
    industry: 'International NGO & Child Welfare',
    county: 'Montserrado',
    cityDistrict: 'Congo Town, Monrovia',
    address: 'Oldest Congo Town, Tubman Boulevard',
    websiteUrl: 'https://liberia.savethechildren.net',
    logoText: 'SC',
    description: 'Operating in Liberia to ensure children thrive through education, maternal child health, nutrition, and child protection programs across 8 counties.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_ngo',
    isVerified: true,
    registrationNumber: 'NGO-MOFA-LIB-2018-044',
    taxIdNumber: 'TIN-40019283-NGO',
    establishedYear: 1999,
    employeeCountRange: '50-200',
    contactEmail: 'hiring@savethechildren.lr',
    contactPhone: '+231 88 123 4400',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'hr-alerts@savethechildren.lr',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: true
    },
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'org-mpw-gov',
    name: 'Ministry of Public Works (MPW)',
    slug: 'ministry-of-public-works',
    type: 'government',
    industry: 'Infrastructure & Public Civil Works',
    county: 'Montserrado',
    cityDistrict: 'South Beach, Monrovia',
    address: 'Lynch Street, South Beach',
    websiteUrl: 'https://mpw.gov.lr',
    logoText: 'MPW',
    description: 'The statutory Government of Liberia institution charged with the planning, design, construction, and maintenance of public infrastructure, roads, and bridges.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_government',
    isVerified: true,
    registrationNumber: 'GOL-MIN-004',
    taxIdNumber: 'TIN-GOL-000004-PUB',
    establishedYear: 1928,
    employeeCountRange: '500+',
    contactEmail: 'procurement@mpw.gov.lr',
    contactPhone: '+231 77 004 8812',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'tenders@mpw.gov.lr',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: false
    },
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'org-nimba-agri',
    name: 'Nimba Agro-Industrial Cooperative',
    slug: 'nimba-agro-coop',
    type: 'private_company',
    industry: 'Agribusiness & Cocoa Export',
    county: 'Nimba',
    cityDistrict: 'Ganta Commercial District',
    address: 'Guinea Border Highway, Ganta',
    logoText: 'NAC',
    description: 'Leading agricultural consortium processing and aggregating premium shade-grown organic cocoa, coffee, and palm produce for West African trade and export.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_company',
    isVerified: true,
    registrationNumber: 'LBR-CORP-2016-892',
    taxIdNumber: 'TIN-99218273-CORP',
    establishedYear: 2014,
    employeeCountRange: '20-50',
    contactEmail: 'info@nimba-agri.lr',
    contactPhone: '+231 88 445 6677',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'talent@nimba-agri.lr',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: false
    },
    createdAt: '2026-08-10T10:00:00Z'
  },
  {
    id: 'org-kofa-tech',
    name: 'Kofa Technologies & Solar Services',
    slug: 'kofa-technologies',
    type: 'private_company',
    industry: 'Clean Energy & Telecommunications',
    county: 'Montserrado',
    cityDistrict: 'Paynesville ELWA Junction',
    address: 'ELWA Highway Plaza, Paynesville',
    websiteUrl: 'https://kofatech.lr',
    logoText: 'KT',
    description: 'Liberian pioneer in off-grid solar micro-grids, commercial rooftop PV systems, and remote IoT telecommunications monitoring.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_company',
    isVerified: true,
    registrationNumber: 'LBR-LLC-2021-4190',
    taxIdNumber: 'TIN-55192834-LLC',
    establishedYear: 2021,
    employeeCountRange: '10-20',
    contactEmail: 'contact@kofatech.lr',
    contactPhone: '+231 77 990 1122',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'careers@kofatech.lr',
      lowBandwidthDefault: false,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: true
    },
    createdAt: '2026-08-12T14:00:00Z'
  },
  {
    id: 'org-cuttington-edu',
    name: 'Cuttington University Research Institute',
    slug: 'cuttington-university',
    type: 'education',
    industry: 'Higher Education & Research',
    county: 'Bong',
    cityDistrict: 'Suakoko, Central Liberia',
    address: 'Episcopal Mission Campus, Suakoko',
    websiteUrl: 'https://cu.edu.lr',
    logoText: 'CU',
    description: 'The premier episcopal collegiate institution of higher learning in Suakoko, offering agricultural science, public health, nursing, and business degrees.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_company',
    isVerified: true,
    registrationNumber: 'MOE-EDU-LIB-1889',
    taxIdNumber: 'TIN-88912004-EDU',
    establishedYear: 1889,
    employeeCountRange: '100-500',
    contactEmail: 'admissions@cu.edu.lr',
    contactPhone: '+231 88 333 1889',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'hr@cu.edu.lr',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: true
    },
    createdAt: '2026-08-01T08:00:00Z'
  },
  {
    id: 'org-bassa-logistics',
    name: 'Bassa Maritime & Port Logistics',
    slug: 'bassa-maritime',
    type: 'private_company',
    industry: 'Shipping, Freight & Port Operations',
    county: 'Grand Bassa',
    cityDistrict: 'Buchanan Commercial Port Hub',
    address: 'Port Access Road, Buchanan',
    logoText: 'BMP',
    description: 'Specialized port cargo handling, customs clearing, marine warehousing, and bulk freight transport operating at the Port of Buchanan.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_company',
    isVerified: true,
    registrationNumber: 'LBR-CORP-2019-331',
    taxIdNumber: 'TIN-66281900-CORP',
    establishedYear: 2019,
    employeeCountRange: '20-50',
    contactEmail: 'ops@bassamaritime.lr',
    contactPhone: '+231 88 998 7766',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'recruiting@bassamaritime.lr',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: false
    },
    createdAt: '2026-08-15T09:00:00Z'
  },
  {
    id: 'org-workforce-liberia',
    name: 'Liberia Workforce Solutions & Recruiting',
    slug: 'liberia-workforce-solutions',
    type: 'recruitment_agency',
    industry: 'Executive Search & Staffing Agency',
    county: 'Montserrado',
    cityDistrict: 'Sinkor 12th Street, Monrovia',
    address: 'Tubman Blvd & 12th St, Sinkor',
    websiteUrl: 'https://liberiaworkforce.com',
    logoText: 'LWS',
    description: 'Licensed Liberian recruitment agency sourcing specialized technical, healthcare, NGO, and executive talent for multinational and local employers.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_recruiter',
    isVerified: true,
    registrationNumber: 'MOL-AGENCY-2022-108',
    taxIdNumber: 'TIN-77441199-REC',
    establishedYear: 2022,
    employeeCountRange: '10-20',
    contactEmail: 'agency@liberiaworkforce.com',
    contactPhone: '+231 88 776 1122',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'cv-pool@liberiaworkforce.com',
      lowBandwidthDefault: true,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: true
    },
    createdAt: '2026-08-18T11:00:00Z'
  },
  {
    id: 'org-pepperbird-crafts',
    name: 'Pepperbird Coffee & Artisan Roastery',
    slug: 'pepperbird-coffee-crafts',
    type: 'small_business',
    industry: 'Food & Beverage & Local Craft Retail',
    county: 'Montserrado',
    cityDistrict: 'Mamba Point, Monrovia',
    address: 'United Nations Drive, Mamba Point',
    websiteUrl: 'https://pepperbird.lr',
    logoText: 'PBC',
    description: 'Artisan Liberian specialty coffee bar, fresh indigenous pastry bakery, and gift shop showcasing locally sourced Liberica roasts and handmade country crafts.',
    verificationStatus: 'verified',
    verificationBadge: 'verified_business',
    isVerified: true,
    registrationNumber: 'LBR-SMB-2023-774',
    taxIdNumber: 'TIN-33990022-SMB',
    establishedYear: 2023,
    employeeCountRange: '5-10',
    contactEmail: 'hello@pepperbird.lr',
    contactPhone: '+231 77 334 9012',
    settings: {
      defaultCurrency: 'USD',
      candidateAlertEmail: 'manager@pepperbird.lr',
      lowBandwidthDefault: false,
      isPubliclyListed: true,
      notifyOnApplications: true,
      requireCoverNote: false
    },
    createdAt: '2026-08-20T10:00:00Z'
  }
];

export const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    organizationId: 'org-save-children',
    organization: INITIAL_ORGANIZATIONS[0],
    title: 'Senior Logistics & Supply Chain Manager',
    slug: 'senior-logistics-supply-chain-manager',
    type: 'job',
    employmentType: 'full_time',
    workplaceModel: 'hybrid',
    county: 'Montserrado',
    locationDetails: 'Congo Town, Monrovia (with field visits to Bong and Margibi)',
    currency: 'USD',
    salaryMin: 2800,
    salaryMax: 3800,
    isSalaryNegotiable: true,
    summary: 'Lead country-wide humanitarian logistics, fleet management, and cold-chain medical supply distribution across 8 Liberian counties.',
    description: 'Save the Children Liberia is seeking an experienced Senior Logistics Manager to oversee our central Monrovia warehousing, international port customs clearance, regional supply corridors, and procurement governance in compliance with USAID and EU grant guidelines.',
    responsibilities: [
      'Manage nationwide fleet operations, transport contracts, and fuel security across central and field offices.',
      'Coordinate timely clearing of humanitarian goods and medical consignments at Freeport of Monrovia and RIA.',
      'Audit warehouse inventory, maintain real-time FIFO stock reconciliation, and train county logistics officers.',
      'Enforce zero-tolerance anti-fraud and procurement compliance policies.'
    ],
    requirements: [
      'BSc or Master’s in Supply Chain Management, Logistics, Business Administration or related field.',
      'Minimum 6 years of progressive humanitarian logistics experience in West Africa.',
      'Fluency in English with demonstrated ability to negotiate with shipping agents and Liberian port authorities.',
      'Proficiency in ERP inventory systems and fleet telematics.'
    ],
    skills: ['Fleet Management', 'Customs Clearing', 'USAID Compliance', 'Warehouse Auditing', 'ERP Systems'],
    deadline: '2026-10-15',
    postedDate: '2 hours ago',
    openingsCount: 1,
    screeningQuestions: [
      'Do you have at least 5 years of humanitarian or commercial supply chain leadership experience in Liberia?',
      'Are you familiar with the Freeport of Monrovia customs clearance and ASYCUDA World platform?'
    ],
    isFeatured: true,
    viewsCount: 342,
    applicationsCount: 19,
    status: 'published'
  },
  {
    id: 'opp-2',
    organizationId: 'org-mpw-gov',
    organization: INITIAL_ORGANIZATIONS[1],
    title: 'Public Works Highway Maintenance & Culvert Construction Tender',
    slug: 'highway-maintenance-culvert-tender-nimba',
    type: 'tender',
    employmentType: 'contract',
    workplaceModel: 'on_site',
    county: 'Nimba',
    locationDetails: 'Ganta to Sanniquellie Highway Corridor, Nimba County',
    currency: 'USD',
    salaryMin: 75000,
    salaryMax: 160000,
    isSalaryNegotiable: false,
    summary: 'Competitive national bidding for engineering firms to rehabilitate 42km of feeder feeder drainage culverts and resurface critical lateral roads.',
    description: 'The Ministry of Public Works invites sealed bids from registered and verified Liberian engineering and civil contracting firms holding Valid MPW Class A/B contractor certificates and current Liberian Business Registry (LBR) clearance.',
    responsibilities: [
      'Excavate, grade, and install reinforced concrete pipe culverts across 18 designated wash-out zones.',
      'Deliver laterite gravel sub-base compaction meeting standard MPW density specifications.',
      'Coordinate with local township commissioners in Nimba County for community labor engagement.'
    ],
    requirements: [
      'Valid Ministry of Public Works Contractor Classification Certificate (Class A or B).',
      'Valid Tax Clearance Certificate from the Liberia Revenue Authority (LRA).',
      'Proof of ownership or certified lease agreement for heavy earthmoving equipment (Graders, Compactors, Excavators).'
    ],
    skills: ['Civil Engineering', 'Road Rehabilitation', 'Hydraulic Culvert Design', 'Heavy Equipment Operation'],
    deadline: '2026-10-30',
    postedDate: '5 hours ago',
    openingsCount: 2,
    screeningQuestions: [
      'Does your enterprise possess a current MPW Class A or Class B classification license?',
      'Can your firm provide an active LRA tax clearance certificate and LBR renewal for the current fiscal year?'
    ],
    isFeatured: true,
    viewsCount: 512,
    applicationsCount: 8,
    status: 'published'
  },
  {
    id: 'opp-3',
    organizationId: 'org-kofa-tech',
    organization: INITIAL_ORGANIZATIONS[3],
    title: 'Solar PV Systems Field Engineer & Microgrid Technician',
    slug: 'solar-pv-systems-field-engineer',
    type: 'job',
    employmentType: 'full_time',
    workplaceModel: 'on_site',
    county: 'Margibi',
    locationDetails: 'Kakata and Harbel agricultural off-grid sites',
    currency: 'USD',
    salaryMin: 950,
    salaryMax: 1400,
    isSalaryNegotiable: true,
    summary: 'Deploy, test, and commission commercial hybrid solar inverter systems and lithium storage for commercial farms and clinics.',
    description: 'Join Kofa Technologies as we rapidly expand solar electrification across Margibi, Bong, and Grand Bassa. You will lead field installations of 10kW to 100kW solar arrays, Victron/SMA inverters, and battery management systems.',
    responsibilities: [
      'Execute rooftop and ground-mount PV array assembly following national electrical safety standards.',
      'Program and commission hybrid inverter controllers, solar charge controllers, and IoT remote monitoring modems.',
      'Conduct scheduled preventive maintenance and battery health diagnostics.'
    ],
    requirements: [
      'Diploma or Bachelor’s degree in Electrical Engineering or certified TVET electrical credentials.',
      'Minimum 2 years of hands-on experience installing solar PV systems.',
      'Valid Liberian driver’s license and willingness to spend 40% of time on rural installations.'
    ],
    skills: ['Solar PV', 'Electrical Wiring', 'Inverter Programming', 'Safety Protocols', 'Troubleshooting'],
    deadline: '2026-11-05',
    postedDate: '1 day ago',
    openingsCount: 3,
    screeningQuestions: [
      'Do you have experience configuring Victron, Growatt, or Schneider hybrid inverters?',
      'Are you comfortable working on elevated roofs with safety harness gear?'
    ],
    isFeatured: false,
    viewsCount: 189,
    applicationsCount: 14,
    status: 'published'
  },
  {
    id: 'opp-4',
    organizationId: 'org-cuttington-edu',
    organization: INITIAL_ORGANIZATIONS[4],
    title: 'Postgraduate Agricultural Fellowship & Research Grant',
    slug: 'cuttington-postgraduate-agri-fellowship',
    type: 'fellowship',
    employmentType: 'contract',
    workplaceModel: 'hybrid',
    county: 'Bong',
    locationDetails: 'Suakoko Campus, Bong County',
    currency: 'USD',
    salaryMin: 12000,
    salaryMax: 18000,
    isSalaryNegotiable: false,
    summary: 'Fully funded 12-month research fellowship for Liberian scientists focusing on climate-resilient lowland cassava and rice yields.',
    description: 'Cuttington University, in partnership with international agricultural consortia, awards this comprehensive fellowship including monthly living stipend, research laboratory equipment access, field trial plots, and publication sponsorship.',
    responsibilities: [
      'Conduct multi-plot seed testing across selected farm cooperatives in Bong and Lofa counties.',
      'Publish at least two peer-reviewed working papers on pest resistance and soil enrichment.',
      'Conduct farmer training workshops in Gbarnga and Voinjama.'
    ],
    requirements: [
      'Bachelor’s or Master’s in Agronomy, Crop Science, Soil Sciences, or Environmental Biology.',
      'Citizenship of Liberia or ECOWAS member state residing in Liberia.',
      'Strong quantitative research methodologies and statistical analysis skills.'
    ],
    skills: ['Agronomy', 'Field Research', 'Crop Science', 'Data Analysis', 'Grant Writing'],
    deadline: '2026-11-20',
    postedDate: '2 days ago',
    openingsCount: 4,
    screeningQuestions: [
      'Have you conducted agricultural fieldwork in rural Liberia?',
      'Do you hold a relevant degree in Agronomy, Plant Science, or Environmental Studies?'
    ],
    isFeatured: true,
    viewsCount: 620,
    applicationsCount: 41,
    status: 'published'
  },
  {
    id: 'opp-5',
    organizationId: 'org-bassa-logistics',
    organization: INITIAL_ORGANIZATIONS[5],
    title: 'Port Equipment Maintenance & Heavy Fleet Consultancy',
    slug: 'port-equipment-fleet-consultancy',
    type: 'consultancy',
    employmentType: 'contract',
    workplaceModel: 'on_site',
    county: 'Grand Bassa',
    locationDetails: 'Buchanan Port Terminal, Grand Bassa',
    currency: 'USD',
    salaryMin: 4500,
    salaryMax: 6500,
    isSalaryNegotiable: true,
    summary: '4-month specialized consultancy to overhaul marine cranes, reach stackers, and preventive mechanical protocols at Buchanan Port.',
    description: 'Bassa Maritime & Port Logistics requires a seasoned Heavy Machinery Consultant to audit crane telemetry, overhaul hydraulic systems, and establish ISO-standard preventive maintenance schedules for heavy dockside terminal lifters.',
    responsibilities: [
      'Inspect 6 Kalmar reach stackers and 2 mobile harbor cranes.',
      'Formulate preventive overhaul schedules and critical spare parts inventory forecasts.',
      'Train local Liberian mechanical apprentices and technicians.'
    ],
    requirements: [
      'Certified Mechanical Engineer or Master Marine Technician.',
      '10+ years experience with port container handling cranes or heavy mining equipment.'
    ],
    skills: ['Heavy Machinery', 'Hydraulics', 'Port Operations', 'Mechanical Engineering', 'Safety Auditing'],
    deadline: '2026-10-25',
    postedDate: '3 days ago',
    openingsCount: 1,
    screeningQuestions: [
      'Have you managed or serviced Kalmar, Terex, or Liebherr harbor cranes?'
    ],
    isFeatured: false,
    viewsCount: 145,
    applicationsCount: 5,
    status: 'published'
  },
  {
    id: 'opp-6',
    organizationId: 'org-nimba-agri',
    organization: INITIAL_ORGANIZATIONS[2],
    title: 'Youth Agribusiness TVET Apprenticeship & Skills Program',
    slug: 'youth-agribusiness-tvet-apprenticeship',
    type: 'training',
    employmentType: 'internship',
    workplaceModel: 'on_site',
    county: 'Nimba',
    locationDetails: 'Ganta Agro-Incubator, Nimba County',
    currency: 'USD',
    salaryMin: 250,
    salaryMax: 350,
    isSalaryNegotiable: false,
    summary: '6-month paid technical vocational training for youth in solar nursery irrigation, organic cocoa pruning, and digital cooperative bookkeeping.',
    description: 'An empowerment program designed to equip 25 young Liberians with practical agricultural trade skills, modern equipment operation, and post-harvest drying techniques with a guaranteed transition stipend.',
    responsibilities: [
      'Participate in classroom agribusiness theory and 4 days/week practical nursery stewardship.',
      'Learn digital weight-scale telemetry and mobile money farmer payments.'
    ],
    requirements: [
      'Liberian citizen aged 18 to 29 residing in Nimba, Bong, or Grand Gedeh.',
      'High school completion or equivalent TVET technical interest.'
    ],
    skills: ['Agribusiness', 'Farm Management', 'Cocoa Husbandry', 'Cooperative Accounting'],
    deadline: '2026-10-18',
    postedDate: '4 days ago',
    openingsCount: 25,
    screeningQuestions: [
      'Are you between the ages of 18 and 29 and available for full-time on-site training in Ganta?'
    ],
    isFeatured: false,
    viewsCount: 420,
    applicationsCount: 88,
    status: 'published'
  }
];

export const INITIAL_BUSINESS_LISTINGS: BusinessListing[] = [
  {
    id: 'biz-1',
    title: 'Commercial Cold Storage & Ice Production Plant',
    industry: 'Food Processing & Cold Chain Logistics',
    county: 'Montserrado',
    cityDistrict: 'Bushrod Island',
    locationSummary: 'Bushrod Island Commercial Zone, near Freeport of Monrovia',
    isConfidential: false,
    publicTeaser: 'Fully operational industrial ice plant and 400-ton cold storage facility serving commercial fisheries, fishing trawlers, and central markets with dedicated dual-fuel industrial generator backup.',
    confidentialDescription: 'The enterprise holds exclusive supplier contracts with 14 coastal trawler fleets and key fish merchants across West Point and Waterside markets. 3-phase commercial transformer, 250kVA Perkins backup generator, 2 cold storage rooms (-18C), 3 flake-ice machines producing 15 tons daily. Current gross margins exceed 44%.',
    askingPriceUSD: 245000,
    annualRevenueUSD: 185000,
    annualProfitUSD: 68000,
    financialRanges: {
      revenueRange: '$150,000 - $250,000',
      profitRange: '$50,000 - $100,000',
      ebitdaRange: '$75,000',
      cashFlowRange: '$70,000 - $85,000'
    },
    establishedYear: 2017,
    employeeCount: 14,
    assetsIncluded: [
      'Industrial freehold land lease (18 years remaining)',
      '3x 5-ton Industrial Flake Ice Machines',
      '250 kVA Soundproof Diesel Generator',
      '2x Isuzu Insulated Refrigerated Delivery Trucks (2019)'
    ],
    reasonForSale: 'Owner relocating for overseas diplomatic posting.',
    isVerified: true,
    moderationStatus: 'published',
    sellerName: 'Emmanuel Kollie (Bassa Logistics Ltd)',
    sellerContactEmail: 'ekollie@bassalogistics.lr',
    sellerContactPhone: '+231 88 650 1200',
    photos: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'published',
    hasRequestedAccess: false,
    accessGranted: false,
    inquiriesCount: 6
  },
  {
    id: 'biz-2',
    title: 'Established Rubber Plantation & Nursery Concession',
    industry: 'Agriculture & Forestry',
    county: 'Margibi',
    cityDistrict: 'Kakata',
    locationSummary: 'Kakata Rubber Corridor, Margibi County',
    isConfidential: true,
    publicTeaser: 'Confidential Listing: 350-acre producing rubber estate with mature tapping trees, smokehouse processing sheds, and 40,000 clone sapling nursery under active commercial harvesting.',
    confidentialDescription: 'Full cadastral survey and deed registered with the Liberia Land Authority. Currently producing an average of 38 tons of processed latex monthly with direct delivery agreement to national processing exporters. 6 residential worker units, manager bungalow, clean well with solar submersible pump.',
    askingPriceUSD: 390000,
    annualRevenueUSD: 240000,
    annualProfitUSD: 94000,
    financialRanges: {
      revenueRange: '$200,000 - $300,000',
      profitRange: '$75,000 - $125,000',
      ebitdaRange: '$110,000',
      cashFlowRange: '$90,000 - $110,000'
    },
    establishedYear: 2008,
    employeeCount: 32,
    assetsIncluded: [
      '350 Acres Deeded Land registered with Liberia Land Authority',
      'Active Rubber Trees (90% currently tappable)',
      'Processing Sheds & Coagulation Tanks',
      'Tractor & 2 Farm Trailers'
    ],
    reasonForSale: 'Family succession / estate settlement.',
    isVerified: true,
    moderationStatus: 'published',
    sellerName: 'Margibi Estate Advisory Trust',
    sellerContactEmail: 'advisory@margibitrust.lr',
    sellerContactPhone: '+231 77 555 4321',
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592417817098-8f3d6eb19655?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'published',
    hasRequestedAccess: false,
    accessGranted: false,
    inquiriesCount: 11
  },
  {
    id: 'biz-3',
    title: 'Turnkey Boutique Hotel & Conference Center',
    industry: 'Hospitality & Tourism',
    county: 'Grand Bassa',
    cityDistrict: 'Buchanan',
    locationSummary: 'Buchanan Oceanfront Boulevard, Grand Bassa',
    isConfidential: true,
    publicTeaser: 'Confidential Listing: 22-room premier coastal hospitality destination with oceanfront restaurant, conference pavilion accommodating 120 guests, and private swimming pool.',
    confidentialDescription: 'Consistently the preferred lodging for international NGO delegations, mining executives, and government retreats in Buchanan. 22 en-suite air-conditioned rooms, full commercial kitchen with walk-in chillers, 100kVA Cummins generator, 25kW solar array, direct beach access.',
    askingPriceUSD: 520000,
    annualRevenueUSD: 310000,
    annualProfitUSD: 115000,
    financialRanges: {
      revenueRange: '$250,000 - $500,000',
      profitRange: '$100,000 - $200,000',
      ebitdaRange: '$135,000',
      cashFlowRange: '$120,000 - $140,000'
    },
    establishedYear: 2015,
    employeeCount: 24,
    assetsIncluded: [
      'Prime oceanfront titled property',
      'All commercial restaurant equipment & hotel furnishings',
      '100kVA Cummins Generator + 25kW Solar Backup',
      '14-seater Toyota Hiace Guest Shuttle Van'
    ],
    reasonForSale: 'Retirement of primary founding partners.',
    isVerified: true,
    moderationStatus: 'published',
    sellerName: 'Bassa Heritage Holdings',
    sellerContactEmail: 'invest@bassaheritage.lr',
    sellerContactPhone: '+231 88 012 3456',
    photos: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'published',
    hasRequestedAccess: false,
    accessGranted: false,
    inquiriesCount: 8
  },
  {
    id: 'biz-4',
    title: 'Monrovia Central Pharmacy & Medical Diagnostics Chain',
    industry: 'Healthcare & Pharmaceuticals',
    county: 'Montserrado',
    cityDistrict: 'Sinkor',
    locationSummary: 'Tubman Boulevard Commercial Hub, Sinkor, Monrovia',
    isConfidential: false,
    publicTeaser: 'High-traffic retail pharmacy and diagnostic laboratory with valid Ministry of Health import license, automated inventory management, and long-term corporate health service agreements.',
    confidentialDescription: 'Includes 2 prime retail locations in Sinkor and Congo Town. Equipped with automated blood biochemistry analyzers, digital X-ray machine, and pharmaceutical cold chain storage. Year-on-year revenue growth of 18%.',
    askingPriceUSD: 180000,
    annualRevenueUSD: 210000,
    annualProfitUSD: 62000,
    financialRanges: {
      revenueRange: '$150,000 - $250,000',
      profitRange: '$50,000 - $100,000',
      ebitdaRange: '$70,000',
      cashFlowRange: '$60,000 - $75,000'
    },
    establishedYear: 2019,
    employeeCount: 11,
    assetsIncluded: [
      'Ministry of Health Pharmacy Import License',
      'Diagnostic Lab Equipment & Digital X-Ray',
      'Wholesale Inventory Stock ($45,000 value)',
      'Long-term leases on prime Tubman Blvd frontage'
    ],
    reasonForSale: 'Founder pivoting to specialist medical residency abroad.',
    isVerified: true,
    moderationStatus: 'published',
    sellerName: 'Dr. Joseph Flomo',
    sellerContactEmail: 'dr.flomo@sinkormedical.lr',
    sellerContactPhone: '+231 88 999 1122',
    photos: [
      'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'published',
    hasRequestedAccess: false,
    accessGranted: false,
    inquiriesCount: 4
  }
];

export const INITIAL_VERIFICATION_AUDITS: VerificationAudit[] = [
  {
    id: 'verif-101',
    organizationName: 'Bassa Maritime & Port Logistics',
    organizationType: 'Private Enterprise',
    county: 'Grand Bassa',
    registryNumber: 'LBR-CORP-2019-331',
    taxIdNumber: 'TIN-400192881',
    badgeRequested: 'verified_company',
    submissionDate: '2026-09-02',
    status: 'approved',
    documents: ['LBR Business Certificate.pdf', 'LRA Tax Clearance 2026.pdf', 'Ministry of Transport Port Permit.pdf']
  },
  {
    id: 'verif-102',
    organizationName: 'Ganta Women Farmers Cooperative',
    organizationType: 'Small Business / Cooperative',
    county: 'Nimba',
    registryNumber: 'LBR-COOP-2022-771',
    taxIdNumber: 'TIN-599201924',
    badgeRequested: 'verified_business',
    submissionDate: '2026-09-04',
    status: 'under_review',
    documents: ['Cooperative By-Laws.pdf', 'County Agricultural Registration.pdf']
  },
  {
    id: 'verif-103',
    organizationName: 'West Africa Health Outreach Trust',
    organizationType: 'Non-Governmental Organization',
    county: 'Montserrado',
    registryNumber: 'NGO-MOFA-LIB-2023-118',
    taxIdNumber: 'TIN-300188291',
    badgeRequested: 'verified_ngo',
    submissionDate: '2026-09-05',
    status: 'pending',
    documents: ['MOFA Accreditation Certificate.pdf', 'Board of Trustees Charter.pdf']
  }
];

export const INITIAL_CANDIDATE_PROFILES = [
  {
    userId: 'user-seeker-1',
    fullName: 'Tamba Kollie',
    email: 'tamba.kollie@gmail.com',
    phone: '+231 77 554 9912',
    county: 'Montserrado' as County,
    cityDistrict: 'Sinkor, Monrovia',
    avatarUrl: '',
    headline: 'Senior Supply Chain & Humanitarian Logistics Specialist',
    bio: 'Dedicated logistics coordinator with 7+ years managing national supply chains, pharmaceutical cold-chains, and multi-vehicle fleets across Liberia including Montserrado, Nimba, and Lofa counties.',
    yearsOfExperience: 7,
    highestEducationLevel: 'Bachelor of Business Administration (BBA)',
    education: [
      {
        id: 'edu-1',
        degree: 'Bachelor of Business Administration (BBA)',
        institution: 'University of Liberia',
        fieldOfStudy: 'Management & Procurement',
        startYear: 2015,
        endYear: 2019,
        isCurrent: false,
        gradeOrHonors: 'Magna Cum Laude (GPA 3.75)',
        description: 'Concentration in Supply Chain Management and Liberian Commercial Law.'
      },
      {
        id: 'edu-2',
        degree: 'Postgraduate Certificate',
        institution: 'Stella Maris Polytechnic University',
        fieldOfStudy: 'Project Planning & Monitoring',
        startYear: 2020,
        endYear: 2021,
        isCurrent: false,
        gradeOrHonors: 'High Distinction'
      }
    ],
    experience: [
      {
        id: 'exp-1',
        jobTitle: 'Fleet & Logistics Operations Lead',
        company: 'Monrovia Breweries Inc.',
        county: 'Montserrado' as County,
        cityDistrict: 'Bushrod Island, Monrovia',
        startDate: '2022-03',
        isCurrent: true,
        responsibilities: [
          'Supervise daily operations of 34 commercial distribution trucks covering Montserrado, Margibi, and Grand Bassa.',
          'Reduced monthly vehicle turnaround time by 28% through GPS telemetry tracking and fuel auditing.',
          'Negotiated local carrier freight contracts saving $45,000 annually.'
        ],
        accomplishments: [
          'Implemented paperless digital dispatch system adopted company-wide.',
          'Zero in-transit cargo loss recorded over 24 consecutive months.'
        ]
      },
      {
        id: 'exp-2',
        jobTitle: 'Humanitarian Logistics & Field Officer',
        company: 'Action Against Hunger Liberia',
        county: 'Nimba' as County,
        cityDistrict: 'Sanniquellie & Ganta',
        startDate: '2019-06',
        endDate: '2022-02',
        isCurrent: false,
        responsibilities: [
          'Coordinated emergency nutrition distribution across 18 remote clinics in northern Liberia.',
          'Maintained WHO-compliant vaccine cold chain storage throughout unpaved rainy season transport.'
        ],
        accomplishments: [
          'Awarded Best Field Operations Officer in West Africa Regional Mission (2021).'
        ]
      }
    ],
    skills: [
      { name: 'Supply Chain Operations', level: 'expert', yearsOfExperience: 7 },
      { name: 'Cold-Chain Logistics', level: 'expert', yearsOfExperience: 5 },
      { name: 'Fleet Telematics & Dispatch', level: 'expert', yearsOfExperience: 6 },
      { name: 'ERP & Inventory Management', level: 'intermediate', yearsOfExperience: 4 },
      { name: 'Liberian Customs Clearance (ASYCUDA)', level: 'intermediate', yearsOfExperience: 4 },
      { name: 'Disaster Relief Coordination', level: 'expert', yearsOfExperience: 5 }
    ],
    certifications: [
      {
        id: 'cert-1',
        name: 'Chartered Institute of Procurement & Supply (CIPS Level 4)',
        issuingOrganization: 'CIPS UK / West Africa',
        issueDate: '2023-05',
        credentialId: 'CIPS-LBR-2023-8812',
        credentialUrl: 'https://cips.org/verify/CIPS-LBR-2023-8812'
      },
      {
        id: 'cert-2',
        name: 'Humanitarian Supply Chain Logistics Certification',
        issuingOrganization: 'Fritz Institute / Humanitarian Logistics Association',
        issueDate: '2021-11',
        credentialId: 'HLA-MED-9941'
      }
    ],
    languages: [
      { language: 'English', proficiency: 'native' },
      { language: 'Liberian English / Koloqua', proficiency: 'native' },
      { language: 'Kpelle', proficiency: 'fluent' },
      { language: 'French', proficiency: 'basic' }
    ],
    cv: {
      fileName: 'Tamba_Kollie_Logistics_CV_2026.pdf',
      fileSizeBytes: 284500,
      uploadedAt: '2026-08-25T14:30:00Z',
      summaryExtract: 'Senior Logistics Specialist with 7+ years track record in FMCG and humanitarian supply chain management across 8 Liberian counties.'
    },
    cvFileName: 'Tamba_Kollie_Logistics_CV_2026.pdf',
    portfolio: [
      {
        id: 'port-1',
        title: 'Emergency Medical Cold-Chain Route Optimization',
        description: 'Designed low-cost solar-refrigerated motorbike transit lines delivering critical vaccines to 42 off-grid primary care centers in Nimba and Lofa.',
        role: 'Lead Architect & Field Manager',
        tags: ['Cold-Chain', 'Solar Power', 'Healthcare Logistics'],
        completedYear: 2021
      },
      {
        id: 'port-2',
        title: 'Commercial Distribution Fleet Digitization',
        description: 'Built digital load reconciliation and electronic proof-of-delivery workflow saving 200+ paper hours per week.',
        role: 'Project Lead',
        tags: ['ERP', 'Fleet Management', 'Efficiency'],
        completedYear: 2023
      }
    ],
    privacySettings: {
      profileVisibility: 'public',
      contactVisibility: 'on_application_only',
      cvDownloadPermission: 'applied_jobs_only',
      showSalaryExpectations: true
    },
    isSearchable: true,
    updatedAt: '2026-09-02T16:00:00Z'
  },
  {
    userId: 'user-provider-1',
    fullName: 'Eng. Patrick Sumo',
    email: 'patrick@gantacivil.lr',
    phone: '+231 88 612 0041',
    county: 'Nimba' as County,
    cityDistrict: 'Ganta Main Commercial Hub',
    avatarUrl: '',
    headline: 'Senior Civil Engineer & Project Superintendent',
    bio: 'Registered Civil Engineer (ALCE) with 12 years of experience leading highway earthworks, bridge maintenance, and commercial construction projects throughout central and northern Liberia.',
    yearsOfExperience: 12,
    highestEducationLevel: 'B.Sc. Civil Engineering',
    education: [
      {
        id: 'edu-p1',
        degree: 'Bachelor of Science in Civil Engineering',
        institution: 'Cuttington University',
        fieldOfStudy: 'Structural & Highway Engineering',
        startYear: 2008,
        endYear: 2013,
        isCurrent: false,
        gradeOrHonors: 'Honors Graduate'
      }
    ],
    experience: [
      {
        id: 'exp-p1',
        jobTitle: 'Managing Civil Engineer & Contractor',
        company: 'Ganta Civil Construction Services',
        county: 'Nimba' as County,
        cityDistrict: 'Ganta',
        startDate: '2018-01',
        isCurrent: true,
        responsibilities: [
          'Oversee Class A licensed civil contracting firm managing culverts, bridges, and feeder road grading.',
          'Direct fleet of 6 excavators, 4 motor graders, and 8 dump trucks.'
        ],
        accomplishments: [
          'Delivered 35km Gbarnga-Ganta feeder road remediation on schedule under World Bank funding.'
        ]
      }
    ],
    skills: [
      { name: 'Highway & Drainage Engineering', level: 'expert', yearsOfExperience: 12 },
      { name: 'AutoCAD Civil 3D', level: 'expert', yearsOfExperience: 10 },
      { name: 'Public Works Bidding & Tender Compliance', level: 'expert', yearsOfExperience: 9 },
      { name: 'Reinforced Concrete Culverts', level: 'expert', yearsOfExperience: 12 }
    ],
    certifications: [
      {
        id: 'cert-p1',
        name: 'Licensed Professional Engineer (Civil)',
        issuingOrganization: 'Association of Liberian Certified Engineers (ALCE)',
        issueDate: '2016-04',
        credentialId: 'ALCE-CIV-2016-0419'
      }
    ],
    languages: [
      { language: 'English', proficiency: 'native' },
      { language: 'Kpelle', proficiency: 'native' },
      { language: 'Mano', proficiency: 'fluent' }
    ],
    cv: {
      fileName: 'Eng_Patrick_Sumo_Civil_Contractor_CV.pdf',
      fileSizeBytes: 310000,
      uploadedAt: '2026-08-28T12:00:00Z',
      summaryExtract: 'Certified Liberian Civil Engineer and licensed Class A contractor with 12+ years executing public infrastructure projects.'
    },
    portfolio: [
      {
        id: 'port-p1',
        title: 'Ganta Multi-Barrel Drainage Infrastructure',
        description: 'Constructed twin box culverts protecting commercial hub from seasonal inundation during torrential downpours.',
        role: 'Chief Site Engineer',
        tags: ['Civil Works', 'Hydraulics', 'Public Infrastructure'],
        completedYear: 2022
      }
    ],
    privacySettings: {
      profileVisibility: 'public',
      contactVisibility: 'public',
      cvDownloadPermission: 'all_employers',
      showSalaryExpectations: false
    },
    isSearchable: true,
    updatedAt: '2026-08-28T12:00:00Z'
  }
];

export const INITIAL_APPLICATIONS = [
  {
    id: 'app-seed-1',
    opportunityId: 'opp-1',
    opportunityTitle: 'Senior Logistics & Supply Chain Manager',
    organizationId: 'org-save-children',
    organizationName: 'Save the Children Liberia',
    applicantUserId: 'user-seeker-1',
    applicantName: 'Tamba Kollie',
    applicantEmail: 'tamba.kollie@gmail.com',
    applicantPhone: '+231 77 554 9912',
    applicantLocation: 'Sinkor, Monrovia, Montserrado',
    stage: 'interview' as const,
    appliedDate: '2026-09-02',
    coverNote: 'Having directed cross-county logistics at Monrovia Breweries and cold-chain relief with Action Against Hunger, I bring 7+ years of rigorous Liberian operational leadership to Save the Children.',
    resumeFileName: 'Tamba_Kollie_Logistics_CV_2026.pdf',
    screeningAnswers: {
      '0': 'Over 7 years overseeing logistics and regional fleet across Montserrado, Nimba, and Lofa.',
      '1': 'Yes, fully familiar and have directed emergency nutrition distribution under USAID/ECHO guidelines.'
    },
    matchScore: 95,
    matchNotes: 'Exceptional match with 7+ years of humanitarian cold-chain experience in Liberia and CIPS certification.',
    rating: 5,
    employerNotes: 'Strongest applicant for the role. Impressed during initial screening. Panel interview scheduled.',
    interviewDetails: {
      scheduledDate: '2026-09-10',
      scheduledTime: '10:30',
      format: 'on_site' as const,
      locationOrLink: 'Save the Children Country Office, Tubman Blvd, Congo Town, Monrovia',
      interviewerNames: ['Dr. Evelyn Fahnbulleh (Country Director)', 'Marie Weah (HR Lead)'],
      notes: 'Please bring copies of CIPS accreditation and original driver license.'
    },
    history: [
      {
        id: 'hist-1',
        stage: 'applied' as const,
        changedAt: '2026-09-02T09:15:00Z',
        changedByName: 'Tamba Kollie',
        note: 'Application submitted via OpportunityHub portal.'
      },
      {
        id: 'hist-2',
        stage: 'under_review' as const,
        changedAt: '2026-09-03T11:00:00Z',
        changedByName: 'Dr. Evelyn Fahnbulleh',
        note: 'Candidate credentials reviewed against donor procurement compliance rules.'
      },
      {
        id: 'hist-3',
        stage: 'shortlisted' as const,
        changedAt: '2026-09-03T16:30:00Z',
        changedByName: 'Dr. Evelyn Fahnbulleh',
        note: 'Shortlisted as top-tier candidate.'
      },
      {
        id: 'hist-4',
        stage: 'interview' as const,
        changedAt: '2026-09-04T14:00:00Z',
        changedByName: 'Marie Weah',
        note: 'In-person panel interview scheduled at Country HQ.',
        interviewDetails: {
          scheduledDate: '2026-09-10',
          scheduledTime: '10:30',
          format: 'on_site' as const,
          locationOrLink: 'Save the Children Country Office, Tubman Blvd, Congo Town, Monrovia',
          interviewerNames: ['Dr. Evelyn Fahnbulleh (Country Director)', 'Marie Weah (HR Lead)'],
          notes: 'Please bring copies of CIPS accreditation and original driver license.'
        }
      }
    ],
    updatedAt: '2026-09-04T14:00:00Z'
  },
  {
    id: 'app-seed-2',
    opportunityId: 'opp-2',
    opportunityTitle: 'Highway Maintenance Culvert Construction Tender',
    organizationId: 'org-mpw-gov',
    organizationName: 'Ministry of Public Works (MPW)',
    applicantUserId: 'user-provider-1',
    applicantName: 'Eng. Patrick Sumo (Ganta Civil)',
    applicantEmail: 'patrick@gantacivil.lr',
    applicantPhone: '+231 88 612 0041',
    applicantLocation: 'Ganta, Nimba County',
    stage: 'under_review' as const,
    appliedDate: '2026-09-04',
    coverNote: 'Registered Class A civil contractor with complete earthmoving fleet stationed in Nimba ready for rapid culvert deployment.',
    resumeFileName: 'Eng_Patrick_Sumo_Civil_Contractor_CV.pdf',
    screeningAnswers: {
      '0': 'Yes, ALCE Certified and fully compliant with MPW 2026 Contractor Registry.'
    },
    matchScore: 92,
    matchNotes: 'Licensed Class A contractor with heavy equipment stationed within 25km of project corridor.',
    rating: 4,
    employerNotes: 'Equipment manifest verified. Awaiting technical committee review.',
    history: [
      {
        id: 'hist-1',
        stage: 'applied' as const,
        changedAt: '2026-09-04T10:00:00Z',
        changedByName: 'Eng. Patrick Sumo',
        note: 'Formal tender bid dossier submitted.'
      },
      {
        id: 'hist-2',
        stage: 'under_review' as const,
        changedAt: '2026-09-04T15:00:00Z',
        changedByName: 'Hon. Emmanuel Sumo',
        note: 'Passed initial compliance audit. Forwarded to procurement evaluation team.'
      }
    ],
    updatedAt: '2026-09-04T15:00:00Z'
  }
];

export const INITIAL_VERIFICATION_REQUESTS: VerificationRequest[] = [
  {
    id: 'verif-req-1',
    entityType: 'organization',
    entityId: 'org-buchanan-agro',
    entityName: 'Buchanan Agro Logistics Inc.',
    submitterUserId: 'user-employer-1',
    submitterName: 'Dr. Evelyn Fahnbulleh',
    submitterEmail: 'hiring@savethechildren.lr',
    status: 'pending_review',
    badgeRequested: 'verified_company',
    registrationNumber: 'LBR-CORP-2024-5519',
    taxIdNumber: 'TIN-88001928-CORP',
    county: 'Grand Bassa',
    evidenceDocuments: [
      {
        id: 'doc-1',
        fileName: 'Liberia_Business_Registry_Certificate_2026.pdf',
        fileType: 'application/pdf',
        documentType: 'lbr_certificate',
        fileSize: 1240000,
        urlOrData: 'https://moci.gov.lr/registry/LBR-CORP-2024-5519.pdf',
        uploadedAt: '2026-09-01T10:00:00Z'
      },
      {
        id: 'doc-2',
        fileName: 'LRA_Tax_Clearance_Certificate.pdf',
        fileType: 'application/pdf',
        documentType: 'tax_clearance',
        fileSize: 890000,
        urlOrData: 'https://lra.gov.lr/verify/TIN-88001928.pdf',
        uploadedAt: '2026-09-01T10:02:00Z'
      }
    ],
    evidenceNotes: 'Statutory corporate tax clearance and LBR renewal filed for 2026 fiscal year.',
    submittedAt: '2026-09-01T10:05:00Z',
    updatedAt: '2026-09-01T10:05:00Z'
  },
  {
    id: 'verif-req-2',
    entityType: 'recruiter',
    entityId: 'user-recruiter-1',
    entityName: 'Korto Flomo (Liberia Workforce Solutions)',
    submitterUserId: 'user-recruiter-1',
    submitterName: 'Korto Flomo',
    submitterEmail: 'agency@liberiaworkforce.com',
    status: 'pending_review',
    badgeRequested: 'verified_recruiter',
    registrationNumber: 'MOL-AGENCY-2022-108',
    taxIdNumber: 'TIN-77441199-REC',
    licenseNumber: 'HR-LIC-LIB-2024-0092',
    county: 'Montserrado',
    evidenceDocuments: [
      {
        id: 'doc-3',
        fileName: 'Ministry_of_Labour_Employment_Agency_Permit.pdf',
        fileType: 'application/pdf',
        documentType: 'hr_license',
        fileSize: 1100000,
        urlOrData: 'https://mol.gov.lr/licenses/HR-LIC-2024-0092.pdf',
        uploadedAt: '2026-09-03T11:20:00Z'
      }
    ],
    evidenceNotes: 'Official Ministry of Labour employment agency license renewal.',
    submittedAt: '2026-09-03T11:25:00Z',
    updatedAt: '2026-09-03T11:25:00Z'
  },
  {
    id: 'verif-req-3',
    entityType: 'business',
    entityId: 'biz-1',
    entityName: 'Pepperbird Specialty Coffee Roastery',
    submitterUserId: 'user-employer-1',
    submitterName: 'Dr. Evelyn Fahnbulleh',
    submitterEmail: 'hiring@savethechildren.lr',
    status: 'verified',
    badgeRequested: 'verified_business',
    registrationNumber: 'LBR-SMB-2023-774',
    taxIdNumber: 'TIN-33990022-SMB',
    county: 'Montserrado',
    evidenceDocuments: [
      {
        id: 'doc-4',
        fileName: 'Audited_Financial_Statement_2025.pdf',
        fileType: 'application/pdf',
        documentType: 'ownership_proof',
        fileSize: 2100000,
        urlOrData: 'https://moci.gov.lr/docs/Pepperbird_Audited_2025.pdf',
        uploadedAt: '2026-08-20T09:00:00Z'
      }
    ],
    evidenceNotes: 'Audited financial records and title deed verified by MOCI auditor.',
    reviewerUserId: 'user-admin-1',
    reviewerName: 'Platform Administrator',
    reviewerNotes: 'Verified against MOCI Business Registry database.',
    submittedAt: '2026-08-20T09:00:00Z',
    reviewedAt: '2026-08-21T14:00:00Z',
    updatedAt: '2026-08-21T14:00:00Z'
  }
];

export const INITIAL_CONTENT_MODERATION_RECORDS: ContentModerationRecord[] = [
  {
    id: 'mod-1',
    targetType: 'opportunity',
    targetId: 'opp-flagged-sample',
    title: 'High Yield Remote Crypto Data Entry Operator',
    organizationName: 'Unverified Global Traders',
    ownerUserId: 'user-suspicious-99',
    ownerName: 'Anonymous Poster',
    moderationStatus: 'flagged',
    automatedFlags: [
      {
        ruleId: 'rule-fee-request',
        ruleName: 'Upfront Application Fee Trigger',
        description: 'Listing text contained forbidden phrase: "pay registration fee of $25 via Western Union".',
        severity: 'high'
      },
      {
        ruleId: 'rule-unrealistic-salary',
        ruleName: 'Unrealistic Pay Ratio',
        description: 'Offered $12,000/month for entry level data entry (exceeds regional benchmark by >20x).',
        severity: 'medium'
      }
    ],
    reportCount: 3,
    createdAt: '2026-09-04T16:00:00Z',
    updatedAt: '2026-09-04T16:00:00Z'
  }
];

export const INITIAL_CONTENT_REPORTS: ContentReport[] = [
  {
    id: 'rep-1',
    reportType: 'listing',
    targetId: 'opp-flagged-sample',
    targetTitleOrName: 'High Yield Remote Crypto Data Entry Operator',
    reporterUserId: 'user-seeker-1',
    reporterName: 'Tamba Kollie',
    reporterEmail: 'tamba.kollie@gmail.com',
    reason: 'scam_fee_charging',
    details: 'The poster asked me to send $25 application processing fee via mobile money before scheduling an interview.',
    status: 'pending',
    createdAt: '2026-09-04T16:30:00Z',
    updatedAt: '2026-09-04T16:30:00Z'
  },
  {
    id: 'rep-2',
    reportType: 'user',
    targetId: 'user-suspicious-99',
    targetTitleOrName: 'Anonymous Poster (user-suspicious-99)',
    reporterUserId: 'user-recruiter-1',
    reporterName: 'Korto Flomo',
    reporterEmail: 'agency@liberiaworkforce.com',
    reason: 'impersonation',
    details: 'This account is sending spam messages claiming to represent Liberia Workforce Solutions without authorization.',
    status: 'pending',
    createdAt: '2026-09-05T09:10:00Z',
    updatedAt: '2026-09-05T09:10:00Z'
  }
];

export const INITIAL_ACCOUNT_RESTRICTIONS: AccountRestriction[] = [
  {
    id: 'rest-1',
    userId: 'user-suspicious-99',
    userName: 'Anonymous Poster',
    userEmail: 'spammer@unverified.org',
    restrictionType: 'posting_disabled',
    reason: 'Quarantined due to multiple reports of charging illegal application processing fees.',
    issuedByUserId: 'user-admin-1',
    issuedByName: 'Platform Administrator',
    status: 'active',
    createdAt: '2026-09-04T17:00:00Z'
  }
];

export const INITIAL_SUSPICIOUS_EVENTS: SuspiciousActivityEvent[] = [
  {
    id: 'susp-1',
    actorUserId: 'user-suspicious-99',
    actorName: 'Anonymous Poster',
    actorEmail: 'spammer@unverified.org',
    eventType: 'keyword_trigger',
    severity: 'high',
    description: 'Automated filter caught illegal phrase "pay Western Union fee" in job post draft.',
    status: 'auto_quarantined',
    createdAt: '2026-09-04T16:00:00Z'
  },
  {
    id: 'susp-2',
    actorUserId: 'user-suspicious-99',
    actorName: 'Anonymous Poster',
    actorEmail: 'spammer@unverified.org',
    eventType: 'multiple_reports',
    severity: 'critical',
    description: 'Listing accumulated 3 user reports for fee scam within 2 hours.',
    status: 'detected',
    createdAt: '2026-09-04T16:35:00Z'
  }
];

