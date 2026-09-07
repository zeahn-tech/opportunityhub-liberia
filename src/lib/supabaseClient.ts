import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from '../config/env';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseInstance) {
    if (envConfig.supabaseUrl && envConfig.supabaseAnonKey) {
      supabaseInstance = createClient(envConfig.supabaseUrl, envConfig.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
