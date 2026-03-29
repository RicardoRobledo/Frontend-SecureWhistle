// src/components/routing/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';

const Loader = () => (
  <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center',
    justifyContent:'center', background:'rgba(255,255,255,0.5)', zIndex:9999 }}>
    <div style={{ width:60, height:60, borderRadius:'50%',
      border:'8px solid #f3f3f3', borderTop:'8px solid #3498db',
      animation:'spin 1s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

function ProtectedRoute({ allowedLevels }: { allowedLevels: string[] }) {
  const { portal, isCustomDomain } = useTenant();
  const { userRole, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <Loader />;

  if (!isAuthenticated) {
    const loginUrl = isCustomDomain ? '/gateway' : `/${portal}/gateway`;
    return <Navigate to={loginUrl} replace />;
  }

  if (!userRole || !allowedLevels.includes(userRole)) {
    const fallback = isAuthenticated
      ? (isCustomDomain ? '/dashboard' : `/${portal}/dashboard`)
      : '/';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet context={{ userRole }} />;
}

export default ProtectedRoute;