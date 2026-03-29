import React, { useState, useEffect, useRef } from 'react'; // ← agrega useEffect
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Shield, AlertTriangle, CreditCard, ArrowLeft, Check, X, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PRICES, API_BASE_URL } from '../config/api';
import { toast, Toaster } from 'sonner';
import axios from 'axios';

// ─── Jerarquía de planes ──────────────────────────────────────────────────────
const PLAN_RANK: Record<string, number> = {
  BASIC:        1,
  PROFESSIONAL: 2,
  ENTERPRISE:   3,
};

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ReactivateModalProps {
  isOpen:      boolean;
  onClose:     () => void;
  priceId:     string;
  planName:    string;
  portal: string;
  onSuccess:   () => void;
}

const ReactivateModal: React.FC<ReactivateModalProps> = ({
  isOpen, onClose, priceId, planName, portal, onSuccess,
}) => {
  const [username,     setUsername]     = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  const handleReactivate = async () => {
    if (!username || !password) { toast.error('Completa todos los campos.'); return; }
    setIsLoading(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/accounts/api/v1/reactivate-organization/`,
        { username:username, password:password, portal: portal, price_id: priceId },
      );
      toast.success('¡Organización reactivada! Redirigiendo...');
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ??
        err?.response?.data?.msg ??
        'Error al reactivar. Verifica tus credenciales.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] shadow-2xl animate-in slide-in-from-bottom-6 fade-in duration-300"
        style={{ background: 'linear-gradient(145deg, #0f172a 0%, #0B1120 60%, #0d1526 100%)', border: '1px solid rgba(99,102,241,0.2)' }}
      >
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #06b6d4, #10b981)' }} />

        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-blue-500 blur-md opacity-40" />
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl">
                <Shield size={22} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-white font-black text-xl tracking-tight">Reactivar organización</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  Plan {planName} seleccionado
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="mx-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        <div className="grid grid-cols-5 gap-0">
          <div className="col-span-2 px-8 py-7 flex flex-col gap-5" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-gray-400 text-xs leading-relaxed">
              Ingresa las credenciales del administrador para recuperar el acceso a tu portal.
            </p>
            <div className="rounded-xl px-4 py-3 mt-auto" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300/70 text-[11px] leading-relaxed">
                  La reactivación tarda unos minutos. Solo el <span className="text-amber-300 font-bold">DUEÑO</span> de la organización tiene permisos para reactivar.
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-3 px-8 py-7 flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">
                <span className="w-3 h-px bg-blue-500" /> Usuario
              </label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="JohnDoe" maxLength={30} autoComplete="username"
                className="w-full px-4 py-3.5 rounded-2xl text-white text-sm font-medium placeholder:text-gray-700 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: username ? '1.5px solid rgba(59,130,246,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: username ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">
                <span className="w-3 h-px bg-blue-500" /> Contraseña
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••••"
                  maxLength={128} autoComplete="current-password"
                  onKeyDown={e => e.key === 'Enter' && handleReactivate()}
                  className="w-full px-4 py-3.5 pr-12 rounded-2xl text-white text-sm font-medium placeholder:text-gray-700 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: password ? '1.5px solid rgba(59,130,246,0.6)' : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: password ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button onClick={handleReactivate} disabled={isLoading || !username || !password}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] mt-1"
              style={{
                background: isLoading || !username || !password
                  ? 'rgba(255,255,255,0.05)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                boxShadow: isLoading || !username || !password
                  ? 'none'
                  : '0 8px 32px rgba(59,130,246,0.35), 0 0 0 1px rgba(59,130,246,0.3)',
                color: '#fff',
              }}
            >
              {isLoading
                ? <><Loader2 size={16} className="animate-spin" /> Reactivando...</>
                : <><Lock size={14} /> Reactivar organización</>
              }
            </button>
            <p className="text-center text-gray-700 text-[11px]">Al confirmar aceptas los términos del plan</p>
          </div>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
};

// ─── Reactivate Page ──────────────────────────────────────────────────────────
const PLANS_CONFIG = [
  { planKey: 'BASIC',        name: 'Business Basic', description: 'Ideal para PYMES que inician su proceso de cumplimiento.', highlight: false, buttonText: 'Seleccionar plan' },
  { planKey: 'PROFESSIONAL', name: 'Business Pro',   description: 'Control avanzado para empresas en crecimiento.',          highlight: true,  buttonText: 'Seleccionar plan' },
  { planKey: 'ENTERPRISE',   name: 'Enterprise',     description: 'Solución integral para grandes corporativos y holdings.', highlight: false, buttonText: 'Seleccionar plan' },
];

const Reactivate: React.FC = () => {
  const navigate                        = useNavigate();
  const [searchParams]                  = useSearchParams();
  const { portal: portalFromContext, isCustomDomain } = useTenant();
  const [isAnnual,       setIsAnnual]   = useState(false);
  const [selectedPriceId, setSelected]  = useState<string | null>(null);
  const [isModalOpen,    setIsModalOpen] = useState(false);

  const [prevPlanType,  setPrevPlanType]  = useState<string | null>(null);
  const [prevInterval,  setPrevInterval]  = useState<string | null>(null);
  const [loadingPrice,  setLoadingPrice]  = useState(true);

  // ✅ Portal desde searchParams, contexto, o URL directamente
  const portalFromSearch = searchParams.get('portal');
  const portalFromPath   = (() => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const first    = segments[0];
    const excluded = ['reactivate', 'reactivate-organization', 'gateway', 'register', 'success'];
    return excluded.includes(first) ? null : first;
  })();
  const portal = portalFromSearch ?? portalFromContext ?? portalFromPath ?? '';

  const freq          = isAnnual ? 'ANNUAL' : 'MONTHLY';
  const prices        = PRICES.filter(p => p.frequency === freq);
  const selectedPrice = PRICES.find(p => p.id === selectedPriceId);

  const handleGoBack  = () => navigate('/');
  const handleSuccess = () => navigate('/');
  const getPriceForPlan = (planKey: string) => prices.find(p => p.planName === planKey);

  const fetchedRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
  if (!portal || fetchedRef.current) return;

  const authorized = (location.state as any)?.authorized;
  if (!authorized) {
    navigate('/', { replace: true });
    return; // ← agrega return para no continuar con el fetch
  }

  fetchedRef.current = true;

  axios.get(`${API_BASE_URL}/accounts/api/v1/retrieve-price/${portal}/`)
    .then(res => {
      setPrevPlanType(res.data.plan_type);
      setPrevInterval(res.data.interval);
    })
    .catch(() => {})
    .finally(() => setLoadingPrice(false));

  }, [portal]);

  // ── Lógica de disponibilidad ──────────────────────────────────────────────
  const isAvailable = (planKey: string, frequency: 'MONTHLY' | 'ANNUAL'): boolean => {
    if (!prevPlanType) return true;

    const prevRank = PLAN_RANK[prevPlanType] ?? 0;
    const newRank  = PLAN_RANK[planKey]      ?? 0;

    // Normalizar a mayúsculas por si acaso
    const normalizedPrevInterval = prevInterval?.toUpperCase() ?? '';
    const normalizedFrequency    = frequency.toUpperCase();

    // Plan superior → siempre disponible
    if (newRank > prevRank) return true;

    // Mismo plan
    if (newRank === prevRank) {
        // Si tenía ANNUAL → solo puede elegir ANNUAL
        if (normalizedPrevInterval === 'ANNUAL' && normalizedFrequency === 'MONTHLY') return false;
        return true;
    }

    // Plan inferior → NO
    return false;
};

  if (loadingPrice) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border border-gray-800" />
            <div className="absolute inset-0 rounded-full border-t border-blue-500 animate-spin" />
            <Shield className="absolute inset-0 m-auto w-5 h-5 text-blue-400" />
          </div>
          <p className="text-gray-600 text-xs tracking-widest uppercase">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans selection:bg-blue-500">
      <Toaster position="bottom-right" richColors theme="dark" closeButton />

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-gray-800 sticky top-0 bg-[#0B1120]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Shield size={22} /></div>
          <span className="text-xl font-bold tracking-tight">SecureWhistle</span>
        </div>
        <button onClick={handleGoBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors">
          <ArrowLeft size={15} /> Volver a inicio
        </button>
      </nav>

      {/* Hero */}
      <header className="px-6 pt-16 pb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-start gap-3 bg-red-900/20 border border-red-500/30 px-5 py-3 rounded-2xl text-left mb-8">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Organización desactivada</p>
            <p className="text-red-400/70 text-xs mt-0.5 leading-relaxed">
              El portal <span className="font-bold text-red-300">{portal}</span> ha sido suspendido.
              Elige un plan para recuperar el acceso.
            </p>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight leading-tight">
          Reactiva tu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            organización
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
          Selecciona el plan que necesitas y confirma con las credenciales del administrador.
        </p>

        {/* Badge plan anterior */}
        {prevPlanType && (
        <div className="mt-6 inline-flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full">
            <span className="text-gray-500 text-xs">Plan anterior:</span>
            <span className="text-white text-xs font-bold">
            {prevPlanType} - {prevInterval === 'MONTHLY' ? 'Mensual' : 'Anual'}  {/* ← MONTHLY en mayúsculas */}
            </span>
            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
            No puedes bajar de plan
            </span>
        </div>
        )}
      </header>

      {/* Pricing */}
      <section className="px-6 pb-24 bg-[#0F172A]">
        <div className="max-w-6xl mx-auto">

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mb-14 pt-10">
            <span className={`text-sm ${!isAnnual ? 'text-white font-bold' : 'text-gray-500'}`}>Mensual</span>
            <button onClick={() => { setIsAnnual(!isAnnual); setSelected(null); }}
              className="w-14 h-7 bg-gray-700 rounded-full p-1 transition-colors duration-300 focus:outline-none">
              <div className={`w-5 h-5 bg-blue-500 rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm ${isAnnual ? 'text-white font-bold' : 'text-gray-500'}`}>Anual</span>
            <span className="ml-1 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-500/20">
              Ahorra 20%
            </span>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS_CONFIG.map((plan) => {
              const price      = getPriceForPlan(plan.planKey);
              const isSelected = selectedPriceId === price?.id;
              const available  = price ? isAvailable(plan.planKey, freq) : false;

              return (
                <div
                  key={plan.planKey}
                  className={`relative p-8 rounded-3xl border text-left transition-all duration-300 ${
                    !available
                      ? 'opacity-35 cursor-not-allowed border-gray-800 bg-[#111827]'
                      : isSelected
                        ? 'bg-gradient-to-b from-blue-900/40 to-[#0F172A] border-blue-400 shadow-2xl shadow-blue-900/30 scale-105 z-10 cursor-pointer'
                        : plan.highlight
                          ? 'bg-gradient-to-b from-[#1E293B] to-[#0F172A] border-blue-500 shadow-2xl shadow-blue-900/20 scale-105 z-10 cursor-pointer hover:-translate-y-1'
                          : 'bg-[#111827] border-gray-800 hover:border-gray-600 cursor-pointer hover:-translate-y-1'
                  }`}
                >
                  {/* Badges */}
                  {!available && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full text-gray-500 whitespace-nowrap flex items-center gap-1.5">
                      <Lock size={10} /> No disponible
                    </span>
                  )}
                  {available && isSelected && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full text-white whitespace-nowrap">
                      Seleccionado
                    </span>
                  )}
                  {available && !isSelected && plan.highlight && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full text-white whitespace-nowrap">
                      Recomendado
                    </span>
                  )}

                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>

                  <div className="mb-4">
                    {price ? (
                      <>
                        <span className="text-4xl font-bold">${(price.unit_amount / 100).toLocaleString('es-MX')}</span>
                        <span className="text-gray-400 ml-2 text-sm">{price.currency.toUpperCase()}/mes</span>
                        {isAnnual && <p className="text-xs text-blue-400 mt-1 font-medium">Facturado anualmente</p>}
                      </>
                    ) : (
                      <span className="text-gray-600 text-sm">No disponible</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-6 min-h-[36px]">{plan.description}</p>

                  <ul className="space-y-3 mb-8 text-sm">
                    {(price?.features ?? []).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-gray-300">
                        <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={!available || !price}
                    onClick={() => available && price && setSelected(price.id)}
                    className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 ${
                      !available
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : isSelected
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/40'
                          : plan.highlight
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/40'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    }`}
                  >
                    {!available
                      ? <span className="flex items-center justify-center gap-2"><Lock size={13} /> No disponible</span>
                      : isSelected ? '✓ Seleccionado' : plan.buttonText
                    }
                  </button>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          {selectedPrice && (
            <div className="mt-12 max-w-lg mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-6 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <p className="text-white font-bold">Plan seleccionado</p>
                <p className="text-gray-400 text-sm mt-0.5">
                  ${(selectedPrice.unit_amount / 100).toLocaleString('es-MX')} {selectedPrice.currency.toUpperCase()} / {selectedPrice.interval === 'month' ? 'mes' : 'año'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(true)}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-xl shadow-blue-900/40 active:scale-95">
                <CreditCard size={15} /> Reactivar ahora
              </button>
            </div>
          )}

          {!selectedPrice && (
            <p className="text-center text-gray-600 text-sm mt-10">Selecciona un plan para continuar</p>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center border-t border-gray-800 bg-[#0B1120]">
        <p className="text-gray-600 uppercase tracking-widest text-xs font-bold mb-6">Certificados bajo estándares internacionales</p>
        <div className="flex flex-wrap justify-center gap-8 opacity-40">
          <div className="text-sm font-bold">ISO 37001</div>
          <div className="text-sm font-bold">GDPR COMPLIANT</div>
          <div className="text-sm font-bold">SOC2 TYPE II</div>
        </div>
      </footer>

      <ReactivateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        priceId={selectedPriceId ?? ''}
        planName={selectedPrice?.planName ?? ''}
        portal={portal}
        onSuccess={handleSuccess}
        />
    </div>
  );
};

export default Reactivate;