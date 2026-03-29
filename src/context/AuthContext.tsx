import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTenant } from './TenantContext';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';
import { clearToken, getToken, setToken } from '../utils/tokenStore';
import axios from 'axios';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuthState {
  userRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  refreshAuth: (knownRole?: string) => void;
}

// ─── Roles válidos — fuente de verdad en el frontend ─────────────────────────
const VALID_ROLES = [
  'SUPER_ADMIN',
  'IT_ADMIN',
  'COMPLIANCE_OFFICER',
  'CASE_MANAGER',
  'FORENSIC_INVESTIGATOR',
  'EXTERNAL_AUDITOR',
] as const;

type UserRole = typeof VALID_ROLES[number];

const isValidRole = (role: string): role is UserRole =>
  VALID_ROLES.includes(role as UserRole);

// ─── Rutas públicas ───────────────────────────────────────────────────────────
const PUBLIC_SEGMENTS = [
  'public-report',
  'public-report-detail',
  'gateway',
  'verify-portal',
  'register',
  'success',
] as const;

const isPublicRoute = (pathname: string): boolean =>
  pathname.split('/').filter(Boolean).some(seg =>
    PUBLIC_SEGMENTS.includes(seg as typeof PUBLIC_SEGMENTS[number])
  );

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  userRole: null,
  isLoading: true,
  isAuthenticated: false,
  refreshAuth: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { portal, isLoading: tenantLoading } = useTenant();
  const location = useLocation();

  const [state, setState] = useState<AuthState>({
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchedForPortal = useRef<string | null>(null);

  // ─── Fetch user role ──────────────────────────────────────────────────────
  const fetchUserRole = useCallback((portalName: string) => {
    api.get(`${API_BASE_URL}/${portalName}/api/v1/users/user/user-role/`)
      .then(res => {
        const role = res.data?.user_role;

        // Validar que el rol recibido sea uno conocido
        if (!role || !isValidRole(role)) {
          clearToken();
          fetchedForPortal.current = null;
          setState({ userRole: null, isLoading: false, isAuthenticated: false });
          return;
        }

        setState({ userRole: role, isLoading: false, isAuthenticated: true });
      })
      .catch(err => {
        if (err.name === 'CanceledError' || err.name === 'AbortError' || axios.isCancel(err)) return;
        fetchedForPortal.current = null;
        clearToken();
        setState({ userRole: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  // ─── refreshAuth — llamado desde Login tras obtener el rol ────────────────
  const refreshAuth = useCallback((knownRole?: string) => {
    if (!portal) return;

    if (knownRole) {
      if (!isValidRole(knownRole)) {
        clearToken();
        setState({ userRole: null, isLoading: false, isAuthenticated: false });
        return;
      }

      flushSync(() => {
        fetchedForPortal.current = portal;
        setState({ userRole: knownRole, isLoading: false, isAuthenticated: true });
      });
      return;
    }

    // ✅ Sin knownRole = logout — resetear estado sin llamar al servidor
    fetchedForPortal.current = null;
    flushSync(() => {
      setState({ userRole: null, isLoading: false, isAuthenticated: false });
    });

  }, [portal]);

  // ─── Effect — verificar sesión al cargar o cambiar de portal ─────────────
  useEffect(() => {
    if (tenantLoading || !portal) return;

    // Rutas públicas: solo apagar loading, no verificar sesión
    if (isPublicRoute(location.pathname)) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Guard — ya verificado para este portal
    if (fetchedForPortal.current === portal) return;

    // Marcar antes de cualquier llamada async para evitar race conditions
    fetchedForPortal.current = portal;

    const token = getToken();

    if (!token) {
      // Sin token en memoria — intentar renovar desde cookie httpOnly
      axios.post(
        `${API_BASE_URL}/accounts/api/v1/token/refresh/`,
        {},
        { withCredentials: true }
      )
        .then(res => {
          const newToken = res.data?.access;
          if (!newToken) throw new Error('Token vacío en refresh');
          setToken(newToken);
          fetchUserRole(portal);
        })
        .catch(() => {
          // Cookie expirada o inválida — sesión terminada
          fetchedForPortal.current = null;
          clearToken();
          setState({ userRole: null, isLoading: false, isAuthenticated: false });
        });
      return;
    }

    fetchUserRole(portal);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, tenantLoading]);
  // ⚠️ location.pathname excluido intencionalmente —
  // el effect solo debe correr al cambiar de portal,
  // no en cada navegación interna

  return (
    <AuthContext.Provider value={{ ...state, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);