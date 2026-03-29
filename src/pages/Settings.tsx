import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import {ROLE_DEFINITIONS} from '../constants';
import api from '../utils/api';
import { useTenant } from '../context/TenantContext';
import { toast, Toaster } from 'sonner';
import { clearToken } from '../utils/tokenStore';

const steps = [
  { id: 1, label: "Ingresar dominio" },
  { id: 2, label: "Configurar DNS" },
  { id: 3, label: "Verificar" },
];

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

// ── Fila DNS copiable ─────────────────────────────────────────────────────────
const DnsRow = ({ col, val, copyKey, copied, onCopy }: {
  col: string; val: string; copyKey: string;
  copied: string | null; onCopy: (val: string, key: string) => void;
}) => {
  const isCopied = copied === copyKey;
  return (
    <div
      onClick={() => onCopy(val, copyKey)}
      title="Clic para copiar"
      style={{
        display: "grid", gridTemplateColumns: "140px 1fr 36px",
        alignItems: "center", padding: "9px 16px",
        cursor: "pointer", transition: "background 0.15s",
        background: isCopied ? "#f0faf4" : "transparent",
      }}
      onMouseEnter={e => { if (!isCopied) (e.currentTarget as HTMLDivElement).style.background = "#f8f9fb"; }}
      onMouseLeave={e => { if (!isCopied) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
    >
      <span style={{ fontSize: 12, color: "#8a94a6", fontWeight: 500 }}>{col}</span>
      <code style={{
        fontSize: 13, color: isCopied ? "#1a7a4a" : "#1a2332",
        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
        background: isCopied ? "#eaf6f0" : "#f4f6f9",
        padding: "2px 8px", borderRadius: 4,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        transition: "all 0.2s",
      }}>{val}</code>
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        color: isCopied ? "#1a7a4a" : "#c0c8d4", transition: "color 0.2s",
      }}>
        {isCopied ? <CheckIcon size={14} /> : <CopyIcon />}
      </span>
    </div>
  );
};

export default function Settings() {
  const { portal, isCustomDomain } = useTenant();
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  const navigate = useNavigate();

  // ── Domain state ─────────────────────────────────────────────────────────────
  const [step,              setStep]              = useState(1);
  const [domain,            setDomain]            = useState("");
  const [verifyToken,       setVerifyToken]       = useState("");
  const [verifying,         setVerifying]         = useState(false);
  const [verifyStatus,      setVerifyStatus]      = useState<'success' | 'error' | null>(null);
  const [verifyError,       setVerifyError]       = useState("");
  const [copied,            setCopied]            = useState<string | null>(null);
  const [activeDomain,      setActiveDomain]      = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingInitial,    setLoadingInitial]    = useState(true);
  const [loadingContinue,   setLoadingContinue]   = useState(false);
  const [deletingDomain,    setDeletingDomain]    = useState(false);
  const [apiError,          setApiError]          = useState("");

  // ── Subscription state ───────────────────────────────────────────────────────
  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false);
  const [cancellingPlan,     setCancellingPlan]     = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(true); // asumir activa hasta saber

  // ── Fetch domain on mount ────────────────────────────────────────────────────
 useEffect(() => {
  if (!portal) return;

  const controller = new AbortController();

  const load = async () => {
    try {
      const res = await api.get(
        `${API_BASE_URL}/${portal}/api/v1/organization-settings/domain/`,
        { signal: controller.signal }
      );
      const data = res.data;
      if (data?.domain) {
        setActiveDomain(data.domain);
        setDomain(data.domain);
        if (data.domain_verified) {
          setStep(99);
        } else {
          setVerifyToken(data.domain_verify_token ?? "");
          setStep(2);
        }
      }
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      if (err?.response?.status !== 404) {
        setApiError("Error al cargar la configuración. Intenta de nuevo.");
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  load();
  return () => controller.abort();

  }, [portal]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Domain handlers ──────────────────────────────────────────────────────────
  const handleContinue = async () => {
    setLoadingContinue(true);
    setApiError("");
    try {
      const res = await api.post(`${API_BASE_URL}/${portal}/api/v1/organization-settings/set-domain/`, { domain });
      setVerifyToken(res.data.domain_verify_token);
      setStep(2);
    } catch (err: any) {
      setApiError(
        err?.response?.data?.detail ??
        err?.response?.data?.custom_domain?.[0] ??
        "Error al guardar el dominio. Intenta de nuevo."
      );
    } finally {
      setLoadingContinue(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyStatus(null);
    setVerifyError("");
    try {
      await api.post(`${API_BASE_URL}/${portal}/api/v1/organization-settings/verify-domain/`, { domain });
      setVerifyStatus('success');
      setActiveDomain(domain);
      setStep(3);
    } catch (err: any) {
      setVerifyStatus('error');
      setVerifyError(
        err?.response?.data?.detail ??
        "No se encontró el registro DNS. Asegúrate de que los datos estén correctos y vuelve a intentarlo."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    setDeletingDomain(true);
    const url = isCustomDomain
      ? `api/v1/organization-settings/remove-domain/`
      : `${portal}/api/v1/organization-settings/remove-domain/`;
    try {
      await api.delete(`${API_BASE_URL}/` + url);
      setActiveDomain(null);
      setShowDeleteConfirm(false);
      setStep(1);
      setDomain("");
      setVerifyToken("");
      setVerifyStatus(null);
      setApiError("");
      toast.success("Dominio eliminado exitosamente");
      navigate(isCustomDomain ? '/settings' : `/${portal}/settings`);
    } catch {
      setApiError("Error al eliminar el dominio. Intenta de nuevo.");
      setShowDeleteConfirm(false);
    } finally {
      setDeletingDomain(false);
    }
  };

  // ── Cancel subscription ──────────────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    setCancellingPlan(true);
    try {
      await api.delete(`${API_BASE_URL}/${portal}/api/v1/payments/subscription/cancel-subscription/`);
      setShowCancelConfirm(false);
      toast.success("Suscripción cancelada. Redirigiendo...");
      clearToken();
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setShowCancelConfirm(false);

      if (err?.response?.status === 403) {
        const daysRemaining = err.response.data?.days_remaining;
        const msg = daysRemaining
          ? `No puedes cancelar aún. Faltan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} para poder cancelar.`
          : err.response.data?.msg ?? 'No puedes cancelar la suscripción todavía.';
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(
          err?.response?.data?.detail ?? 'Error al cancelar la suscripción. Intenta de nuevo.'
        );
      }
    } finally {
      setCancellingPlan(false);
    }
  };

  const isValidDomain = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domain);

  if (loadingInitial) {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f4f6f9", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7a8d", fontSize: 14 }}>
          <SpinnerIcon /> Cargando configuración...
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .settings-card     { animation: fadeIn 0.3s ease; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f4f6f9", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Toaster position="bottom-right" richColors theme="dark" closeButton />

        {/* Header */}
        <div style={{ padding: "24px 32px 0" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a2332", margin: 0 }}>Configuración</h1>
          <p style={{ color: "#6b7a8d", fontSize: 14, margin: "4px 0 0" }}>Gestiona la configuración avanzada de tu portal</p>
        </div>

        {apiError && (
          <div style={{ margin: "12px 32px 0", background: "#fff5f5", border: "1.5px solid #feb2b2", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#e53e3e" }}><AlertIcon /></span>
            <p style={{ fontSize: 13, color: "#c53030", margin: 0 }}>{apiError}</p>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 32px 40px" }}>
          <div style={{ width: "100%", maxWidth: 620, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ══════════════════════════════════════════════════════════════════
                SECCIÓN 1 — SUSCRIPCIÓN
            ══════════════════════════════════════════════════════════════════ */}
            {userRole===ROLE_DEFINITIONS[0].id && (
              <div className="settings-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                {/* Card header */}
                <div style={{ padding: "22px 28px", borderBottom: "1px solid #eef0f3", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #1e3a5f, #2d5f9e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <CreditCardIcon />
                </div>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a2332", margin: 0 }}>Suscripción</h2>
                  <p style={{ fontSize: 13, color: "#8a94a6", margin: 0 }}>Gestiona el estado de tu plan actual</p>
                </div>
              </div>

              <div style={{ padding: "24px 28px" }}>
                {subscriptionActive ? (
                  <>
                    {/* Status row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fb", border: "1.5px solid #e8ebf0", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#25a163", boxShadow: "0 0 0 3px rgba(37,161,99,0.2)" }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a2332" }}>Plan activo</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#eaf6f0", color: "#1a7a4a", border: "1px solid #b6e4cf" }}>
                        ✓ Activa
                      </span>
                    </div>

                    {/* Cancel section */}
                    {!showCancelConfirm ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #fed7d7", background: "#fff5f5", color: "#c53030", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                      >
                        <TrashIcon /> Cancelar suscripción
                      </button>
                    ) : (
                      <div style={{ background: "#fff5f5", border: "1.5px solid #feb2b2", borderRadius: 10, padding: "16px 18px" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#c53030", margin: "0 0 6px" }}>¿Cancelar tu suscripción?</p>
                        <p style={{ fontSize: 13, color: "#744210", margin: "0 0 16px", lineHeight: 1.6 }}>
                          Al cancelar perderás acceso a todas las funciones del plan al término del período actual. Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={handleCancelSubscription}
                            disabled={cancellingPlan}
                            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: cancellingPlan ? "#e8ebf0" : "#e53e3e", color: cancellingPlan ? "#9aa3b0" : "#fff", fontSize: 13, fontWeight: 600, cursor: cancellingPlan ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            {cancellingPlan ? <><SpinnerIcon /> Cancelando...</> : "Sí, cancelar"}
                          </button>
                          <button
                            onClick={() => setShowCancelConfirm(false)}
                            style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #dde1e8", background: "#fff", color: "#4a5568", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                          >
                            Mantener plan
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Cancelled state */
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8f9fb", border: "1.5px solid #e8ebf0", borderRadius: 10, padding: "14px 18px" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e53e3e" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1a2332" }}>Suscripción cancelada</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#8a94a6" }}>Conservas acceso hasta el fin del período actual</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
              )}

            {/* ══════════════════════════════════════════════════════════════════
                SECCIÓN 2 — DOMINIO PERSONALIZADO
            ══════════════════════════════════════════════════════════════════ */}
            {activeDomain && step === 99 ? (
              /* Dominio activo */
              <div className="settings-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                <div style={{ padding: "22px 28px", borderBottom: "1px solid #eef0f3", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #1e3a5f, #2d5f9e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <GlobeIcon />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a2332", margin: 0 }}>Dominio Personalizado</h2>
                    <p style={{ fontSize: 13, color: "#8a94a6", margin: 0 }}>Tu portal tiene un dominio activo configurado</p>
                  </div>
                </div>

                <div style={{ padding: "24px 28px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f9fb", border: "1.5px solid #e8ebf0", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#25a163", boxShadow: "0 0 0 3px rgba(37,161,99,0.2)" }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1a2332" }}>{activeDomain}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#8a94a6" }}>Verificado y activo</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#eaf6f0", color: "#1a7a4a", border: "1px solid #b6e4cf" }}>✓ Activo</span>
                  </div>

                  <div style={{ border: "1px solid #eef0f3", borderRadius: 10, marginBottom: 24 }}>
                    {[
                      { label: "URL del portal", val: `https://${activeDomain}/dashboard` },
                      { label: "Portal vinculado", val: portal ?? '' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i === 0 ? "1px solid #eef0f3" : "none" }}>
                        <span style={{ fontSize: 13, color: "#8a94a6" }}>{item.label}</span>
                        <code style={{ fontSize: 12, color: "#1a2332", fontFamily: "'Consolas', monospace", background: "#f4f6f9", padding: "2px 8px", borderRadius: 4 }}>{item.val}</code>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#f0f4ff", border: "1px solid #c7d4f0", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, marginBottom: 20 }}>
                    <span style={{ color: "#2d5f9e", flexShrink: 0, marginTop: 1 }}><AlertIcon /></span>
                    <p style={{ fontSize: 13, color: "#4a6fa5", margin: 0, lineHeight: 1.5 }}>
                      Solo se permite <strong>un dominio personalizado</strong>. Para cambiar el dominio, primero elimina el actual.
                    </p>
                  </div>

                  {!showDeleteConfirm ? (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #fed7d7", background: "#fff5f5", color: "#c53030", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      <TrashIcon /> Eliminar dominio
                    </button>
                  ) : (
                    <div style={{ background: "#fff5f5", border: "1.5px solid #feb2b2", borderRadius: 10, padding: "14px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#c53030", margin: "0 0 4px" }}>¿Estás seguro?</p>
                      <p style={{ fontSize: 13, color: "#744210", margin: "0 0 14px", lineHeight: 1.5 }}>
                        Al eliminar el dominio, los usuarios ya no podrán acceder desde <strong>{activeDomain}</strong>.
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleRemoveDomain} disabled={deletingDomain} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: deletingDomain ? "#e8ebf0" : "#e53e3e", color: deletingDomain ? "#9aa3b0" : "#fff", fontSize: 13, fontWeight: 600, cursor: deletingDomain ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          {deletingDomain ? <><SpinnerIcon /> Eliminando...</> : "Sí, eliminar"}
                        </button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid #dde1e8", background: "#fff", color: "#4a5568", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* Flujo de configuración */
              <div className="settings-card" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)", overflow: "hidden" }}>
                {/* Card header */}
                <div style={{ padding: "22px 28px", borderBottom: "1px solid #eef0f3", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #1e3a5f, #2d5f9e)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    <GlobeIcon />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a2332", margin: 0 }}>Dominio Personalizado</h2>
                    <p style={{ fontSize: 13, color: "#8a94a6", margin: 0 }}>Configura un dominio propio para tu portal</p>
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ display: "flex", alignItems: "center", padding: "20px 28px", borderBottom: "1px solid #eef0f3" }}>
                  {steps.map((s, i) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: step > s.id ? "#1a7a4a" : step === s.id ? "#1e3a5f" : "#e8ebf0", color: step >= s.id ? "#fff" : "#9aa3b0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all 0.3s ease" }}>
                          {step > s.id ? <CheckIcon size={13} /> : s.id}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: step === s.id ? 600 : 400, whiteSpace: "nowrap", color: step === s.id ? "#1a2332" : step > s.id ? "#1a7a4a" : "#9aa3b0" }}>{s.label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div style={{ flex: 1, height: 1, margin: "0 12px", background: step > s.id ? "#b6e4cf" : "#e8ebf0", transition: "background 0.3s ease" }} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ padding: "28px 28px 32px" }}>

                  {/* STEP 1 */}
                  {step === 1 && (
                    <div>
                      <p style={{ fontSize: 14, color: "#4a5568", marginBottom: 20, lineHeight: 1.6 }}>
                        Ingresa el dominio que deseas usar. Solo puedes tener <strong>un dominio activo</strong>.
                      </p>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>Dominio</label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9aa3b0", fontSize: 13, pointerEvents: "none" }}>https://</span>
                          <input
                            value={domain}
                            onChange={e => { setDomain(e.target.value); setApiError(""); }}
                            placeholder="empresa.com"
                            style={{ width: "100%", padding: "10px 12px 10px 70px", border: `1.5px solid ${domain && !isValidDomain ? "#e53e3e" : "#dde1e8"}`, borderRadius: 8, fontSize: 14, outline: "none", color: "#1a2332", background: "#fafbfc", boxSizing: "border-box", transition: "border-color 0.2s" }}
                            onFocus={e => (e.target.style.borderColor = "#2d5f9e")}
                            onBlur={e => (e.target.style.borderColor = domain && !isValidDomain ? "#e53e3e" : "#dde1e8")}
                            onKeyDown={e => e.key === 'Enter' && isValidDomain && handleContinue()}
                          />
                        </div>
                        <button
                          disabled={!isValidDomain || loadingContinue}
                          onClick={handleContinue}
                          style={{ padding: "10px 22px", borderRadius: 8, border: "none", background: isValidDomain && !loadingContinue ? "linear-gradient(135deg, #1e3a5f, #2d5f9e)" : "#e8ebf0", color: isValidDomain && !loadingContinue ? "#fff" : "#9aa3b0", fontSize: 14, fontWeight: 600, cursor: isValidDomain && !loadingContinue ? "pointer" : "not-allowed", transition: "all 0.2s", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}
                        >
                          {loadingContinue ? <><SpinnerIcon /> Guardando...</> : "Continuar"}
                        </button>
                      </div>
                      {domain && !isValidDomain && (
                        <p style={{ fontSize: 12, color: "#e53e3e", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertIcon /> Ingresa un dominio válido (ej: empresa.com)
                        </p>
                      )}
                      <div style={{ marginTop: 24, background: "#f0f4ff", border: "1px solid #c7d4f0", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10 }}>
                        <div style={{ color: "#2d5f9e", marginTop: 1, flexShrink: 0 }}><ShieldIcon /></div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1e3a5f", margin: "0 0 4px" }}>¿Cómo funciona?</p>
                          <p style={{ fontSize: 13, color: "#4a6fa5", margin: 0, lineHeight: 1.6 }}>
                            Verificaremos que eres el propietario del dominio mediante un registro DNS TXT, luego apuntarás el dominio a nuestros servidores.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {step === 2 && (
                    <div>
                      <p style={{ fontSize: 14, color: "#4a5568", marginBottom: 6, lineHeight: 1.6 }}>
                        Agrega estos registros DNS en tu proveedor (GoDaddy, Cloudflare, etc.)
                      </p>
                      <p style={{ fontSize: 12, color: "#9aa3b0", marginBottom: 20 }}>
                        Haz clic en cualquier valor para copiarlo al portapapeles.
                      </p>

                      {[
                        {
                          label: "Registro TXT — Verificación de propiedad",
                          badge: "Requerido primero", badgeColor: "#e53e3e",
                          rows: [
                            { col: "Tipo",          val: "TXT" },
                            { col: "Host / Nombre", val: `_securewhistle-verify.${domain}` },
                            { col: "Valor",         val: `securewhistle-verify=${verifyToken}` },
                            { col: "TTL",           val: "3600" },
                          ]
                        },
                        {
                          label: "Registro A — Apuntar a nuestro servidor",
                          badge: "Después de verificar", badgeColor: "#805ad5",
                          rows: [
                            { col: "Tipo",          val: "A" },
                            { col: "Host / Nombre", val: "@" },
                            { col: "Valor",         val: "203.0.113.50" },
                            { col: "TTL",           val: "3600" },
                          ]
                        }
                      ].map((record, ri) => (
                        <div key={ri} style={{ border: "1.5px solid #e8ebf0", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                          <div style={{ padding: "11px 16px", background: "#f8f9fb", borderBottom: "1px solid #e8ebf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{record.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20, background: record.badgeColor + "18", color: record.badgeColor }}>{record.badge}</span>
                          </div>
                          <div style={{ padding: "4px 0" }}>
                            {record.rows.map((row, i) => (
                              <div key={i} style={{ borderBottom: i < record.rows.length - 1 ? "1px solid #f0f2f5" : "none" }}>
                                <DnsRow
                                  col={row.col}
                                  val={row.val}
                                  copyKey={`${ri}-${i}`}
                                  copied={copied}
                                  onCopy={handleCopy}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div style={{ background: "#fffbeb", border: "1px solid #f6d860", borderRadius: 8, padding: "12px 14px", display: "flex", gap: 8, marginBottom: 22 }}>
                        <span style={{ color: "#d69e2e", flexShrink: 0 }}><AlertIcon /></span>
                        <p style={{ fontSize: 13, color: "#7d6008", margin: 0, lineHeight: 1.5 }}>
                          Los cambios DNS pueden tardar hasta <strong>24 horas</strong> en propagarse.
                        </p>
                      </div>

                      {verifyStatus === 'error' && (
                        <div style={{ background: "#fff5f5", border: "1.5px solid #feb2b2", borderRadius: 8, padding: "10px 14px", display: "flex", gap: 8, marginBottom: 16 }}>
                          <span style={{ color: "#e53e3e", flexShrink: 0 }}><AlertIcon /></span>
                          <p style={{ fontSize: 13, color: "#c53030", margin: 0, lineHeight: 1.5 }}>{verifyError}</p>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => { setStep(1); setVerifyStatus(null); setVerifyError(""); }} style={{ padding: "10px 18px", borderRadius: 8, border: "1.5px solid #dde1e8", background: "#fff", color: "#4a5568", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                          Atrás
                        </button>
                        <button onClick={handleVerify} disabled={verifying} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: verifying ? "#e8ebf0" : "linear-gradient(135deg, #1e3a5f, #2d5f9e)", color: verifying ? "#9aa3b0" : "#fff", fontSize: 14, fontWeight: 600, cursor: verifying ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                          {verifying ? <><SpinnerIcon /> Verificando...</> : "Verificar dominio"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {step === 3 && (
                    <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
                      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #1a7a4a, #25a163)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(26,122,74,0.25)" }}>
                        <CheckIcon size={28} />
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a2332", margin: "0 0 8px" }}>¡Dominio verificado!</h3>
                      <p style={{ fontSize: 14, color: "#6b7a8d", margin: "0 0 28px", lineHeight: 1.6 }}>
                        <strong style={{ color: "#1a2332" }}>{domain}</strong> ha sido vinculado correctamente.
                      </p>
                      <button onClick={() => setStep(99)} style={{ padding: "10px 28px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1e3a5f, #2d5f9e)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        Ver configuración
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}