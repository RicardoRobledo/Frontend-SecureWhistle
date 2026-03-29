import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Search, Filter, Clock, CheckCircle, AlertCircle, Inbox, X, RotateCcw, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { AccessLevel } from '../types';
import { toast, Toaster } from 'sonner';
import api from '../utils/api';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import { CLASSIFICATIONS, PRIORITIES, REPORT_STATUS } from '../constants';

import type { Complaint, ComplaintState, ComplaintStats, ActiveFilters } from '../types/complaints.types';


const Complaints: React.FC = () => {
  const navigate = useNavigate();
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  const [stats, setStats] = useState<ComplaintStats>({
    total_cases: 0,
    by_status: {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      discarded: 0,
    }
  });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [states, setStates] = useState<ComplaintState[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const today = new Date().toISOString().split('T')[0];

  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    status: '',
    priority: '',
    state: '',
    classification: '',
    startDate: '',
    endDate: ''
  });

  const accessRank = { [AccessLevel.LOW]: 1, [AccessLevel.MEDIUM]: 2, [AccessLevel.HIGH]: 3 };

  const goToFirst = () => { if (currentPage > 1) getFilteredComplaints(1); };
  const goToPrevious = () => { if (currentPage > 1) getFilteredComplaints(currentPage - 1); };
  const goToNext = () => { if (currentPage < totalPages) getFilteredComplaints(currentPage + 1); };
  const goToLast = () => { if (currentPage < totalPages) getFilteredComplaints(totalPages); };

  const canExport = userRole === 'SUPER_ADMIN' || userRole === 'COMPLIANCE_OFFICER';

  const clearFilters = async () => {
    const cleared = { status: '', priority: '', state: '', classification: '', startDate: '', endDate: '' };
    setActiveFilters(cleared);
    setShowFilters(false);
    await getFilteredComplaints(1, cleared);
  };

  const getFilteredComplaints = async (page = 1, filters = activeFilters) => {

    let url = `${portal}/api/v1/complaints/`;

    try {
      setLoading(true);
      const res = await api.get(
        `${API_BASE_URL}/` + url,
        {
          params: {
            page,
            page_size: pageSize,
            status: filters.status,
            priority: filters.priority,
            state_id: filters.state,
            classification: filters.classification,
            start_date: filters.startDate,
            end_date: filters.endDate
          }
        }
      );

      setComplaints(res.data.results || []);
      setCurrentPage(page);
      setStats(res.data.stats);
      setTotalPages(Math.ceil(res.data.count / pageSize));

    } catch (error) {
      toast.error('Error al obtener las denuncias.');
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = activeFilters.status || activeFilters.priority || activeFilters.state || activeFilters.classification || activeFilters.startDate || activeFilters.endDate;

  const fetchStates = async () => {
    try {
      let url = `${portal}/api/v1/catalogs/`;

      const res = await api.get(`${API_BASE_URL}/` + url);
      setStates(res.data.states || []);
    } catch (error) {
      toast.error('Error al obtener los catálogos.');
    }
  };

  const exportToExcel = async () => {
    try {
      let complaintUrl = `${portal}/api/v1/complaints/export/`;

      const response = await api.get(`${API_BASE_URL}/` + complaintUrl, {
        params: {
          status: activeFilters.status,
          priority: activeFilters.priority,
            state_id: activeFilters.state,
            classification: activeFilters.classification,
            start_date: activeFilters.startDate,
            end_date: activeFilters.endDate
          },
          responseType: "blob"
        }
      );

      if (response.status !== 200) throw new Error('Export failed');

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const todayDate = new Date();
      const formatter = new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Mexico_City",
        day: "2-digit", month: "2-digit", year: "numeric"
      });

      const parts = formatter.formatToParts(todayDate);
      const day = parts.find(p => p.type === "day")?.value;
      const month = parts.find(p => p.type === "month")?.value;
      const year = parts.find(p => p.type === "year")?.value;
      const filename = `Reporte_Denuncias_${day}-${month}-${year}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      toast.error("Error al exportar el reporte.");
    }
  };

  useEffect(() => {
  const controller = new AbortController();

  const init = async () => {
    try {
      const [complaintsRes, catalogsRes] = await Promise.all([
        api.get(`${API_BASE_URL}/${portal}/api/v1/complaints/`, {
          signal: controller.signal,
          params: {
            page: 1,
            page_size: pageSize,
            status: '',
            priority: '',
            state_id: '',
            classification: '',
            start_date: '',
            end_date: '',
          }
        }),
        api.get(`${API_BASE_URL}/${portal}/api/v1/catalogs/`, {
          signal: controller.signal,
        }),
      ]);

      setComplaints(complaintsRes.data.results || []);
      setCurrentPage(1);
      setStats(complaintsRes.data.stats);
      setTotalPages(Math.ceil(complaintsRes.data.count / pageSize));
      setStates(catalogsRes.data.states || []);

    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  setLoading(true);
  init();

  return () => controller.abort();
}, [portal]); 

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <Toaster position="top-right" richColors />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tablero Principal</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Resumen de actividad según tu nivel de acceso:
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
              <Lock size={12} /> {currentUser?.accessLevel}
            </span>
          </p>
        </div>
        {canExport && (
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors"
          >
            Descargar Reporte
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Casos',  value: stats.total_cases,           icon: Inbox,        bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-100' },
          { label: 'Pendientes',   value: stats.by_status.pending,     icon: AlertCircle,  bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-100' },
          { label: 'En Proceso',   value: stats.by_status.in_progress, icon: Clock,        bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
          { label: 'Resueltos',    value: stats.by_status.resolved,    icon: CheckCircle,  bg: 'bg-green-50',  text: 'text-green-600',  border: 'border-green-100' },
          { label: 'Descartados',  value: stats.by_status.discarded,   icon: X,            bg: 'bg-red-50',    text: 'text-red-500',    border: 'border-red-100' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-2xl border ${stat.border} p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all duration-200`}
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.text} flex items-center justify-center`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible relative z-0">

        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-900">Denuncias Recientes</h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative">
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Filter size={16} />
                Filtros
                {hasActiveFilters && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              </button>

              {showFilters && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800">Filtrar por</h3>
                    <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Estatus</label>
                      <select
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                        value={activeFilters.status}
                        onChange={(e) => setActiveFilters({ ...activeFilters, status: e.target.value })}
                      >
                        <option value="">Todos</option>
                        {REPORT_STATUS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Prioridad</label>
                      <select
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                        value={activeFilters.priority}
                        onChange={(e) => setActiveFilters({ ...activeFilters, priority: e.target.value })}
                      >
                        <option value="">Todas</option>
                        {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Clasificación</label>
                      <select
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                        value={activeFilters.classification}
                        onChange={(e) => setActiveFilters({ ...activeFilters, classification: e.target.value })}
                      >
                        <option value="">Todas</option>
                        {CLASSIFICATIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Estado o sede</label>
                      <select
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                        value={activeFilters.state}
                        onChange={(e) => setActiveFilters({ ...activeFilters, state: e.target.value })}
                      >
                        <option value="">Todas</option>
                        {states.map((state: ComplaintState) => (
                          <option key={state.id} value={state.id}>{state.state_headquearters}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Fecha Inicio</label>
                      <input
                        type="date"
                        value={activeFilters.startDate}
                        max={today}
                        onChange={(e) => setActiveFilters({ ...activeFilters, startDate: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Fecha Fin</label>
                      <input
                        type="date"
                        value={activeFilters.endDate}
                        max={today}
                        onChange={(e) => setActiveFilters({ ...activeFilters, endDate: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={clearFilters}
                        className="flex-1 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw size={12} /> Limpiar
                      </button>
                      <button
                        onClick={() => { getFilteredComplaints(1); setShowFilters(false); }}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Denuncia</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto & Fecha</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estatus</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {complaints.length > 0 ? complaints.map((complaint: Complaint) => (
                  <tr key={complaint.id} className="group hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {complaint.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">
                          {CLASSIFICATIONS.find(c => c.key === complaint.classification)?.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {complaint.state?.state_headquearters} • {new Date(complaint.created_at).toLocaleString('es-MX', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type="priority" priority={complaint.priority?.toLowerCase() ?? 'N/A'} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type="status" status={complaint.status?.toLowerCase() ?? 'N/A'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          navigate((isCustomDomain ? `/complaints/${complaint.id}` : `/${portal}/complaints/${complaint.id}`));
                        }}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline decoration-blue-200 underline-offset-4"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Search size={20} className="text-slate-300" />
                        </div>
                        <p className="font-medium text-slate-600">No se encontraron resultados</p>
                        <p className="text-sm text-slate-400 mt-1">Intenta ajustar los filtros o el término de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
              <div className="text-sm text-slate-500">
                Página <span className="font-semibold text-slate-900">{currentPage}</span> de {totalPages}
              </div>
              <div className="flex gap-2">
                <button onClick={goToFirst} disabled={currentPage === 1} className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Primera</button>
                <button onClick={goToPrevious} disabled={currentPage === 1} className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Anterior</button>
                <div className="px-3 py-1 text-sm font-semibold bg-slate-100 rounded">{currentPage}</div>
                <button onClick={goToNext} disabled={currentPage === totalPages} className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Siguiente</button>
                <button onClick={goToLast} disabled={currentPage === totalPages} className="px-3 py-1 text-sm rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Última</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;