import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import api from '../utils/api';
import { toast, Toaster } from 'sonner';
import { useTenant } from '../context/TenantContext';
import { ROLE_DEFINITIONS } from '../constants';


interface AuditLog {
  id: string;
  action: string;
  entity: string;
  user: string;
  role: string;
  created_at: string;
}

interface AuditLogsResponse {
  results: AuditLog[];
  count: number;
  next: string | null;
  previous: string | null;
}

type ActionKey = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'LOGOUT';

const AuditLogList: React.FC = () => {
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  const { id } = useParams<{ id: string;  }>();
  const { portal, isCustomDomain } = useTenant();

  const [auditLogs, setAuditLogs] = useState<AuditLogsResponse>({
    results: [],
    count: 0,
    next: null,
    previous: null,
  });
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!portal) return;

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`${API_BASE_URL}/${portal}/api/v1/audit-logs/`, {
          signal: controller.signal,
          params: { page: 1 },
        });
        setAuditLogs(res.data);
        setAuditPage(1);
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
        toast.error('Error al obtener los registros de trazabilidad.');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();

  }, [portal]); // ← portal en lugar de [id]

  const getRoleLabel = (roleId: string) => {
    const role = ROLE_DEFINITIONS.find(r => r.id === roleId);
    return role ? role.label : roleId;
  };

 const fetchAuditLogs = async (page = 1) => {
    const controller = new AbortController();
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE_URL}/${portal}/api/v1/audit-logs/`, {
        signal: controller.signal,
        params: { page },
      });
      setAuditLogs(res.data);
      setAuditPage(page);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener los registros de trazabilidad.');
    } finally {
      setLoading(false);
    }
  };

  const getAuditDescription = (action: string, entity: string): string => {
    const actionMap: Record<string, string> = {
      CREATE:        'creó',
      READ:          'consultó',
      UPDATE:        'actualizó',
      DELETE:        'eliminó',
      STATUS_CHANGE: 'cambió el estatus de',
      LOGIN:         'inició sesión en',
      LOGOUT:        'cerró sesión en',
    };

    const entityMap: Record<string, string> = {
      USER:                    'el usuario',
      USER_PASSWORD:           'la contraseña del usuario',
      USER_PROFILE:            'el perfil del usuario',
      USER_PASSWORD_PROFILE:   'la contraseña del perfil',
      ORGANIZATION:            'la organización',
      SCORE:                   'la matriz de riesgo',
      ROLE:                    'el rol',
      CHAT:                    'el chat',
      COMPLAINT:               'la denuncia',
      COMPLAINT_FILE:          'un archivo para la denuncia',
      COMPLAINT_MESSAGE:       'un mensaje para la denuncia',
      COMPLAINT_MESSAGE_FILE:  'un archivo del chat de la denuncia',
      COMPLAINT_FOLLOWUP:      'un avance del comité interno',
      COMPLAINT_FOLLOWUP_FILE: 'un archivo del comité interno',
      BUSINESS_UNIT:           'la unidad de negocio',
      STATE:                   'el estado',
    };

    const actionLabel = actionMap[action] ?? action.toLowerCase();
    const entityLabel = entityMap[entity] ?? entity.toLowerCase();
    return `${actionLabel} ${entityLabel}`;
  };

  const formatDateTime12h = (dateString: string) => {
    const date  = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    let hours   = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    hours       = hours % 12 || 12;
    return {
      date: `${day}-${month}-${year}`,
      time: `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`,
    };
  };

  const getActionColor = (action: string): string => {
    const colors: Record<ActionKey, string> = {
      READ:          'bg-blue-400',
      CREATE:        'bg-emerald-400',
      UPDATE:        'bg-amber-400',
      DELETE:        'bg-rose-500',
      STATUS_CHANGE: 'bg-indigo-400',
      LOGIN:         'bg-teal-400',
      LOGOUT:        'bg-slate-400',
    };
    return colors[action as ActionKey] ?? 'bg-slate-300';
  };

  const totalPages = Math.max(1, Math.ceil((auditLogs.count ?? 0) / 50));

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col w-full max-w-5xl mx-auto">

      {/* HEADER */}
      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Cadena de Custodia</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">
            REGISTRO DE TRAZABILIDAD
          </p>
        </div>
        <div className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-widest">
          {auditLogs.count ?? 0} EVENTOS
        </div>
      </div>

      {/* LISTADO TIMELINE */}
      <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/30">
        <div className="space-y-6 relative">

          {auditLogs.results?.map((log: AuditLog, index: number) => {
            const { date, time } = formatDateTime12h(log.created_at);
            const userInitials = log.user
              ? log.user.substring(0, 2).toUpperCase()
              : '??';

            return (
              <div key={log.id} className="relative pl-12">

                {/* Línea vertical */}
                {index !== auditLogs.results.length - 1 && (
                  <div className="absolute left-[18px] top-8 bottom-[-24px] w-px bg-slate-200" />
                )}

                {/* Punto */}
                <div className={`absolute left-0 top-2 h-4 w-4 rounded-full ${getActionColor(log.action)} ring-[6px] ring-white shadow-sm`} />

                {/* Card */}
                <div className="bg-white border border-slate-100 rounded-2xl px-6 py-5 hover:shadow-md hover:border-slate-200 transition-all duration-200">
                  <div className="flex flex-col gap-2">

                    {/* Acción */}
                    <span className="text-sm font-bold text-slate-900 tracking-tight">
                      {getAuditDescription(log.action, log.entity)}
                    </span>

                    {log.description && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-900 leading-relaxed whitespace-pre-line">
                        {log.description}
                      </div>
                    )}

                    {/* Usuario + Fecha */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                          {userInitials}
                        </div>
                        <span className="text-slate-700 font-semibold">{log.user} - {getRoleLabel(log.role)}</span>
                      </div>

                      <span className="text-slate-300">•</span>

                      <span>{date} {time}</span>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>

      {/* PAGINADOR */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Página {auditPage} de {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAuditLogs(1)}
            disabled={!auditLogs.previous || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
          >
            Primero
          </button>

          <button
            onClick={() => fetchAuditLogs(auditPage - 1)}
            disabled={!auditLogs.previous || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
          >
            Anterior
          </button>

          <div className="h-8 w-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-[11px] font-black">
            {auditPage}
          </div>

          <button
            onClick={() => fetchAuditLogs(auditPage + 1)}
            disabled={!auditLogs.next || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
          >
            Siguiente
          </button>

          <button
            onClick={() => fetchAuditLogs(totalPages)}
            disabled={!auditLogs.next || loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
          >
            Último
          </button>
        </div>
      </div>

    </div>
  );
};

export default AuditLogList;