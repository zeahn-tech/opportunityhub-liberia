/**
 * Gemini Server-Backed AI Provider
 * OpportunityHub Liberia
 * 
 * Communicates with server-side Express endpoints powered by @google/genai (gemini-3.8-flash).
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
  SemanticSearchResponse
} from './aiTypes';
import { authService } from '../authService';

export class GeminiAIProvider implements IAIProvider {
  name = 'Gemini 3.8 Flash (Server Intelligence)';

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/health', { method: 'GET' });
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.configured;
    } catch {
      return false;
    }
  }

  async getJobRecommendations(input: JobRecommendationInput): Promise<JobRecommendationsResponse> {
    const res = await fetch('/api/ai/recommendations', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getSession()?.token || ''}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error(`Gemini Recommendations failed with status ${res.status}`);
    }
    return res.json();
  }

  async matchCandidateToJob(input: CandidateMatchInput): Promise<CandidateMatchResult> {
    const res = await fetch('/api/ai/match-candidate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getSession()?.token || ''}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error(`Gemini Candidate Match failed with status ${res.status}`);
    }
    return res.json();
  }

  async parseCV(input: CVParsingInput): Promise<ParsedCVResult> {
    const res = await fetch('/api/ai/parse-cv', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getSession()?.token || ''}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error(`Gemini CV Parsing failed with status ${res.status}`);
    }
    return res.json();
  }

  async assistJobDescription(input: JobAssistantInput): Promise<JobAssistantResult> {
    const res = await fetch('/api/ai/job-assistant', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getSession()?.token || ''}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error(`Gemini Job Assistant failed with status ${res.status}`);
    }
    return res.json();
  }

  async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResponse> {
    const res = await fetch('/api/ai/semantic-search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getSession()?.token || ''}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) {
      throw new Error(`Gemini Semantic Search failed with status ${res.status}`);
    }
    return res.json();
  }
}
