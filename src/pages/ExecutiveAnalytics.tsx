import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Clock, ShieldAlert, Target, Layers, Activity, ChevronRight, LucideIcon
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import api from '../utils/api';


interface AnalyticsData {
  period: string;
  range: { from: string; to: string };
  kpis: {
    total_complaints: number;
    resolution_index: number;
    critical_cases: number;
    avg_resolution_days: number;
  };
  resolution_flow: {
    pending: number;
    in_progress: number;
    resolved: number;
    discarded: number;
  };
  nature_of_reports: Array<{ classification: string; count: number }>;
  by_business_unit: Array<{ unit_name: string; count: number }>;
  risk_profile: {
    financial: number;
    legal: number;
    reputational: number;
  };
}

type ColorKey = 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: ColorKey;
}

interface RiskBarProps {
  label: string;
  value: number;
  color: string;
}

interface StatusColProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

const printStyles = `
  @media print {
    body > *:not(#root) {
      display: none !important;
    }
    .no-print {
      display: none !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      margin: 8mm;
      size: landscape;
    }
    body, html {
      background: white !important;
      width: 100% !important;
    }
    #dashboard-print-root {
      width: 100% !important;
      min-height: unset !important;
      padding: 0 !important;
      background: #fcfdfe !important;
    }
    .bg-white,
    .bg-slate-900 {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;

const ExecutiveAnalytics: React.FC = () => {
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = printStyles;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
  if (!portal) return;

  const controller = new AbortController();

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `${API_BASE_URL}/${portal}/api/v1/complaints/stats/`,
        {
          signal: controller.signal,
          params: { period }
        }
      );
      setData(response.data);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al sincronizar datos estratégicos');
    } finally {
      setLoading(false);
    }
  };

  load();
  return () => controller.abort();

}, [portal, period]);

  const periodLabel: Record<string, string> = {
    week: 'Semanal',
    month: 'Mensual',
    year: 'Anual'
  };

  const exportToPDF = () => {
    const originalTitle = document.title;
    const fecha = new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    document.title = `AnálisisGerencial-${periodLabel[period]}-${fecha}`;
    window.print();
    document.title = originalTitle;
  };

  if (!data && loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
          Cargando métricas ...
        </p>
      </div>
    );
  }

  return (
    <div
      id="dashboard-print-root"
      className="w-full px-5 py-4 space-y-4 min-h-screen bg-[#fcfdfe]"
    >
      <Toaster position="top-right" richColors />

      {/* HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-900 text-white rounded-lg shadow-lg">
            <Activity size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              <span>Gestión Ética</span>
              <ChevronRight size={10} className="text-slate-300" />
              <span className="text-slate-400">Análisis Gerencial</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Panel de control operativo
            </h1>
          </div>
        </div>

        {/* Controles — ocultos al imprimir */}
        <div className="no-print flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {[
              { label: 'Semana', value: 'week' },
              { label: 'Mes',    value: 'month' },
              { label: 'Año',    value: 'year' }
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value as 'week' | 'month' | 'year')}
                className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                  period === opt.value
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

          <button
            onClick={exportToPDF}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-md"
          >
            Exportar
          </button>
        </div>
      </header>

      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white/50 rounded-xl border border-dashed border-slate-200 italic text-slate-400 text-sm">
          Obteniendo métricas...
        </div>
      ) : data && (
        <>
          {/* KPI GRID */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Denuncias" value={data.kpis.total_complaints}     icon={Layers}     color="blue" />
            <StatCard label="Eficiencia"       value={`${data.kpis.resolution_index}%`} icon={Target}  color="emerald" />
            <StatCard label="Casos Críticos"   value={data.kpis.critical_cases}       icon={ShieldAlert} color={data.kpis.critical_cases > 0 ? 'rose' : 'slate'} />
            <StatCard label="Tiempo Cierre"    value={`${data.kpis.avg_resolution_days}d`} icon={Clock} color="amber" />
          </section>

          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800 uppercase">Naturaleza de Incidentes</h3>
              </div>
              <div className="space-y-5">
                {data.nature_of_reports.map((item) => (
                  <div key={item.classification}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-600 uppercase tracking-tight">{item.classification}</span>
                      <span className="font-black text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                        style={{ width: `${(item.count / (data.kpis.total_complaints || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 rounded-xl p-5 text-white shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Perfil de Riesgo</h3>
                <div className="space-y-6">
                  <RiskBar label="Financiero"   value={data.risk_profile.financial}     color="bg-blue-400" />
                  <RiskBar label="Legal"         value={data.risk_profile.legal}         color="bg-rose-500" />
                  <RiskBar label="Reputacional"  value={data.risk_profile.reputational}  color="bg-amber-400" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Incidencia por Unidad</h3>
              <div className="divide-y divide-slate-50">
                {data.by_business_unit.map((unit) => (
                  <div key={unit.unit_name} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <span className="text-xs font-bold text-slate-600 capitalize">{unit.unit_name}</span>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{unit.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Incidencia por Estado o sede</h3>
              <div className="divide-y divide-slate-50">
                {data.by_state.map((state) => (
                  <div key={state.state_name} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <span className="text-xs font-bold text-slate-600 capitalize">{state.state_name}</span>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{state.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-12 bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">Flujo de Resolución Operativa</h3>
              <div className="flex items-end justify-between gap-4 h-32 px-4">
                <StatusCol label="Pendientes"  value={data.resolution_flow.pending}     total={data.kpis.total_complaints} color="bg-slate-200" />
                <StatusCol label="Proceso"     value={data.resolution_flow.in_progress} total={data.kpis.total_complaints} color="bg-blue-500" />
                <StatusCol label="Resueltos"   value={data.resolution_flow.resolved}    total={data.kpis.total_complaints} color="bg-emerald-500" />
                <StatusCol label="Descartados" value={data.resolution_flow.discarded}   total={data.kpis.total_complaints} color="bg-rose-400" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, color }) => {
  const colorMap: Record<ColorKey, string> = {
    blue:    'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose:    'text-rose-600 bg-rose-50 border-rose-100',
    amber:   'text-amber-600 bg-amber-50 border-amber-100',
    slate:   'text-slate-500 bg-slate-50 border-slate-100',
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-blue-200 transition-all">
      <div className={`p-3 rounded-lg border transition-transform group-hover:scale-105 ${colorMap[color]}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black text-slate-900 leading-none">{value}</span>
          {trend && (
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              {trend}
            </span>
          )}
        </div>
        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{label}</p>
      </div>
    </div>
  );
};

const RiskBar: React.FC<RiskBarProps> = ({ label, value, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-end">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <span className="text-xs font-black text-white">{value}%</span>
    </div>
    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const StatusCol: React.FC<StatusColProps> = ({ label, value, total, color }) => {
  const height = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-[50px] relative flex flex-col justify-end h-full">
        <div className={`w-full ${color} rounded-t-md transition-all duration-700 min-h-[4px] relative`} style={{ height: `${height}%` }}>
          {value > 0 && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-700">
              {value}
            </div>
          )}
        </div>
      </div>
      <span className="text-[9px] font-bold text-slate-400 uppercase mt-3 text-center">{label}</span>
    </div>
  );
};

export default ExecutiveAnalytics;