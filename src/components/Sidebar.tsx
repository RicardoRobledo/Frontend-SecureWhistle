import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  User,
  Shield,
  Megaphone,
  BarChart3,
  Settings2,
  Settings,
  X,
  ShieldCheck,
  CreditCard,
  Activity
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  portal: string;
  userRole: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  portal,
  isCustomDomain,
  userRole,
}) => {
  const canManageRoles =
    userRole === 'SUPER_ADMIN' || userRole === 'IT_ADMIN';
  const canManageReportsFinalized =
    userRole === 'SUPER_ADMIN' || userRole === 'EXTERNAL_AUDITOR';
  const canManagePayments = userRole === 'SUPER_ADMIN';
  const canManageComplaints =
    ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CASE_MANAGER', 'FORENSIC_INVESTIGATOR',].includes(
      userRole
    );
  const canManageCatalogs = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'IT_ADMIN'].includes(userRole);
  const canViewAnalytics = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER'].includes(userRole);
  const canManageTrazability = ['SUPER_ADMIN', 'EXTERNAL_AUDITOR'].includes(userRole);
  const canManageSettings = ['SUPER_ADMIN', 'IT_ADMIN'].includes(userRole);

  const url = isCustomDomain ? `/` : `/${portal}/`;

  const navItems = [
    // 👇 SOLO SUPER_ADMIN e IT_ADMIN
    { to: url + `dashboard`, icon: LayoutDashboard, label: 'Tablero Principal' },
    
    ...(canManageComplaints
      ? [{ to: url + `complaints`, icon: Megaphone, label: 'Denuncias' }]
      : []),

    ...(canManageReportsFinalized
      ? [{ to: url + `finalized`, icon: CheckCircle, label: 'Denuncias Cerradas' }]
      : []),

    ...(canViewAnalytics
      ? [{ to: url + `analytics`, icon: BarChart3, label: 'Análisis Gerencial' }]
      : []),

    ...(canManageCatalogs
      ? [{ to: url + `catalogs`, icon: Settings2, label: 'Catálogos' }]
      : []),

    ...(canManageRoles
      ? [{ to: url + `roles`, icon: Users, label: 'Roles y Permisos' }]
      : []),
    
    ...(canManageTrazability
      ? [{ to: url + `trazability`, icon: Activity, label: 'Trazabilidad' }]
      : []),

    { to: url + `profile`, icon: User, label: 'Configuración Perfil' },

    ...(canManagePayments
      ? [{ to: url + `billing`, icon: CreditCard, label: 'Facturación' }]
      : []),
    
    ...(canManageSettings
      ? [{ to: url + `settings`, icon: Settings, label: 'Configuración' }]
      : []),
  ];

  return (
    <aside
      className={`w-72 bg-slate-900 border-r border-slate-800 h-full fixed left-0 top-0 flex flex-col z-[60] text-white transition-transform duration-300 shadow-2xl ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      {/* HEADER */}
      <div className="p-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
            <Shield size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SecureWhistle</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Ethics Portal
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          Gestión Central
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => onClose()}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* FOOTER */}
      <div className="p-6 mt-auto">
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Nivel de Acceso
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300">
              {userRole.replace('_', ' ')}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Sesión protegida por SSL
            </p>
          </div>
          <Shield
            size={60}
            className="absolute -bottom-4 -right-4 text-white/[0.03] group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;