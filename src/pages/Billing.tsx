import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CreditCard, Zap, Package, Receipt, ShieldCheck,
  CheckCircle2, Plus, Download, History, Activity,
  Globe, Cpu, TrendingUp, X, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileText, Calendar,
  CheckCircle, Clock, AlertCircle, Search, Filter, ExternalLink, Copy,
  CopyCheck, ArrowUpCircle, Lock, Sparkles, Crown
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp }    from '../context/AppContext';
import { useTenant } from '../context/TenantContext';
import api           from '../utils/api';
import { API_BASE_URL, PRICES } from '../config/api';


// Jerarquía de planes (igual que el backend)
const PLAN_RANK: Record<string, number> = {
  BASIC:        1,
  PROFESSIONAL: 2,
  ENTERPRISE:   3,
};

const PLAN_DISPLAY: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  BASIC:        { label: 'Básico',        icon: Package,  color: 'text-slate-600',  bg: 'bg-slate-100'  },
  PROFESSIONAL: { label: 'Profesional',   icon: Sparkles, color: 'text-blue-600',   bg: 'bg-blue-50'    },
  ENTERPRISE:   { label: 'Empresarial',   icon: Crown,    color: 'text-amber-600',  bg: 'bg-amber-50'   },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id:                 number;
  stripe_invoice_id:  string;
  amount:             string;
  subtotal:           string;
  total:              string;
  currency:           string;
  status:             string;
  created_at:         string;
  hosted_invoice_url: string | null;
  invoice_pdf:        string | null;
  billing_reason:     string;
  collection_method:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatAmount = (total: string | number, currency: string) => {
  if (total == null || total === '') return '—';
  const num = typeof total === 'string' ? parseFloat(total) : total;
  if (isNaN(num)) return '—';
  return `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${(currency ?? 'USD').toUpperCase()}`;
};

const formatCents = (cents: number, currency: string) =>
  `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`;

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagada', OPEN: 'Pendiente', VOID: 'Anulada',
  UNCOLLECTIBLE: 'Vencida', DRAFT: 'Borrador',
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  PAID:          { icon: CheckCircle,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  OPEN:          { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50   border-amber-100'   },
  UNCOLLECTIBLE: { icon: AlertCircle,  color: 'text-rose-600',    bg: 'bg-rose-50    border-rose-100'    },
  VOID:          { icon: AlertCircle,  color: 'text-slate-500',   bg: 'bg-slate-100  border-slate-200'   },
  DRAFT:         { icon: Clock,        color: 'text-slate-400',   bg: 'bg-slate-50   border-slate-100'   },
};

const BILLING_REASON_LABEL: Record<string, string> = {
  subscription_create:    'Alta de suscripción',
  subscription_cycle:     'Renovación de suscripción',
  subscription_update:    'Actualización de suscripción',
  subscription_threshold: 'Ajuste por umbral',
  manual:                 'Cargo manual',
  upcoming:               'Próximo cargo',
};

const COLLECTION_METHOD_LABEL: Record<string, string> = {
  charge_automatically: 'Cargo automático',
  send_invoice:         'Factura enviada',
};

const INCLUDED_FEATURES = [
  'Análisis Forense Ilimitado por nuestra IA personalizada',
  'Soporte Técnico 24/7',
  'Cumplimiento Certificado ISO 37001',
  'Denuncias encriptadas',
  'Almacenamiento Seguro',
]

// ─── FolioBadge ───────────────────────────────────────────────────────────────
const FolioBadge: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };
  return (
    <div className="flex items-center gap-2 group/folio">
      <span className="text-xs font-black text-slate-800 font-mono">{id.length > 10 ? `${id.slice(0, 10)}…` : id}</span>
      <button onClick={handleCopy} title={id} className="opacity-0 group-hover/folio:opacity-100 transition-all p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
        {copied ? <CopyCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
      </button>
    </div>
  );
};

