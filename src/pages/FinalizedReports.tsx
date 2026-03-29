import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  CheckCircle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import api from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { API_BASE_URL } from '../config/api';

// ✅ FIX 2: Interfaces concretas — eliminado `any`
interface ComplaintState {
  state_headquearters: string;
}

interface AssignedUser {
  full_name: string;
}

interface FinalizedComplaint {
  id: string;
  created_at: string;
  closing_date: string;
  classification: string;
  state?: ComplaintState;
  assigned_to?: AssignedUser;
}

interface PaginationData {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
}

interface FinalizedResponse {
  stats: {
    total_finalized: number;
    total_month: number;
    total_year: number;
  };
  pagination: PaginationData;
  complaints: FinalizedComplaint[];
}

const FinalizedReports: React.FC = () => {
  const navigate = useNavigate();
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  const [searchQuery, setSearchQuery] = useState('');

  const canExport = userRole === 'SUPER_ADMIN' || userRole === 'EXTERNAL_AUDITOR';

  const [finalizedComplaints, setFinalizedComplaints] =
    useState<FinalizedResponse | null>(null);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);


  const getFinalizedComplaints = async (pageNumber = 1, selectedPeriod = period) => {
    try {
      setLoading(true);

      let url = `${portal}/api/v1/complaints/finalized/`;

      const response = await api.get(
        `${API_BASE_URL}/`+url,
        {
          params: {
            page: pageNumber,
            period: selectedPeriod,
            // Listo para cuando conectes la búsqueda al backend:
            ...(searchQuery.trim() && { search: searchQuery.trim() }),
          }
        }
      );
      setFinalizedComplaints(response.data);
      setPage(pageNumber);
    } catch (error) {
      toast.error('Error al cargar las denuncias finalizadas');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {

    let excelUrl = `${portal}/api/v1/complaints/finalized/export-finalized/`;

    try {
      const response = await api.get(
        `${API_BASE_URL}/`+excelUrl,
        { responseType: 'blob' }
      );

      const contentType = response.headers['content-type'] || '';
      if (response.status !== 200 || !contentType.includes('spreadsheetml')) {
        toast.error('El servidor no devolvió un archivo válido.');
        return;
      }

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const today = new Date();
      const formatter = new Intl.DateTimeFormat('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      const parts = formatter.formatToParts(today);
      const day   = parts.find(p => p.type === 'day')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const year  = parts.find(p => p.type === 'year')?.value;
      const filename = `Reporte_Finalizadas_${day}-${month}-${year}.xlsx`;

      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      toast.error('Error al exportar el reporte.');
    }
  };

  useEffect(() => {
    if (!portal) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(
          `${API_BASE_URL}/${portal}/api/v1/complaints/finalized/`,
          {
            signal: controller.signal,
            params: {
              page: 1,
              period,
              ...(searchQuery.trim() && { search: searchQuery.trim() }),
            }
          }
        );
        setFinalizedComplaints(response.data);
        setPage(1);
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
        toast.error('Error al cargar las denuncias finalizadas');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();

  }, [portal, period]);

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="text-green-500" size={28} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Denuncias Finalizadas</h1>
          <p className="text-sm text-gray-500">Historial de casos resueltos y cerrados</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total finalizadas', value: finalizedComplaints?.stats?.total_finalized ?? 0, color: 'text-green-500' },
          { label: 'Este mes',          value: finalizedComplaints?.stats?.total_month      ?? 0, color: 'text-gray-800' },
          { label: 'Este año',          value: finalizedComplaints?.stats?.total_year       ?? 0, color: 'text-gray-800' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Top bar */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Historial de Casos</h2>

          <div className="flex gap-3 w-full sm:w-auto">

            {/* ✅ FIX 5: buscador con estado controlado y maxLength */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') getFinalizedComplaints(1); }}
                placeholder="Buscar denuncias..."
                maxLength={100}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Selector de Período */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    getFinalizedComplaints(1, p);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>

            {canExport && (
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                <Download size={16} />
                Exportar
              </button>
            )}
          </div>
        </div>

        {/* Table content */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Fecha Recepción</th>
                  <th className="px-6 py-4">Fecha Cierre</th>
                  <th className="px-6 py-4">Ciudad</th>
                  <th className="px-6 py-4">Clasificación</th>
                  <th className="px-6 py-4">Responsable</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {/* ✅ FIX 2: report tipado como FinalizedComplaint */}
                {finalizedComplaints?.complaints?.map((report: FinalizedComplaint) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{report.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(report.created_at).toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(report.closing_date).toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.state?.state_headquearters}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {report.classification.toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {report.assigned_to?.full_name ? (
                        <span className="text-gray-700">{report.assigned_to.full_name}</span>
                      ) : (
                        <span className="italic text-gray-400">No asignado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(isCustomDomain ? `/complaints/${report.id}` : `/${portal}/complaints/${report.id}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}

                {finalizedComplaints?.complaints?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search size={20} className="text-gray-300" />
                        <p>No hay denuncias finalizadas</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {finalizedComplaints?.pagination && (
          <div className="flex justify-center items-center gap-3 p-6 border-t bg-gray-50">
            <button
              disabled={page === 1}
              onClick={() => getFinalizedComplaints(1)}
              className="p-2 rounded-full border bg-white hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={18} />
            </button>

            <button
              disabled={!finalizedComplaints.pagination.previous}
              onClick={() => getFinalizedComplaints(page - 1)}
              className="p-2 rounded-full border bg-white hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold shadow-sm">
              {page}
            </div>

            <span className="text-sm text-gray-500">
              de {finalizedComplaints.pagination.total_pages}
            </span>

            <button
              disabled={!finalizedComplaints.pagination.next}
              onClick={() => getFinalizedComplaints(page + 1)}
              className="p-2 rounded-full border bg-white hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>

            <button
              disabled={page === finalizedComplaints.pagination.total_pages}
              onClick={() => getFinalizedComplaints(finalizedComplaints.pagination.total_pages)}
              className="p-2 rounded-full border bg-white hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalizedReports;