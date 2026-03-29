
import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useOutletContext } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout: React.FC = () => {
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="no-print">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} portal={portal} isCustomDomain={isCustomDomain} userRole={userRole} />
      </div>

      {/* Overlay para móvil */}
      {isSidebarOpen && (
        <div 
          className="no-print fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="no-print">
        <Header onToggleMenu={() => setIsSidebarOpen(true)} />
      </div>
      
      <main className="md:ml-72 p-6 lg:p-10 max-w-[1600px] mx-auto transition-all duration-300">
        <Outlet context={{ userRole }} />
      </main>
    </div>
  );
};

export default AdminLayout;
