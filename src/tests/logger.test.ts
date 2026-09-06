import { describe, it, expect, beforeEach } from 'vitest';
import { logger } from '../core/logging/logger';

describe('Structured Logging Foundation', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  it('should format and store log entries with tags and timestamp', () => {
    const entry = logger.info('AUTH', 'User signed in successfully', { userId: '123' });
    expect(entry.id).toBeDefined();
    expect(entry.level).toBe('INFO');
    expect(entry.tag).toBe('AUTH');
    expect(entry.message).toBe('User signed in successfully');
    expect(entry.metadata).toEqual({ userId: '123' });

    const recent = logger.getRecentLogs(10);
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(entry.id);
  });

  it('should redact sensitive fields like password, token, and apiKey', () => {
    logger.warn('SECURITY', 'Attempt with credentials', {
      username: 'johndoe',
      password: 'SuperSecretPassword123',
      token: 'jwt-abc-xyz',
      apiKey: 'gemini-key-999'
    });

    const recent = logger.getRecentLogs(1);
    expect(recent[0].metadata?.username).toBe('johndoe');
    expect(recent[0].metadata?.password).toBe('[REDACTED]');
    expect(recent[0].metadata?.token).toBe('[REDACTED]');
    expect(recent[0].metadata?.apiKey).toBe('[REDACTED]');
  });
});
