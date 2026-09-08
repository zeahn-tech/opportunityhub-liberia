import React from 'react';
import { FlaskConical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Persistent, unmissable indicator that the current session is the local
 * opt-in demo path (VITE_ENABLE_DEMO_MODE=true), not a real Supabase Auth
 * account. Renders nothing outside demo mode -- including in production,
 * where demo mode defaults to disabled (see src/config/env.ts).
 */
export const DemoModeBanner: React.FC = () => {
  const { isDemoMode } = useAuth();

  if (!isDemoMode) return null;

  return (
    <div className="bg-[#BC6C25] text-[#F9F8F6] px-4 py-2 text-xs border-b border-[#8a4f19] flex items-center justify-center gap-2 shadow-xs">
      <FlaskConical className="w-3.5 h-3.5 shrink-0" />
      <span>
        <strong>Demo Mode:</strong> You are using a local sample account. No password was verified against a real account, and this session is not a real user identity.
      </span>
    </div>
  );
};
