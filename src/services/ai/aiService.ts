/**
 * AI Service Manager & Facade
 * OpportunityHub Liberia
 * 
 * Orchestrates AI providers, sanitization guardrails, and seamless fallback cascades.
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
import { GeminiAIProvider } from './geminiAIProvider';
import { FallbackAIProvider } from './fallbackAIProvider';
import { sanitizeCandidateProfileForAI } from './aiGuardrails';

export interface AIAuditLogEntry {
  id: string;
  timestamp: string;
  action: 'recommendations' | 'candidate_match' | 'cv_parse' | 'job_assistant' | 'semantic_search';
  providerUsed: string;
  status: 'success' | 'fallback_used' | 'error';
  executionTimeMs: number;
  candidateSanitized: boolean;
}

class AIServiceFacade {
  private geminiProvider: GeminiAIProvider;
  private fallbackProvider: FallbackAIProvider;
  private auditLogs: AIAuditLogEntry[] = [];

  constructor() {
    this.geminiProvider = new GeminiAIProvider();
    this.fallbackProvider = new FallbackAIProvider();
  }

  private logAudit(
    action: AIAuditLogEntry['action'],
    providerUsed: string,
    status: AIAuditLogEntry['status'],
    executionTimeMs: number,
    candidateSanitized = true
  ) {
    const entry: AIAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      providerUsed,
      status,
      executionTimeMs,
      candidateSanitized
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 50) this.auditLogs.pop(); // Keep last 50
  }

  public getAuditLogs(): AIAuditLogEntry[] {
    return [...this.auditLogs];
  }

  public async getActiveProvider(): Promise<IAIProvider> {
    const isGeminiAvailable = await this.geminiProvider.isAvailable();
    return isGeminiAvailable ? this.geminiProvider : this.fallbackProvider;
  }

  /**
   * 1. Get Job Recommendations
   */
  async getJobRecommendations(input: JobRecommendationInput): Promise<JobRecommendationsResponse> {
    const startTime = Date.now();
    try {
      if (await this.geminiProvider.isAvailable()) {
        const result = await this.geminiProvider.getJobRecommendations(input);
        this.logAudit('recommendations', result.providerUsed, 'success', Date.now() - startTime);
        return result;
      }
    } catch (err) {
      console.warn('Gemini AI failed, using Heuristic Fallback for recommendations:', err);
    }

    const fallbackResult = await this.fallbackProvider.getJobRecommendations(input);
    this.logAudit('recommendations', fallbackResult.providerUsed, 'fallback_used', Date.now() - startTime);
    return fallbackResult;
  }

  /**
   * 2. Candidate-Job Matching (with Sanitization Guardrails)
   */
  async matchCandidateToJob(input: CandidateMatchInput): Promise<CandidateMatchResult> {
    const startTime = Date.now();
    // Enforce Sanitization on Candidate Profile
    const sanitizedCandidate = sanitizeCandidateProfileForAI(input.candidate);
    const sanitizedInput: CandidateMatchInput = {
      ...input,
      candidate: sanitizedCandidate as any
    };

    try {
      if (await this.geminiProvider.isAvailable()) {
        const result = await this.geminiProvider.matchCandidateToJob(sanitizedInput);
        this.logAudit('candidate_match', 'Gemini 3.8 Flash', 'success', Date.now() - startTime, true);
        return result;
      }
    } catch (err) {
      console.warn('Gemini AI failed, using Heuristic Fallback for candidate match:', err);
    }

    const fallbackResult = await this.fallbackProvider.matchCandidateToJob(sanitizedInput);
    this.logAudit('candidate_match', fallbackResult.ethicalNotice ? 'Heuristic Match Engine' : 'Fallback', 'fallback_used', Date.now() - startTime, true);
    return fallbackResult;
  }

  /**
   * 3. CV Parsing
   */
  async parseCV(input: CVParsingInput): Promise<ParsedCVResult> {
    const startTime = Date.now();
    try {
      if (await this.geminiProvider.isAvailable()) {
        const result = await this.geminiProvider.parseCV(input);
        this.logAudit('cv_parse', 'Gemini 3.8 Flash', 'success', Date.now() - startTime);
        return result;
      }
    } catch (err) {
      console.warn('Gemini AI failed, using Fallback CV Parser:', err);
    }

    const fallbackResult = await this.fallbackProvider.parseCV(input);
    this.logAudit('cv_parse', this.fallbackProvider.name, 'fallback_used', Date.now() - startTime);
    return fallbackResult;
  }

  /**
   * 4. Job Description Assistance
   */
  async assistJobDescription(input: JobAssistantInput): Promise<JobAssistantResult> {
    const startTime = Date.now();
    try {
      if (await this.geminiProvider.isAvailable()) {
        const result = await this.geminiProvider.assistJobDescription(input);
        this.logAudit('job_assistant', 'Gemini 3.8 Flash', 'success', Date.now() - startTime);
        return result;
      }
    } catch (err) {
      console.warn('Gemini AI failed, using Fallback Job Assistant:', err);
    }

    const fallbackResult = await this.fallbackProvider.assistJobDescription(input);
    this.logAudit('job_assistant', this.fallbackProvider.name, 'fallback_used', Date.now() - startTime);
    return fallbackResult;
  }

  /**
   * 5. Semantic Search
   */
  async semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResponse> {
    const startTime = Date.now();
    try {
      if (await this.geminiProvider.isAvailable()) {
        const result = await this.geminiProvider.semanticSearch(input);
        this.logAudit('semantic_search', result.providerUsed, 'success', Date.now() - startTime);
        return result;
      }
    } catch (err) {
      console.warn('Gemini AI failed, using Fallback Semantic Search:', err);
    }

    const fallbackResult = await this.fallbackProvider.semanticSearch(input);
    this.logAudit('semantic_search', fallbackResult.providerUsed, 'fallback_used', Date.now() - startTime);
    return fallbackResult;
  }
}

export const aiService = new AIServiceFacade();
