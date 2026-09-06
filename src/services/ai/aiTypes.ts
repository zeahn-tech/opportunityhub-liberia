/**
 * AI Service Layer Types & Contracts
 * OpportunityHub Liberia
 */

// 1. Job Recommendation Types
export interface JobRecommendationInput {
  candidate: {
    id: string;
    skills: string[];
    preferredCounties?: string[];
    experienceYears?: number;
    desiredRole?: string;
    educationLevel?: string;
  };
  availableOpportunities: Array<{
    id: string;
    title: string;
    organizationName: string;
    county: string;
    opportunityType: string;
    skillsRequired: string[];
    description: string;
    salaryMin?: number;
    salaryMax?: number;
  }>;
  limit?: number;
}

export interface RecommendedJobResult {
  opportunityId: string;
  matchScore: number; // 0 - 100
  matchReason: string;
  highlightedSkills: string[];
  countyFit: boolean;
  explanation: string;
}

export interface JobRecommendationsResponse {
  recommendations: RecommendedJobResult[];
  providerUsed: string;
  timestamp: string;
}

// 2. Candidate-Job Matching Types
export interface CandidateMatchInput {
  candidate: {
    id: string;
    name?: string;
    skills: string[];
    county: string;
    experienceYears?: number;
    summary?: string;
    workHistory?: Array<{ title: string; company: string; duration: string; description: string }>;
    education?: Array<{ degree: string; institution: string; year: string }>;
  };
  opportunity: {
    id: string;
    title: string;
    organizationName: string;
    county: string;
    opportunityType: string;
    skillsRequired: string[];
    description: string;
    requirements?: string[];
  };
}

export interface ExplainableMatchSignal {
  category: 'Skill Overlap' | 'Experience Depth' | 'County Alignment' | 'Education & Credentials';
  score: number; // 0 - 100
  weight: number; // 0.0 - 1.0
  detail: string;
}

export interface CandidateMatchResult {
  candidateId: string;
  opportunityId: string;
  overallMatchScore: number; // 0 - 100
  qualificationStatus: 'Strong Fit' | 'Moderate Fit' | 'Potential Fit' | 'Low Overlap';
  signals: ExplainableMatchSignal[];
  keyStrengths: string[];
  skillGaps: string[];
  summaryExplanation: string;
  ethicalNotice: string;
}

// 3. CV Parsing Types
export interface CVParsingInput {
  cvText: string;
  fileName?: string;
}

export interface ParsedCVResult {
  candidateName?: string;
  email?: string;
  phone?: string;
  county?: string;
  cityDistrict?: string;
  professionalSummary: string;
  extractedSkills: string[];
  experienceYears: number;
  workHistory: Array<{
    jobTitle: string;
    organization: string;
    startDate?: string;
    endDate?: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear?: string;
    fieldOfStudy?: string;
  }>;
  certifications?: string[];
  languages?: string[];
}

// 4. Job Description Assistance Types
export interface JobAssistantInput {
  title: string;
  organizationName?: string;
  county?: string;
  opportunityType?: string;
  rawNotesOrDraft?: string;
  targetSkills?: string[];
  salaryRange?: string;
}

export interface JobAssistantResult {
  refinedTitle: string;
  executiveSummary: string;
  structuredResponsibilities: string[];
  keyRequirements: string[];
  recommendedSkillTags: string[];
  suggestedScreeningQuestions: Array<{
    question: string;
    type: 'text' | 'yes_no' | 'multiple_choice';
    options?: string[];
  }>;
}

// 5. Semantic Search Types
export interface SemanticSearchInput {
  query: string;
  opportunities: Array<{
    id: string;
    title: string;
    organizationName: string;
    county: string;
    opportunityType: string;
    skillsRequired: string[];
    description: string;
    salaryMin?: number;
    salaryMax?: number;
  }>;
}

export interface ParsedSearchIntent {
  extractedKeywords: string[];
  extractedCounty?: string;
  extractedOpportunityType?: string;
  minSalary?: number;
  perceivedRole?: string;
}

export interface SemanticSearchResultItem {
  opportunityId: string;
  relevanceScore: number; // 0 - 100
  matchHighlights: string[];
  relevanceReason: string;
}

export interface SemanticSearchResponse {
  intent: ParsedSearchIntent;
  results: SemanticSearchResultItem[];
  providerUsed: string;
}

// AI Provider Interface Strategy
export interface IAIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getJobRecommendations(input: JobRecommendationInput): Promise<JobRecommendationsResponse>;
  matchCandidateToJob(input: CandidateMatchInput): Promise<CandidateMatchResult>;
  parseCV(input: CVParsingInput): Promise<ParsedCVResult>;
  assistJobDescription(input: JobAssistantInput): Promise<JobAssistantResult>;
  semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResponse>;
}
