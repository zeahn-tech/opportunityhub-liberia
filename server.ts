import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { db } from './src/db/dbClient.js';

dotenv.config();

const __dirname = path.resolve();

// Lazy Gemini client helper
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

const SYSTEM_PROMPT = `You are the Ethical AI Copilot for OpportunityHub Liberia.
You are an objective, non-discriminatory decision-support system.
1. ASSISTIVE ROLE ONLY: Provide analysis, recommendations, and drafting help. Do NOT make final hiring decisions.
2. ZERO DISCRIMINATION: NEVER evaluate, rank, or filter candidates based on gender, age, ethnicity, tribe, religion, marital status, or county of origin.
3. OBJECTIVE MERIT-BASED MATCHING: Evaluate candidates strictly on verifiable competencies, skill overlaps, experience depth, education/certifications, and county location preferences.
4. LIBERIA CONTEXT: Respect Liberian county geography (15 counties) and local economic dynamics.`;

// Recursive input sanitization helper to block XSS and HTML/Javascript injections
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '') // Strip out scripts
      .replace(/<\/?\s*(iframe|object|embed|style|meta|link)[^>]*>/gi, '') // Strip out risky elements
      .replace(/javascript:/gi, '[REDACTED]') // Neutralize javascript: URI schemes
      .replace(/on\w+\s*=/gi, '[REDACTED]'); // Neutralize onload, onerror, onclick, etc.
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (typeof val === 'object' && val !== null) {
    const sanitized: any = {};
    for (const key of Object.keys(val)) {
      sanitized[key] = sanitizeValue(val[key]);
    }
    return sanitized;
  }
  return val;
}

function sanitizeInput(req: any, res: any, next: any) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  next();
}

