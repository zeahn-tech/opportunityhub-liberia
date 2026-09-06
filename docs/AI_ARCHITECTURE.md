# OpportunityHub AI Intelligence Layer — Architecture & Ethical Governance

## Overview

OpportunityHub's AI-ready intelligence layer is designed as an **assistive, non-discriminatory copilot** for job seekers, recruiters, employers, and platform administrators in Liberia. It accelerates talent matching and opportunity drafting while upholding strict ethical standards, data privacy, and provider portability.

---

## 1. AI Architecture & Provider Abstraction

```
                   +---------------------------------------+
                   |           React Frontend UI           |
                   | (Candidate Portal, Recruiter Studio,  |
                   |   Semantic Search, AI Copilot Hub)    |
                   +-------------------+-------------------+
                                       |
                                       v
                   +-------------------+-------------------+
                   |           AIService Facade            |
                   |      (src/services/ai/aiService.ts)   |
                   +-------------------+-------------------+
                                       |
                   +-------------------+-------------------+
                   |    Demographic Sanitization Pipeline  |
                   |   (src/services/ai/aiGuardrails.ts)   |
                   +-------------------+-------------------+
                                       |
                 +---------------------+---------------------+
                 |                                           |
                 v                                           v
  +------------------------------+            +------------------------------+
  |      GeminiAIProvider        |            |      FallbackAIProvider      |
  |  (Gemini 3.8 Flash via API)  |            |   (Heuristic Rule Engine)    |
  +--------------+---------------+            +--------------+---------------+
                 |                                           |
                 v                                           v
  +------------------------------+            +------------------------------+
  |    Express Server API        |            |   Local Client/Server Exec   |
  |    (/api/ai/* in server.ts)  |            |   (Zero external latency)    |
  +------------------------------+            +------------------------------+
```

### Key Architectural Pillars:
1. **Provider Abstraction (`IAIProvider`)**: All 5 core AI capabilities are defined as TypeScript contracts in `src/services/ai/aiTypes.ts`. Swapping providers (e.g. from Gemini to Claude or Llama) requires implementing `IAIProvider` without touching UI or business logic.
2. **Server-Side Security**: All Gemini API calls execute inside `server.ts` using `@google/genai` (`gemini-3.8-flash`). API keys remain server-side secrets and are never exposed to the client browser.
3. **Automatic Fallback Cascade**: If the Gemini API key is unconfigured or the external API times out, `AIService` seamlessly routes requests to `FallbackAIProvider`, ensuring 100% operational uptime.

---

## 2. Core AI Capabilities

1. **Job Recommendations (`getJobRecommendations`)**:
   - Calculates personalized opportunity recommendations for candidates based on technical skill overlap and county location preferences (e.g. Montserrado, Margibi, Nimba).
2. **Candidate-Job Matching Rationale (`matchCandidateToJob`)**:
   - Computes an explainable score breakdown across 4 non-sensitive dimensions: Skill Overlap, Experience Depth, County Alignment, and Education/Credentials.
3. **CV & Resume Parsing (`parseCV`)**:
   - Auto-extracts professional summary, skills, experience years, work history, education, and county location from raw CV text.
4. **Job Description Assistance (`assistJobDescription`)**:
   - Transforms raw notes into structured, high-impact job vacancies complete with responsibilities, requirements, skill tags, and tailored candidate screening questions.
5. **Semantic Opportunity Search (`semanticSearch`)**:
   - Parses unstructured natural language queries (e.g. *"Solar engineer in Margibi County with $1200+ salary"*) into structured intent chips and semantically ranks vacancies with match explanations.

---

## 3. Data Flow

1. **User Request**: User triggers an AI action (e.g., candidate match or CV parse).
2. **Sanitization**: Profile data is passed to `sanitizeCandidateProfileForAI()`, stripping demographic attributes.
3. **Provider Selection**: `AIService` checks `GeminiAIProvider.isAvailable()`.
   - **Primary Path**: Sends POST request to Express endpoint `/api/ai/*`.
   - **Fallback Path**: Computes result via `FallbackAIProvider` heuristic engine.
4. **Response Schema Enforcement**: Gemini responses are formatted using `responseSchema` with `Type.OBJECT` / `Type.ARRAY` to ensure typed JSON.
5. **Audit Logging**: Invocations are recorded in `auditLogs` with execution latency, status, and sanitization flags.

---

## 4. Privacy Considerations & Non-Discrimination

- **Sanitization Pipeline**: Candidate profiles undergo automatic demographic scrubbing. The following fields are strictly excluded or redacted before AI dispatch:
  - Gender / Sex
  - Age / Date of Birth
  - Ethnicity / Tribe
  - Religion / Faith
  - Marital Status
  - Photo URLs
  - Physical Impairments / Disability Status
- **Non-Discriminatory Ranking**: Match scores are derived exclusively from verifiable qualifications (skills, experience depth, county mobility, education).
- **Human Authority Guarantee**: The system explicitly forbids AI from making autonomous final hiring, tender awarding, or grant decisions. AI operates strictly as an assistive copilot.

---

## 5. Prompt Strategy

- **System Instruction Injection**: Every Gemini request includes `ETHICAL_SYSTEM_INSTRUCTION` enforcing assistive-only role, zero demographic bias, and Liberian county context.
- **Structured Output**: Uses `responseMimeType: "application/json"` and `responseSchema` for deterministic JSON parsing without markdown wrapping or regex scraping.

---

## 6. Failure Handling & Reliability

- **Graceful Fallbacks**: Any network error, rate limit (HTTP 429), or server error (HTTP 500) automatically triggers `FallbackAIProvider`.
- **Zero UI Crashes**: UI components handle empty or partial AI responses with clear fallback indicators and re-try options.

---

## 7. Cost Controls & Token Optimization

- **Model Selection**: Uses `gemini-3.8-flash` for high performance at optimal token costs.
- **Trimming Input Text**: Large candidate CVs and long descriptions are capped to 2,000 characters before sending to API routes.
- **Entitlement Checks**: AI features require `canUseAI` entitlement provided by Pro / Enterprise organization subscriptions via `subscriptionService`.

---

## 8. Logging & Ethical Audit Policy

- **In-Memory Audit Trail**: Every AI operation logs an `AIAuditLogEntry` containing:
  - Timestamp
  - Action category
  - Provider used
  - Status (`success` vs `fallback_used`)
  - Execution time in milliseconds
  - Candidate sanitization confirmation flag
- **Audit Dashboard**: Accessible via the **AI Copilot** tab (`AiStudioHub`) for platform transparency and governance inspection.
