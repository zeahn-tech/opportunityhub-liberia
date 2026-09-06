import { db } from '../db/dbClient';

export type RateLimitAction =
  | 'create_opportunity'
  | 'create_business_listing'
  | 'send_message'
  | 'submit_report'
  | 'submit_verification';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const ACTION_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  create_opportunity: { maxRequests: 5, windowSeconds: 300 }, // Max 5 job posts per 5 min
  create_business_listing: { maxRequests: 3, windowSeconds: 300 }, // Max 3 M&A listings per 5 min
  send_message: { maxRequests: 20, windowSeconds: 60 }, // Max 20 messages per min
  submit_report: { maxRequests: 5, windowSeconds: 600 }, // Max 5 reports per 10 min
  submit_verification: { maxRequests: 3, windowSeconds: 3600 }, // Max 3 verifications per hour
};

// In-memory sliding window timestamps per key (key = `${userId}_${action}`)
const requestLogs = new Map<string, number[]>();

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  errorMsg?: string;
}

export class RateLimiterService {
  /**
   * Check if an action is allowed for a given user under sliding window rate limits.
   */
  checkLimit(userId: string, action: RateLimitAction): RateLimitCheckResult {
    const config = ACTION_CONFIGS[action] || { maxRequests: 10, windowSeconds: 60 };
    const key = `${userId}_${action}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    const timestamps = (requestLogs.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= config.maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestInWindow + config.windowSeconds * 1000 - now) / 1000);

      // Log suspicious activity event for abuse tracking
      this.recordRateLimitAbuse(userId, action, timestamps.length);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
        errorMsg: `Rate limit exceeded for action '${action}'. Please wait ${retryAfterSeconds} seconds before trying again.`,
      };
    }

    // Record this request
    timestamps.push(now);
    requestLogs.set(key, timestamps);

    return {
      allowed: true,
      remaining: config.maxRequests - timestamps.length,
      retryAfterSeconds: 0,
    };
  }

  private recordRateLimitAbuse(userId: string, action: RateLimitAction, attemptCount: number) {
    try {
      const user = db.getUserById(userId);
      db.createSuspiciousActivityEvent({
        actorUserId: userId,
        actorName: user?.fullName || 'Unknown User',
        actorEmail: user?.email || 'N/A',
        eventType: 'rate_limit_exceeded',
        severity: attemptCount > 10 ? 'high' : 'medium',
        description: `User exceeded rate limit for action '${action}' (${attemptCount} attempts in window).`,
        metadata: { action, attemptCount, timestamp: new Date().toISOString() },
        status: 'detected',
      });
    } catch {
      // Ignore logging failures silently
    }
  }

  /**
   * Clear rate limit history for test/admin override
   */
  resetLimit(userId: string, action?: RateLimitAction) {
    if (action) {
      requestLogs.delete(`${userId}_${action}`);
    } else {
      for (const key of requestLogs.keys()) {
        if (key.startsWith(`${userId}_`)) {
          requestLogs.delete(key);
        }
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
