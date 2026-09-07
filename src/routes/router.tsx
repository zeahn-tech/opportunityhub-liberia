import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { logger } from '../core/logging/logger';
import { UserRole } from '../types';
import { AccessDenied } from '../components/common/AccessDenied';

export interface RouteMatch {
  path: string;
  params: Record<string, string>;
  hash: string;
  queryString: string;
  queryParams: URLSearchParams;
}

interface RouterContextType {
  route: RouteMatch;
  navigate: (to: string) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

function parseHashRoute(): RouteMatch {
  const fullHash = window.location.hash || '#/';
  const cleanHash = fullHash.startsWith('#') ? fullHash.slice(1) : fullHash;
  const [pathPart, queryPart = ''] = cleanHash.split('?');
  const normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;

  return {
    path: normalizedPath || '/',
    params: {},
    hash: fullHash,
    queryString: queryPart,
    queryParams: new URLSearchParams(queryPart)
  };
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteMatch>(parseHashRoute);

  useEffect(() => {
    const handleHashChange = () => {
      const updated = parseHashRoute();
      setRoute(updated);
      logger.debug('ROUTER', `Navigated to [${updated.path}]`, {
        query: Object.fromEntries(updated.queryParams.entries())
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const target = to.startsWith('#') ? to : `#${to.startsWith('/') ? to : `/${to}`}`;
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <RouterContext.Provider value={{ route, navigate, goBack }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};

// Route matching helper
export function matchRoute(
  pattern: string,
  actualPath: string
): { matches: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/').filter(Boolean);
  const actualParts = actualPath.split('/').filter(Boolean);

  if (patternParts.length !== actualParts.length) {
    return { matches: false, params: {} };
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pPart = patternParts[i];
    const aPart = actualParts[i];

    if (pPart.startsWith(':')) {
      const paramName = pPart.slice(1);
      params[paramName] = decodeURIComponent(aPart);
    } else if (pPart !== aPart) {
      return { matches: false, params: {} };
    }
  }

  return { matches: true, params };
}

// Protected Route Guard
export interface RouteGuardProps {
  children: ReactNode;
  userRole?: UserRole;
  allowedRoles?: UserRole[];
  isAllowed?: boolean;
  workspaceName?: string;
  reason?: string;
  actionHint?: string;
  fallback?: ReactNode;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  userRole,
  allowedRoles,
  isAllowed,
  workspaceName,
  reason = "You don't have permission to access this workspace.",
  actionHint,
  fallback
}) => {
  // If explicit isAllowed is supplied, prioritize it
  let permitted = true;
  if (typeof isAllowed === 'boolean') {
    permitted = isAllowed;
  } else if (allowedRoles && userRole) {
    permitted = allowedRoles.includes(userRole);
  }

  if (!permitted) {
    return (
      fallback || (
        <AccessDenied
          workspaceName={workspaceName}
          reason={reason}
          actionHint={actionHint}
        />
      )
    );
  }

  return <>{children}</>;
};
