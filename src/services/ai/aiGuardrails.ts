/**
 * Ethical AI Guardrails & Non-Discrimination Pipeline
 * OpportunityHub Liberia
 */

import { CandidateMatchInput } from './aiTypes';

export interface SanitizedCandidateProfile {
  id: string;
  skills: string[];
  county: string;
  experienceYears?: number;
  summary?: string;
  workHistory?: Array<{ title: string; company: string; duration: string; description: string }>;
  education?: Array<{ degree: string; institution: string; year: string }>;
  // Protected attributes explicitly removed
}

/**
 * Strips protected and sensitive attributes from candidate profile before AI invocation.
 * Enforces non-discriminatory score computation based strictly on job-related qualifications.
 */
export function sanitizeCandidateProfileForAI(inputCandidate: CandidateMatchInput['candidate']): SanitizedCandidateProfile {
  // Extract strictly non-sensitive attributes
  const { id, skills, county, experienceYears, summary, workHistory, education } = inputCandidate;

  // Sanitize work history descriptions to remove potential demographic noise
  const sanitizedWorkHistory = workHistory?.map(wh => ({
    title: wh.title,
    company: wh.company,
    duration: wh.duration,
    description: stripSensitiveKeywords(wh.description || '')
  }));

  // Sanitize summary
  const sanitizedSummary = summary ? stripSensitiveKeywords(summary) : undefined;

  return {
    id,
    skills: skills || [],
    county: county || 'Unspecified',
    experienceYears: typeof experienceYears === 'number' ? experienceYears : 0,
    summary: sanitizedSummary,
    workHistory: sanitizedSanitizedWorkHistory(sanitizedWorkHistory),
    education: education || []
  };
}

function sanitizedSanitizedWorkHistory(wh: any[] | undefined) {
  if (!wh) return [];
  return wh;
}

/**
 * Removes demographic and sensitive keywords from free-form text blocks
 */
export function stripSensitiveKeywords(text: string): string {
  if (!text) return '';

  // Patterns for age, gender, marital status, religion, ethnicity
  const sensitivePatterns = [
    /\b(male|female|woman|man|boy|girl|gender|transgender|non-binary)\b/gi,
    /\b(married|single|divorced|widowed|marital status|spouse|husband|wife)\b/gi,
    /\b(christian|muslim|islam|catholic|pentecostal|baptist|religion|religious|faith)\b/gi,
    /\b(krahn|gio|mano|kpelle|bassa|grebo|lorma|vai|mandingo|kissi|gola|kru|tribe|ethnic group|ethnicity)\b/gi,
    /\b(born in \d{4}|\d{2} years old|age \d{2}|date of birth|dob)\b/gi,
    /\b(pregnant|disability|disabled|handicapped|physical impairment)\b/gi
  ];

  let cleaned = text;
  sensitivePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '[Redacted Qualification-Irrelevant Attribute]');
  });

  return cleaned;
}

/**
 * Injected System Prompt for Ethical & Assistive AI Operations
 */
export const ETHICAL_SYSTEM_INSTRUCTION = `
You are the Ethical AI Copilot for OpportunityHub Liberia.
Your primary duty is to act as an objective, non-discriminatory decision-support system.

STRICT MANDATES:
1. ASSISTIVE ROLE ONLY: You provide analysis, recommendations, and drafting help. You DO NOT make final hiring, tender awarding, or grant decisions. Humans retain 100% final authority.
2. ZERO DISCRIMINATION: You must NEVER evaluate, rank, or filter candidates based on gender, age, ethnicity, tribe, religion, marital status, physical appearance, or county of origin.
3. OBJECTIVE MERIT-BASED MATCHING: Evaluate candidates strictly on verifiable competencies, relevant skill overlaps, experience depth, education/certifications, and county location preferences.
4. EXPLAINABILITY: Always provide clear, transparent rationale and breakdown for match scores and recommendations so human hiring managers can verify your reasoning.
5. LIBERIA CONTEXT: Respect Liberian county geography (15 counties), local currency (USD / LRD), and local economic dynamics.
`;

/**
 * Ethical Notice appended to all AI Candidate Evaluations
 */
export const ETHICAL_NOTICE_TEXT = 
  "OpportunityHub Ethical AI Guarantee: This score is generated strictly from objective skill overlap, experience level, and geographic fit. Protected attributes (gender, age, ethnicity, religion, marital status) are sanitized and excluded from evaluation. Final hiring decisions are strictly performed by human hiring managers.";