// Session Validation Middleware using the relational DB client
function authenticateSession(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication is required. Missing token.' });
    }
    const token = authHeader.split(' ')[1];
    const { user, session } = db.validateSession(token);
    req.user = user;
    req.session = session;
    next();
  } catch (error: any) {
    console.error('API Auth Error:', error.message);
    res.status(401).json({ error: error.message || 'Invalid or expired session' });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Disable identification headers
  app.disable('x-powered-by');

  // 2. HTTP Header hardening
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled only to ensure full compatibility with the development/preview iframe
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
  }));

  // 3. Sliding-window rate limit to prevent API abuse, spam, and DoS attacks
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Max 150 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' }
  });
  app.use('/api/', apiLimiter);

  // Stripe requires the raw body for webhook signature verification
  app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('Stripe is not configured.');
      return res.status(400).send('Stripe not configured');
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let event;

    try {
      if (endpointSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
      } else {
        // Without a webhook secret, we just decode the event (not recommended for production)
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Payment successful for organization:', session.client_reference_id);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated/deleted:', subscription.id);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  app.use(express.json({ limit: '2mb' }));
  app.use(sanitizeInput);

  // --- AI SERVER ENDPOINTS ---

  // AI Health Check
  app.get('/api/ai/health', (req, res) => {
    const ai = getGeminiClient();
    res.json({
      configured: !!ai,
      model: 'gemini-3.8-flash',
      status: ai ? 'online' : 'unconfigured_fallback_active',
    });
  });

  // 1. AI Job Recommendations Endpoint
  app.post('/api/ai/recommendations', authenticateSession, async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured on server' });
    }

    try {
      const { candidate, availableOpportunities, limit = 5 } = req.body;

      const prompt = `Based on the following candidate profile and list of available opportunities in Liberia, calculate personalized job recommendations.

Candidate Profile:
${JSON.stringify(candidate, null, 2)}

Available Opportunities:
${JSON.stringify(availableOpportunities, null, 2)}

Return a top-${limit} list ranked by match score (0-100). Explain the match reason based purely on skill overlap and county fit. Do not use protected attributes.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    opportunityId: { type: Type.STRING },
                    matchScore: { type: Type.NUMBER },
                    matchReason: { type: Type.STRING },
                    highlightedSkills: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    countyFit: { type: Type.BOOLEAN },
                    explanation: { type: Type.STRING },
                  },
                  required: ['opportunityId', 'matchScore', 'matchReason', 'highlightedSkills', 'countyFit', 'explanation'],
                },
              },
            },
            required: ['recommendations'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        recommendations: parsed.recommendations || [],
        providerUsed: 'Gemini 3.8 Flash',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error in /api/ai/recommendations:', error);
      res.status(500).json({ error: 'Internal Server Error. Please contact security support.' });
    }
  });

  // 2. AI Candidate-Job Match Endpoint
  app.post('/api/ai/match-candidate', authenticateSession, async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured on server' });
    }

    try {
      const { candidate, opportunity } = req.body;

      const prompt = `Evaluate the candidate alignment with the target opportunity.

Candidate Profile (Sanitized):
${JSON.stringify(candidate, null, 2)}

Target Opportunity:
${JSON.stringify(opportunity, null, 2)}

Provide an explainable match breakdown across 4 non-sensitive categories: Skill Overlap, Experience Depth, County Alignment, and Education & Credentials. Include key strengths, skill gaps, and a overall score (0-100).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              candidateId: { type: Type.STRING },
              opportunityId: { type: Type.STRING },
              overallMatchScore: { type: Type.NUMBER },
              qualificationStatus: { type: Type.STRING },
              signals: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    weight: { type: Type.NUMBER },
                    detail: { type: Type.STRING },
                  },
                  required: ['category', 'score', 'weight', 'detail'],
                },
              },
              keyStrengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              skillGaps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              summaryExplanation: { type: Type.STRING },
              ethicalNotice: { type: Type.STRING },
            },
            required: ['overallMatchScore', 'qualificationStatus', 'signals', 'keyStrengths', 'skillGaps', 'summaryExplanation', 'ethicalNotice'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        candidateId: candidate?.id || 'cand-id',
        opportunityId: opportunity?.id || 'opp-id',
        ...parsed,
      });
    } catch (error: any) {
      console.error('Error in /api/ai/match-candidate:', error);
      res.status(500).json({ error: 'Internal Server Error. Please contact security support.' });
    }
  });

  // 3. AI CV Parsing Endpoint
  app.post('/api/ai/parse-cv', authenticateSession, async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured on server' });
    }

    try {
      const { cvText } = req.body;

      const prompt = `Parse the following raw CV/resume text into a structured profile object:
${cvText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              candidateName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              county: { type: Type.STRING },
              cityDistrict: { type: Type.STRING },
              professionalSummary: { type: Type.STRING },
              extractedSkills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              experienceYears: { type: Type.NUMBER },
              workHistory: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    jobTitle: { type: Type.STRING },
                    organization: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    responsibilities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    degree: { type: Type.STRING },
                    institution: { type: Type.STRING },
                    graduationYear: { type: Type.STRING },
                  },
                },
              },
              certifications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              languages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['professionalSummary', 'extractedSkills', 'experienceYears', 'workHistory', 'education'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/parse-cv:', error);
      res.status(500).json({ error: 'Internal Server Error. Please contact security support.' });
    }
  });

  // 4. AI Job Description Assistant Endpoint
  app.post('/api/ai/job-assistant', authenticateSession, async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured on server' });
    }

    try {
      const { title, county = 'Montserrado', opportunityType = 'Job', rawNotesOrDraft = '' } = req.body;

      const prompt = `Refine and generate a comprehensive job description based on these parameters:
Title: ${title}
County: ${county}
Type: ${opportunityType}
Notes/Draft: ${rawNotesOrDraft}

Return a refined title, executive summary, structured responsibilities, key requirements, recommended skill tags, and 3 candidate screening questions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              refinedTitle: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              structuredResponsibilities: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              keyRequirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedSkillTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedScreeningQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    type: { type: Type.STRING },
                  },
                  required: ['question', 'type'],
                },
              },
            },
            required: ['refinedTitle', 'executiveSummary', 'structuredResponsibilities', 'keyRequirements', 'recommendedSkillTags', 'suggestedScreeningQuestions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error('Error in /api/ai/job-assistant:', error);
      res.status(500).json({ error: 'Internal Server Error. Please contact security support.' });
    }
  });

  // 5. AI Semantic Opportunity Search Endpoint
  app.post('/api/ai/semantic-search', authenticateSession, async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API Key not configured on server' });
    }

    try {
      const { query, opportunities } = req.body;

      const prompt = `Parse search intent and score opportunities by semantic relevance to the search query.

Search Query: "${query}"

Opportunities List:
${JSON.stringify(opportunities, null, 2)}

Return parsed search intent (keywords, county if detected, opportunity type if detected) and scored results (relevanceScore 0-100, highlights, and reason).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.OBJECT,
                properties: {
                  extractedKeywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  extractedCounty: { type: Type.STRING },
                  extractedOpportunityType: { type: Type.STRING },
                  minSalary: { type: Type.NUMBER },
                },
                required: ['extractedKeywords'],
              },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    opportunityId: { type: Type.STRING },
                    relevanceScore: { type: Type.NUMBER },
                    matchHighlights: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    relevanceReason: { type: Type.STRING },
                  },
                  required: ['opportunityId', 'relevanceScore', 'matchHighlights', 'relevanceReason'],
                },
              },
            },
            required: ['intent', 'results'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        ...parsed,
        providerUsed: 'Gemini 3.8 Flash',
      });
    } catch (error: any) {
      console.error('Error in /api/ai/semantic-search:', error);
      res.status(500).json({ error: 'Internal Server Error. Please contact security support.' });
    }
  });

  // --- STRIPE SESSIONS ---

  app.post('/api/create-checkout-session', authenticateSession, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured on this environment.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      const { priceId, organizationId, successUrl, cancelUrl } = req.body;

      // Strict Multi-Tenant Isolation Check: Ensure user belongs to organization or has platform override
      const memberships = db.getMembershipsByUserId((req as any).user.id);
      const isMember = memberships.some(m => m.organizationId === organizationId);
      const isPlatformAdmin = (req as any).user.primaryRole === 'platform_admin' || (req as any).user.systemRole === 'platform_admin';
      
      if (!isMember && !isPlatformAdmin) {
        return res.status(403).json({ error: 'Forbidden: Tenant isolation violation. You cannot manage subscription for this organization.' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: organizationId,
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Internal Server Error. Failed to create checkout session.' });
    }
  });

  app.post('/api/create-portal-session', authenticateSession, async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured on this environment.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      const { customerId, returnUrl } = req.body;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      res.status(500).json({ error: 'Internal Server Error. Failed to create portal session.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

