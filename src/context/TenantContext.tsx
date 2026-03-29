// src/context/TenantContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, MAIN_DOMAINS } from '../config/api';

interface TenantContextType {
  portal: string | null;
  isCustomDomain: boolean;
  isLoading: boolean;
  domainError: boolean;
  portalError: boolean;
}

const TenantContext = createContext<TenantContextType>({
  portal: null,
  isCustomDomain: false,
  isLoading: true,
  domainError: false,
  portalError: false,
});

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const hostname = window.location.hostname;
  const isCustomDomain = !MAIN_DOMAINS.includes(hostname);
  const location = useLocation();
  const navigate = useNavigate();

  const [portal, setPortal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [domainError, setDomainError] = useState(false);
  const [portalError, setPortalError] = useState(false);

  const resolvedPortalRef = useRef<string | null>(null);

  useEffect(() => {
    const SAAS_ROUTES = ['verify-portal', 'register', 'success'];
  const EXCLUDED_SECOND_SEGMENTS = ['reactivate']; // ← nuevo
  const segments = location.pathname.split('/').filter(Boolean);
  const portalFromUrl = segments[0] === 'portal' ? segments[1] : segments[0];

  // ── Si el segundo segmento es reactivate → no verificar ──────────────
  if (segments[1] && EXCLUDED_SECOND_SEGMENTS.includes(segments[1])) {
    if (isLoading) setIsLoading(false);
    return;
  }

    if (isCustomDomain) {
      if (resolvedPortalRef.current) return;

      axios.get(`${API_BASE_URL}/accounts/api/v1/organization/${hostname}/`)
        .then(res => {
          resolvedPortalRef.current = res.data.portal;
          setPortal(res.data.portal);
        })
        .catch(() => setDomainError(true))
        .finally(() => setIsLoading(false));
      return;
    }

    if (!portalFromUrl || SAAS_ROUTES.includes(portalFromUrl)) {
      if (isLoading) setIsLoading(false);
      return;
    }

    if (resolvedPortalRef.current === portalFromUrl) {
      if (portal !== portalFromUrl) setPortal(portalFromUrl);
      if (isLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPortalError(false);

    const controller = new AbortController();

    axios.post(
      `${API_BASE_URL}/accounts/api/v1/verify/organization-portal/`,
      { portal: portalFromUrl },
      { signal: controller.signal }
    )
      .then(() => {
        resolvedPortalRef.current = portalFromUrl;
        setPortal(portalFromUrl);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;

        if (err.response?.status === 403) {
          // Organización existe pero está inactiva → reactivar
          navigate(`/${portalFromUrl}/reactivate`, { replace: true, state: { authorized: true } });
        } else {
          // Portal no existe → error
          setPortalError(true);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();

  }, [location.pathname, hostname, isCustomDomain]);

  return (
    <TenantContext.Provider value={{
      portal, isCustomDomain, isLoading, domainError, portalError
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);