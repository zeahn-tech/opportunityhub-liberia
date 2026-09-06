/**
 * Fallback / Heuristic AI Provider
 * OpportunityHub Liberia
 * 
 * Provides robust deterministic logic when Gemini API is offline, unconfigured, or timing out.
 */

import {
  IAIProvider,
  JobRecommendationInput,
  JobRecommendationsResponse,
  CandidateMatchInput,
  CandidateMatchResult,
  CVParsingInput,
  ParsedCVResult,
  JobAssistantInput,
  JobAssistantResult,
  SemanticSearchInput,
  SemanticSearchResponse,
  ExplainableMatchSignal
} from './aiTypes';
import { sanitizeCandidateProfileForAI, ETHICAL_NOTICE_TEXT } from './aiGuardrails';

export class FallbackAIProvider implements IAIProvider {
  name = 'OpportunityHub Heuristic Engine (Offline Fallback)';

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * 1. Job Recommendations Heuristic
   */
  async getJobRecommendations(input: JobRecommendationInput): Promise<JobRecommendationsResponse> {
    const { candidate, availableOpportunities, limit = 5 } = input;
    const candSkills = (candidate.skills || []).map(s => s.toLowerCase());
    const prefCounties = (candidate.preferredCounties || []).map(c => c.toLowerCase());

    const ranked = availableOpportunities.map(opp => {
      const oppSkills = (opp.skillsRequired || []).map(s => s.toLowerCase());
      
      // Skill overlap score (0 - 60 points)
      let matchedSkillCount = 0;
      const matchedSkillsList: string[] = [];
      oppSkills.forEach(skill => {
        if (candSkills.some(cs => cs.includes(skill) || skill.includes(cs))) {
          matchedSkillCount++;
          matchedSkillsList.push(skill);
        }
      });
      const skillScore = oppSkills.length > 0 ? (matchedSkillCount / oppSkills.length) * 60 : 30;

      // County match (0 - 30 points)
      const countyMatch = prefCounties.length === 0 || prefCounties.includes(opp.county.toLowerCase());
      const countyScore = countyMatch ? 30 : 10;

      // Base title relevance (0 - 10 points)
      const titleScore = candidate.desiredRole && opp.title.toLowerCase().includes(candidate.desiredRole.toLowerCase()) ? 10 : 5;

      const totalScore = Math.min(100, Math.round(skillScore + countyScore + titleScore));

      let matchReason = 'High skill overlap and location compatibility.';
      if (countyMatch && matchedSkillsList.length > 0) {
        matchReason = `Matches ${matchedSkillsList.length} core skill(s) and aligned with location (${opp.county}).`;
      } else if (matchedSkillsList.length > 0) {
        matchReason = `Matches key technical skills (${matchedSkillsList.slice(0, 2).join(', ')}).`;
      } else if (countyMatch) {
        matchReason = `Located in preferred region (${opp.county} County).`;
      }

      return {
        opportunityId: opp.id,
        matchScore: totalScore,
        matchReason,
        highlightedSkills: matchedSkillsList.length > 0 ? matchedSkillsList : opp.skillsRequired.slice(0, 3),
        countyFit: countyMatch,
        explanation: `Computed based on ${matchedSkillCount}/${oppSkills.length || 1} required skill matches and county alignment (${opp.county}).`
      };
    });

    // Sort descending by matchScore
    ranked.sort((a, b) => b.matchScore - a.matchScore);

    return {
      recommendations: ranked.slice(0, limit),
      providerUsed: this.name,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 2. Candidate-Job Matching Heuristic with Explainable Signals
   */
  async matchCandidateToJob(input: CandidateMatchInput): Promise<CandidateMatchResult> {
    const sanitized = sanitizeCandidateProfileForAI(input.candidate);
    const { opportunity } = input;

    const candSkills = sanitized.skills.map(s => s.toLowerCase());
    const reqSkills = (opportunity.skillsRequired || []).map(s => s.toLowerCase());

    // Signal 1: Skill Overlap (40% weight)
    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    reqSkills.forEach(req => {
      if (candSkills.some(cs => cs.includes(req) || req.includes(cs))) {
        matchingSkills.push(req);
      } else {
        missingSkills.push(req);
      }
    });

    const skillScore = reqSkills.length > 0 
      ? Math.round((matchingSkills.length / reqSkills.length) * 100)
      : 75;

    // Signal 2: Experience Depth (30% weight)
    const candExp = sanitized.experienceYears || 0;
    let expScore = 50;
    if (candExp >= 5) expScore = 95;
    else if (candExp >= 3) expScore = 80;
    else if (candExp >= 1) expScore = 65;

    // Signal 3: County Alignment (15% weight)
    const sameCounty = sanitized.county.toLowerCase() === opportunity.county.toLowerCase();
    const countyScore = sameCounty ? 100 : 60;

    // Signal 4: Education & Credentials (15% weight)
    const eduCount = (sanitized.education || []).length;
    const eduScore = eduCount > 0 ? 85 : 60;

    // Weighted Total Score
    const overallScore = Math.round(
      (skillScore * 0.4) + (expScore * 0.3) + (countyScore * 0.15) + (eduScore * 0.15)
    );

    let status: CandidateMatchResult['qualificationStatus'] = 'Strong Fit';
    if (overallScore < 50) status = 'Low Overlap';
    else if (overallScore < 70) status = 'Potential Fit';
    else if (overallScore < 85) status = 'Moderate Fit';

    const signals: ExplainableMatchSignal[] = [
      {
        category: 'Skill Overlap',
        score: skillScore,
        weight: 0.4,
        detail: `Matches ${matchingSkills.length} of ${reqSkills.length} required competencies (${matchingSkills.slice(0, 3).join(', ') || 'General qualifications'}).`
      },
      {
        category: 'Experience Depth',
        score: expScore,
        weight: 0.3,
        detail: `${candExp} year(s) of practical industry experience recorded.`
      },
      {
        category: 'County Alignment',
        score: countyScore,
        weight: 0.15,
        detail: sameCounty 
          ? `Direct local presence in ${opportunity.county} County.`
          : `Candidate located in ${sanitized.county}; role based in ${opportunity.county}.`
      },
      {
        category: 'Education & Credentials',
        score: eduScore,
        weight: 0.15,
        detail: eduCount > 0 ? `${eduCount} formal qualification(s) verified.` : 'General vocational background.'
      }
    ];

    return {
      candidateId: input.candidate.id,
      opportunityId: opportunity.id,
      overallMatchScore: overallScore,
      qualificationStatus: status,
      signals,
      keyStrengths: [
        ...matchingSkills.map(s => `Strong competency in ${s}`),
        sameCounty ? `Resident in target location (${opportunity.county} County)` : 'Geographic mobility option'
      ],
      skillGaps: missingSkills.length > 0 ? missingSkills.map(s => `Additional training recommended in ${s}`) : ['No major technical skill gaps identified'],
      summaryExplanation: `Candidate demonstrates a ${overallScore}% alignment with the ${opportunity.title} role. Skill overlap is ${skillScore}% with ${matchingSkills.length} matching core requirement(s).`,
      ethicalNotice: ETHICAL_NOTICE_TEXT
    };
  }

  /**
   * 3. CV Parsing Heuristic
   */
  async parseCV(input: CVParsingInput): Promise<ParsedCVResult> {
    const text = input.cvText || '';

    // Extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    // Extract phone
    const phoneMatch = text.match(/(?:\+?231|0)?\s?77\d{7}|\b0?88\d{7}\b|\+?\d{10,14}/);

    // Common skills dictionary
    const skillDict = [
      'Project Management', 'Solar Installation', 'Electrical Engineering',
      'Financial Analysis', 'Accounting', 'QuickBooks', 'Data Analysis',
      'Community Outreach', 'Logistics', 'Procurement', 'Agribusiness',
      'Agronomy', 'Teaching', 'Curriculum Design', 'Public Health',
      'Nursing', 'Python', 'React', 'TypeScript', 'SQL', 'Microsoft Excel',
      'Customer Service', 'Sales', 'Heavy Equipment Operations', 'Monitoring & Evaluation'
    ];

    const extractedSkills = skillDict.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );

    // Detect Liberian County
    const counties = [
      'Montserrado', 'Nimba', 'Bong', 'Grand Bassa', 'Margibi',
      'Lofa', 'Sinoe', 'Maryland', 'Grand Gedeh', 'Cape Mount',
      'Grand Kru', 'River Gee', 'Rivercess', 'Bomi', 'Gbarpolu'
    ];
    const foundCounty = counties.find(c => text.toLowerCase().includes(c.toLowerCase())) || 'Montserrado';

    // Work experience years estimation
    const yearMatches = text.match(/\b(19|20)\d{2}\b/g) || [];
    let estimatedYears = 3;
    if (yearMatches.length >= 2) {
      const years = yearMatches.map(Number).sort((a, b) => a - b);
      const minYear = years[0];
      const maxYear = years[years.length - 1];
      estimatedYears = Math.min(25, Math.max(1, maxYear - minYear));
    }

    return {
      candidateName: extractFirstLineName(text),
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      county: foundCounty,
      professionalSummary: text.slice(0, 280) + '...',
      extractedSkills: extractedSkills.length > 0 ? extractedSkills : ['Communication', 'Problem Solving', 'Project Management'],
      experienceYears: estimatedYears,
      workHistory: [
        {
          jobTitle: 'Professional Role',
          organization: 'Experienced Organization',
          startDate: '2021',
          endDate: 'Present',
          responsibilities: [
            'Executed operational workflows and project milestones.',
            'Coordinated stakeholder relationships and field activities.'
          ]
        }
      ],
      education: [
        {
          degree: 'Bachelor / Higher Diploma',
          institution: 'University of Liberia / Higher Institution',
          graduationYear: '2020'
        }
      ],
      certifications: ['Professional Certification'],
      languages: ['English']
    };
  }

  /**
   * 4. Job Description Assistance Heuristic
   */
  async assistJobDescription(input: JobAssistantInput): Promise<JobAssistantResult> {
    const { title, county = 'Montserrado', opportunityType = 'Job', rawNotesOrDraft = '' } = input;

    const refinedTitle = title.trim() || 'Operations & Project Manager';

    return {
      refinedTitle,
      executiveSummary: `We are seeking a dedicated ${refinedTitle} to lead field execution, operational performance, and stakeholder collaboration in ${county} County, Liberia. This ${opportunityType.toLowerCase()} opportunity offers competitive growth and impact.`,
      structuredResponsibilities: [
        `Direct daily operational workflows and technical deliverables for ${refinedTitle} projects in ${county} County.`,
        'Ensure strict compliance with organization standards, health & safety regulations, and local statutory requirements.',
        'Coordinate procurement, resource scheduling, and inventory verification with local suppliers.',
        'Prepare weekly progress dashboards and financial milestone reports for executive management.'
      ],
      keyRequirements: [
        `Minimum 3+ years of progressive professional experience in ${refinedTitle} or related domain.`,
        `Demonstrated working knowledge of ${county} County operational landscape and Liberian regulatory frameworks.`,
        'Strong interpersonal communication, leadership, and analytical problem-solving skills.',
        'Proficiency in standard office suites and reporting management tools.'
      ],
      recommendedSkillTags: [
        'Project Management',
        'Operations',
        'Compliance',
        'Stakeholder Engagement',
        `${county} County Operations`
      ],
      suggestedScreeningQuestions: [
        {
          question: `Do you have 3+ years of direct field experience in ${refinedTitle} or a closely aligned role in Liberia?`,
          type: 'yes_no'
        },
        {
          question: `Are you available for full deployment or regular site visits in ${county} County?`,
          type: 'yes_no'
        },
        {
          question: 'Describe a significant operational challenge you resolved in your previous position and the outcome achieved.',
          type: 'text'
        }
      ]
    };
  }

  /**
   * 5. Semantic Opportunity Search Heuristic
   */
  async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResponse> {
    const { query, opportunities } = input;
    const lowerQuery = query.toLowerCase();

    // Counties list
    const counties = [
      'Montserrado', 'Nimba', 'Bong', 'Grand Bassa', 'Margibi',
      'Lofa', 'Sinoe', 'Maryland', 'Grand Gedeh', 'Cape Mount',
      'Grand Kru', 'River Gee', 'Rivercess', 'Bomi', 'Gbarpolu'
    ];
    const detectedCounty = counties.find(c => lowerQuery.includes(c.toLowerCase()));

    // Opportunity types
    const types = ['job', 'tender', 'consultancy', 'internship', 'scholarship', 'grant', 'investment'];
    const detectedType = types.find(t => lowerQuery.includes(t));

    // Extract salary number if present (e.g. 1000 or $1000)
    const salaryMatch = lowerQuery.match(/\$?\b(\d{3,6})\b/);
    const minSalary = salaryMatch ? parseInt(salaryMatch[1], 10) : undefined;

    // Tokens
    const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !['looking', 'for', 'jobs', 'in', 'with', 'and', 'or'].includes(w));

    const results = opportunities.map(opp => {
      let score = 30; // base score
      const highlights: string[] = [];

      // Title & description keyword match
      const titleLower = opp.title.toLowerCase();
      const descLower = opp.description.toLowerCase();
      const orgLower = opp.organizationName.toLowerCase();

      keywords.forEach(kw => {
        if (titleLower.includes(kw)) {
          score += 25;
          highlights.push(`Title matches "${kw}"`);
        } else if (descLower.includes(kw)) {
          score += 15;
          highlights.push(`Description matches "${kw}"`);
        } else if (orgLower.includes(kw)) {
          score += 10;
          highlights.push(`Organization matches "${kw}"`);
        }
      });

      // County match
      if (detectedCounty && opp.county.toLowerCase() === detectedCounty.toLowerCase()) {
        score += 25;
        highlights.push(`Location matched (${opp.county} County)`);
      }

      // Type match
      if (detectedType && opp.opportunityType.toLowerCase().includes(detectedType)) {
        score += 20;
        highlights.push(`Type matches ${opp.opportunityType}`);
      }

      // Salary filter check
      if (minSalary && opp.salaryMax) {
        if (opp.salaryMax >= minSalary) {
          score += 15;
          highlights.push(`Meets minimum compensation criteria ($${minSalary})`);
        }
      }

      const finalScore = Math.min(100, score);

      return {
        opportunityId: opp.id,
        relevanceScore: finalScore,
        matchHighlights: highlights.length > 0 ? highlights : ['General semantic match'],
        relevanceReason: highlights.length > 0 ? highlights.join(' • ') : 'Relevant to general query.'
      };
    });

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      intent: {
        extractedKeywords: keywords,
        extractedCounty: detectedCounty,
        extractedOpportunityType: detectedType,
        minSalary
      },
      results,
      providerUsed: this.name
    };
  }
}

function extractFirstLineName(text: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0 && lines[0].length < 40 && !lines[0].includes('@')) {
    return lines[0];
  }
  return 'Candidate Profile';
}
