/**
 * Cryptographic and security primitives for OpportunityHub Liberia
 * Implements Web Crypto API (SHA-256) salted hashing, token generation,
 * password policy verification, and sensitive data sanitization.
 *
 * SCOPE (as of Phase 2 -- Supabase Auth migration):
 * hashPassword()/verifyPassword() are used ONLY by src/db/dbClient.ts's
 * opt-in local "demo mode" path (VITE_ENABLE_DEMO_MODE=true), never by
 * src/services/authService.ts's real-user register/login/reset flows.
 * Supabase Auth owns password storage and verification for real accounts;
 * this app never hashes or compares a real user's password itself. Do not
 * reintroduce a call to these from the Supabase-backed auth path.
 */

export async function hashPassword(password: string, salt: string): Promise<string> {
  const combined = `${salt}:${password}:liberia-opphub-sec-v1`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);

  // Modern browser & Node 19+ support global crypto.subtle
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === expectedHash;
}

export function generateSalt(bytes = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateToken(prefix = 'tok'): string {
  const random = generateSalt(24);
  return `${prefix}_${Date.now()}_${random}`;
}

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter.' };
  }
  if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number or special symbol.' };
  }
  return { valid: true };
}
