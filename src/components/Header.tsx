import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { clearToken } from '../utils/tokenStore';

interface HeaderProps {
  onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
  const navigate = useNavigate();
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();
  const { refreshAuth } = useAuth();

  const handleLogout = async () => {
    try {
      await api.post(`${API_BASE_URL}/accounts/api/v1/token/logout/`, {}, {
        withCredentials: true, // ← ya está en la instancia, pero no hace daño
      });
    } catch {
      // Si falla el backend, igual limpiamos localmente
    } finally {
      clearToken();
      refreshAuth();
      navigate(isCustomDomain ? `/gateway` : `/${portal}/gateway`);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-[50] md:ml-72 transition-all duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleMenu}
          className="md:hidden p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 hidden md:block">
            Panel de Administración
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