// ─── Paginator ────────────────────────────────────────────────────────────────
interface PaginatorProps { currentPage: number; totalPages: number; onFirst: () => void; onPrev: () => void; onNext: () => void; onLast: () => void; }
const Paginator: React.FC<PaginatorProps> = ({ currentPage, totalPages, onFirst, onPrev, onNext, onLast }) => (
  <div className="flex items-center justify-center gap-2">
    <button disabled={currentPage === 1}          onClick={onFirst} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsLeft  size={16} /></button>
    <button disabled={currentPage === 1}          onClick={onPrev}  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft   size={16} /></button>
    <span className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl min-w-[90px] text-center">{currentPage} / {totalPages}</span>
    <button disabled={currentPage === totalPages} onClick={onNext}  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight  size={16} /></button>
    <button disabled={currentPage === totalPages} onClick={onLast}  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronsRight size={16} /></button>
  </div>
);

// ─── ChangePlanModal ──────────────────────────────────────────────────────────
interface ChangePlanModalProps {
  isOpen:       boolean;
  onClose:      () => void;
  currentPlanName: string;// e.g. "BASIC"
  currentFreq: 'MONTHLY' | 'ANNUAL' | null;
  portal:       string;
  onSuccess:    () => void;
}

const ChangePlanModal: React.FC<ChangePlanModalProps> = ({ isOpen, onClose, currentPlanName, currentFreq, portal, onSuccess }) => {
  const [billingFreq, setBillingFreq] = useState<'MONTHLY' | 'ANNUAL'>(
    currentFreq ?? 'MONTHLY'
  );
  const [selectedPriceId, setSelected]  = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [confirmStep, setConfirmStep]   = useState(false);

  const currentRank = PLAN_RANK[currentPlanName] ?? 0;

  // Filtra solo los precios de la frecuencia elegida
  const prices = useMemo(
    () => PRICES.filter(p => p.frequency === billingFreq),
    [billingFreq],
  );

  const selectedPrice = PRICES.find(p => p.id === selectedPriceId);

  const isCurrent = (price: typeof PRICES[number]) => price.planName === currentPlanName &&price.frequency === currentFreq;
  const isDowngrade = (planName: string) => PLAN_RANK[planName] < currentRank;
  const canUpgrade = (price: typeof PRICES[number]) => {
    const newRank = PLAN_RANK[price.planName];

    if (newRank > currentRank) return true;

    if (
      newRank === currentRank &&
      currentFreq === 'MONTHLY' &&
      price.frequency === 'ANNUAL'
    ) {
      return true;
    }

    return false;
  };

  const handleConfirm = async () => {
    if (!selectedPriceId) return;
    setIsLoading(true);
    try {
      const url = `${portal}/api/v1/payments/subscription/update-plan/`;
      await api.post(`${API_BASE_URL}/` + url, { price_id: selectedPriceId });
      toast.success('¡Plan actualizado correctamente!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Error al cambiar el plan. Inténtalo de nuevo.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setConfirmStep(false);
    }
  };

  useEffect(() => {
    if (currentFreq) {
      setBillingFreq(currentFreq);
    }
  }, [currentFreq]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in slide-in-from-bottom-10">

        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl"><ArrowUpCircle className="text-blue-400" size={26} /></div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Cambiar Plan</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Solo puedes actualizar a planes superiores o cambiar de mensual a anual.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 text-white transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Frequency toggle */}
        <div className="flex justify-center pt-8 pb-2">
          <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1">
            {(['MONTHLY', 'ANNUAL'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setBillingFreq(f); setSelected(null); setConfirmStep(false); }}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  billingFreq === f
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f === 'MONTHLY' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-8 py-6">
          {prices.map((price) => {
            const upgrade = canUpgrade(price);
            const current = isCurrent(price);
            const downgrade = isDowngrade(price.planName);
            const display   = PLAN_DISPLAY[price.planName];
            const PlanIcon  = display.icon;
            const selected  = selectedPriceId === price.id;

            return (
              <button
                key={price.id}
                onClick={() => { if (upgrade) { setSelected(price.id); setConfirmStep(false); } }}
                disabled={!upgrade}
                className={`
                  relative text-left p-6 rounded-3xl border-2 transition-all
                  ${selected
                    ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
                    : upgrade
                      ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md cursor-pointer'
                      : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                  }
                `}
              >
                {/* Badge */}
                {current && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Actual
                  </span>
                )}
                {downgrade && (
                  <span className="absolute top-4 right-4">
                    <Lock size={14} className="text-slate-300" />
                  </span>
                )}
                {upgrade && selected && (
                  <span className="absolute top-4 right-4 text-[9px] font-bold bg-blue-500 text-white px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Seleccionado
                  </span>
                )}

                <div className={`inline-flex p-2.5 rounded-xl mb-4 ${display.bg}`}>
                  <PlanIcon size={18} className={display.color} />
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{display.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCents(price.unit_amount, price.currency)}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-1">
                  / {price.interval === 'month' ? 'mes' : 'año'}
                </p>

                {upgrade && (
                  <div className="mt-4 flex items-center gap-1.5 text-blue-600 text-[11px] font-bold">
                    <ArrowUpCircle size={12} />
                    <span>Mejora disponible</span>
                  </div>
                )}
                {downgrade && (
                  <div className="mt-4 flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Lock size={12} />
                    <span>No disponible</span>
                  </div>
                )}
                {current && (
                  <div className="mt-4 flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold">
                    <CheckCircle2 size={12} />
                    <span>Plan vigente</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm step */}
        {selectedPriceId && selectedPrice && !confirmStep && (
          <div className="mx-8 mb-6 p-5 bg-blue-50 border border-blue-100 rounded-3xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Cambiar de <span className="text-slate-400">{PLAN_DISPLAY[currentPlanName]?.label}</span> → <span className="text-blue-600">{PLAN_DISPLAY[selectedPrice.planName]?.label}</span>
              </p>
            </div>
            <button
              onClick={() => setConfirmStep(true)}
              className="flex-shrink-0 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Final confirmation */}
        {confirmStep && selectedPrice && (
          <div className="mx-8 mb-8 p-6 bg-slate-900 rounded-3xl text-white">
            <p className="text-sm font-bold mb-3">¿Confirmar actualización de plan?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmStep(false)}
                className="flex-1 py-3 bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 py-3 bg-blue-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ArrowUpCircle size={14} /> Confirmar Upgrade</>
                }
              </button>
            </div>
          </div>
        )}

        {!selectedPriceId && (
          <p className="text-center text-xs text-slate-400 pb-8">
            Selecciona un plan superior para continuar
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Main Billing ─────────────────────────────────────────────────────────────
const Billing: React.FC = () => {
  const { billing, buyAiCredits } = useApp();
  const { portal }                = useTenant();
  const [paymentMethod, setPaymentMethod] = useState<any | null>(null);
  const [onTrial, setOnTrial] = useState(true);
  const [currentPlanName, setCurrentPlanName] = useState<any | null>(null);
  const [currentFreq, setCurrentFreq] = useState<'MONTHLY' | 'ANNUAL' | null>(null);
  const [nextPaymentDate, setNextPaymentDate] = useState<any | null>(null);
  const [isBuying,              setIsBuying]              = useState(false);
  const [isInvoiceModalOpen,    setIsInvoiceModalOpen]    = useState(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [invoices,              setInvoices]              = useState<Invoice[]>([]);
  const [invoicesCount,         setInvoicesCount]         = useState(0);
  const [invoicesNext,          setInvoicesNext]          = useState<string | null>(null);
  const [invoicesPrev,          setInvoicesPrev]          = useState<string | null>(null);
  const [maxForensicAnalyses,   setMaxForensicAnalyses] = useState<number | null>(null);
  const [forensicAnalysesUsed,     setForensicAnalysesUsed] = useState<number | null>(null);
  const [currentPage,           setCurrentPage]           = useState(1);
  const [isLoadingInvoices,     setIsLoadingInvoices]     = useState(false);
  const [searchInvoice,         setSearchInvoice]         = useState('');
  const [statusFilter,          setStatusFilter]          = useState('all');

  const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
};

  const currentPrice = useMemo(() => {
    if (!currentPlanName || !currentFreq) return null;

    return PRICES.find(
      p => p.planName === currentPlanName && p.frequency === currentFreq
    );
  }, [currentPlanName, currentFreq]);

  const PAGE_SIZE  = 25;
  const totalPages = Math.max(1, Math.ceil(invoicesCount / PAGE_SIZE));
  const creditsPercentage = Math.round((billing.aiCredits.used / billing.aiCredits.total) * 100);
  const usedPercentage = maxForensicAnalyses > 0 ? Math.round((forensicAnalysesUsed / maxForensicAnalyses) * 100): 0;

  const openBillingPortal = async () => {
    try {
      const url = `${portal}/api/v1/payments/billing-portal/`;
      const res = await api.post(`${API_BASE_URL}/` + url);
      window.location.href = res.data.url;
    } catch { toast.error('Error al abrir el portal de facturación.'); }
  };

  const fetchInvoices = async (page = 1) => {
    setIsLoadingInvoices(true);
    try {
      const res = await api.get(`${API_BASE_URL}/${portal}/api/v1/payments/invoices/`, {
        params: { page, page_size: PAGE_SIZE },
      });
      setInvoices(res.data.results   ?? []);
      setInvoicesCount(res.data.count   ?? 0);
      setInvoicesNext(res.data.next     ?? null);
      setInvoicesPrev(res.data.previous ?? null);
      setCurrentPage(page);
    } catch {
      toast.error('Error al obtener las facturas.');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (!portal) return;

    const controller = new AbortController();

    const init = async () => {
      try {
        const [invoicesRes, paymentRes, planRes] = await Promise.allSettled([
          api.get(`${API_BASE_URL}/${portal}/api/v1/payments/invoices/`, {
            signal: controller.signal,
            params: { page: 1, page_size: PAGE_SIZE },
          }),
          api.get(`${API_BASE_URL}/${portal}/api/v1/payments/payment-methods/payment-method/`, {
            signal: controller.signal,
          }),
          api.get(`${API_BASE_URL}/${portal}/api/v1/payments/billing-detail/`, {
            signal: controller.signal,
          }),
        ]);

        if (invoicesRes.status === 'fulfilled') {
          setInvoices(invoicesRes.value.data.results   ?? []);
          setInvoicesCount(invoicesRes.value.data.count   ?? 0);
          setInvoicesNext(invoicesRes.value.data.next     ?? null);
          setInvoicesPrev(invoicesRes.value.data.previous ?? null);
          setCurrentPage(1);
        }

        if (paymentRes.status === 'fulfilled') {
          setPaymentMethod(paymentRes.value.data);
        }

        if (planRes.status === 'fulfilled') {
          const d = planRes.value.data;
          setCurrentPlanName(d.plan_type);
          setCurrentFreq(d.interval);
          setOnTrial(d.on_trial);
          setMaxForensicAnalyses(d.max_forensic_analyses);
          setForensicAnalysesUsed(d.forensic_analyses_used);
          const date = new Date(d.current_period_end * 1000);
          setNextPaymentDate(date.toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric',
            timeZone: 'America/Mexico_City',
          }));
        }

      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
      }
    };

    init();
    return () => controller.abort();

  }, [portal]);

  const goFirst = () => fetchInvoices(1);
  const goPrev  = () => { if (invoicesPrev) fetchInvoices(currentPage - 1); };
  const goNext  = () => { if (invoicesNext) fetchInvoices(currentPage + 1); };
  const goLast  = () => fetchInvoices(totalPages);

  const filteredInvoices = useMemo(() => {
    const q = searchInvoice.toLowerCase();
    return invoices.filter(inv => {
      const matchSearch =
        (inv.stripe_invoice_id ?? '').toLowerCase().includes(q) ||
        (BILLING_REASON_LABEL[inv.billing_reason] ?? inv.billing_reason ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchInvoice, statusFilter]);

  const handleBuyCredits = () => {
    setIsBuying(true);
    setTimeout(() => { buyAiCredits(100); setIsBuying(false); }, 1500);
  };

  // Si el usuario ya está en el plan más alto, deshabilitar botón
  const isMaxPlan = currentPlanName === 'ENTERPRISE' && currentFreq === 'ANNUAL';

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-900 text-white rounded-lg shadow-lg"><CreditCard size={20} /></div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Centro de Suscripción</h1>
          </div>
          <p className="text-slate-500 font-medium">Gestiona tus facturas, métodos de pago y plan corporativo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT */}
        <div className="lg:col-span-8 space-y-8">

          {/* Plan card */}
          <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10">
              <div className="space-y-6 max-w-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/30">
                    <Package size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Plan Contratado</span>
                  </div>

                  {onTrial && (
                    <div className="inline-flex items-center gap-2.5 bg-amber-500/15 text-amber-300 px-4 py-1.5 rounded-full border border-amber-500/25">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Período de prueba activo</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter">
                    {PLAN_DISPLAY[currentPlanName]?.label ?? billing.planName}
                  </h2>
                  <p className="text-slate-400 mt-2 text-sm">
                    Tu suscripción está <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Activa</span> hasta el {nextPaymentDate}.
                  </p>
                </div>
                <div className="pt-4 flex flex-wrap gap-3">
                  {(currentPrice?.features ?? []).slice(0, 4).map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 text-[11px] font-medium text-slate-300">
                      <CheckCircle2 size={12} className="text-blue-500" /> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 flex flex-col items-center justify-center text-center min-w-[200px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Inversión Mensual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    {currentPrice ? (currentPrice.unit_amount / 100).toLocaleString('es-MX') : billing.price}
                  </span>
                  <span className="text-sm font-bold text-slate-500">
                    {currentPrice?.currency?.toUpperCase() ?? billing.currency}
                  </span>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    / {currentFreq === 'MONTHLY' ? 'mes' : 'año'}
                  </p>
                </div>

                {/* CAMBIAR PLAN button — solo si no es el plan máximo */}
                {isMaxPlan ? (
                  <div className="mt-8 w-full py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-[10px] font-bold flex items-center justify-center gap-2">
                    <Crown size={13} /> PLAN MÁS ALTO
                  </div>
                ) : (
                  <button
                    onClick={() =>{setIsChangePlanModalOpen(true) }}
                    className="mt-8 w-full py-3 bg-white text-slate-900 rounded-2xl font-bold text-xs hover:bg-blue-400 hover:text-white transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                  >
                    <ArrowUpCircle size={14} /> MEJORAR PLAN
                  </button>
                )}
              </div>
            </div>
            <Globe size={300} className="absolute -bottom-20 -right-20 text-white/[0.03] animate-spin-slow" />
          </div>

          {/* AI Credits */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <Cpu size={22} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Usos de análisis forenses</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Capacidad de análisis automatizado del mes</p>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                usedPercentage > 80
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {usedPercentage > 80 ? 'Recursos bajos' : 'Disponibilidad alta'}
              </span>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: 'Usados',      value: forensicAnalysesUsed,                       color: 'text-slate-900' },
                { label: 'Disponibles', value: maxForensicAnalyses - forensicAnalysesUsed, color: 'text-emerald-600' },
                { label: 'Máximo',      value: maxForensicAnalyses,                        color: 'text-slate-900' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Barra */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-400">Uso del período</p>
                <p className="text-xs font-bold text-slate-700">{usedPercentage}%</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    usedPercentage > 80 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-slate-300">0</span>
                <span className="text-[10px] text-slate-300">{maxForensicAnalyses} análisis / mes</span>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-4 space-y-8">

          {/* Payment */}
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Método de Pago Predeterminado</h3>
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl p-6 border border-white shadow-inner flex flex-col h-44 justify-between relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div className="text-2xl font-black italic text-slate-800 tracking-tighter">{paymentMethod ? 'VISA' : '—'}</div>
                <div className="w-10 h-6 bg-amber-400/20 rounded-md border border-amber-400/30" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-mono font-bold text-slate-500 tracking-widest">•••• •••• •••• {paymentMethod?.last_four_digits ?? '----'}</p>
                <div className="mt-4">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Expira</p>
                  <p className="text-xs font-bold text-slate-800">{paymentMethod?.exp_month ? String(paymentMethod.exp_month).padStart(2, '0') : '--'} / {paymentMethod?.exp_year?.toString().slice(-2) ?? '--'}</p>
                </div>
              </div>
              <TrendingUp size={120} className="absolute -right-10 -bottom-10 text-slate-900/[0.03] group-hover:scale-110 transition-transform" />
            </div>
            <button onClick={openBillingPortal} className="w-full mt-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold text-slate-600 hover:bg-white hover:border-blue-300 transition-all uppercase tracking-widest">
              Gestionar Tarjetas
            </button>
          </div>

          {/* Scope */}
          <div className="bg-emerald-600 text-white rounded-[40px] p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <ShieldCheck size={20} className="text-emerald-200" />
                <h4 className="text-[10px] font-bold uppercase tracking-widest">Incluye</h4>
              </div>
              <ul className="space-y-4">
                {INCLUDED_FEATURES.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px]">✓</div>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <Activity size={150} className="absolute -bottom-10 -left-10 text-white/[0.05]" />
          </div>

          {/* Recent invoices */}
          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <History size={14} />Historial Reciente
            </h3>
            {isLoadingInvoices ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white">
                        <Receipt size={16} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 font-mono">{(inv.stripe_invoice_id ?? `#${inv.id}`).slice(0, 10)}…</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(inv.created_at)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-700">{formatAmount(inv.total, inv.currency)}</span>
                  </div>
                ))}
                {invoices.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin facturas registradas.</p>}
              </div>
            )}
            <button
              onClick={() => { setSearchInvoice(''); setStatusFilter('all'); setIsInvoiceModalOpen(true); }}
              className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95"
            >
              <FileText size={14} /> VER TODAS LAS FACTURAS
            </button>
          </div>
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────────────────────────── */}

      {/* Change Plan Modal */}
      <ChangePlanModal
        isOpen={isChangePlanModalOpen}
        onClose={() => setIsChangePlanModalOpen(false)}
        currentPlanName={currentPlanName}
        currentFreq={currentFreq}   // 👈 PASARLO
        portal={portal}
        onSuccess={() => {
          fetchInvoices(1);
        }}
      />

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-5xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl"><FileText className="text-blue-400" size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Historial de Facturación</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    {invoicesCount} registro{invoicesCount !== 1 ? 's' : ''} en total
                    {filteredInvoices.length !== invoices.length && ` · ${filteredInvoices.length} filtrados`}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 text-white transition-all"><X size={24} /></button>
            </div>

            <div className="px-8 pt-8 pb-4 flex flex-col sm:flex-row gap-4 border-b border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
                <input type="text" placeholder="Buscar por folio o concepto..." value={searchInvoice} onChange={e => setSearchInvoice(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-300 transition-all" />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest focus:outline-none">
                  <option value="all">Todos</option>
                  <option value="PAID">Pagada</option>
                  <option value="OPEN">Pendiente</option>
                  <option value="UNCOLLECTIBLE">Vencida</option>
                  <option value="VOID">Anulada</option>
                  <option value="DRAFT">Borrador</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[42vh] overflow-y-auto px-2">
              {isLoadingInvoices ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" /></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-sm text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-5">Folio</th><th className="px-6 py-5">Fecha</th><th className="px-6 py-5">Concepto</th>
                      <th className="px-6 py-5">Método cobro</th><th className="px-6 py-5">Importe</th><th className="px-6 py-5">Estado</th><th className="px-6 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredInvoices.length > 0 ? filteredInvoices.map(inv => {
                      const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG['OPEN'];
                      const StatusIcon = cfg.icon;
                      return (
                        <tr key={inv.id} className="group hover:bg-slate-50/80 transition-all">
                          <td className="px-6 py-5"><FolioBadge id={inv.stripe_invoice_id ?? `#${inv.id}`} /></td>
                          <td className="px-6 py-5"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Calendar size={12} /> {formatDate(inv.created_at)}</div></td>
                          <td className="px-6 py-5"><span className="text-xs font-semibold text-slate-700">{BILLING_REASON_LABEL[inv.billing_reason] ?? inv.billing_reason ?? '—'}</span></td>
                          <td className="px-6 py-5"><span className="text-xs font-medium text-slate-500">{COLLECTION_METHOD_LABEL[inv.collection_method] ?? inv.collection_method ?? '—'}</span></td>
                          <td className="px-6 py-5"><span className="text-sm font-black text-slate-900">{formatAmount(inv.total, inv.currency)}</span></td>
                          <td className="px-6 py-5">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest ${cfg.bg} ${cfg.color}`}>
                              <StatusIcon size={11} /> {STATUS_LABEL[inv.status] ?? inv.status}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {inv.invoice_pdf && <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" title="Descargar PDF" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm"><Download size={14} /></a>}
                              {inv.hosted_invoice_url && <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" title="Ver en Stripe" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all shadow-sm"><ExternalLink size={14} /></a>}
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={7} className="px-8 py-20 text-center"><div className="flex flex-col items-center gap-3 text-slate-400"><FileText size={32} strokeWidth={1} /><p className="text-sm font-medium">No se encontraron facturas.</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-5">
              <p className="text-[10px] text-slate-400 font-medium text-center italic">
                Página {currentPage} de {totalPages} · {invoicesCount} registros en total
              </p>
              <Paginator currentPage={currentPage} totalPages={totalPages} onFirst={goFirst} onPrev={goPrev} onNext={goNext} onLast={goLast} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 60s linear infinite; }
      `}</style>
    </div>
  );
};

export default Billing;