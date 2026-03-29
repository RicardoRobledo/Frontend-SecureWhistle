import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Shield, Search, ArrowRight } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

const PublicPortal: React.FC = () => {
  const navigate = useNavigate();
  const { portal, isCustomDomain, isLoading, portalError } = useTenant();
  const [hovered, setHovered] = useState<'create' | 'track' | null>(null);

  // ✅ Esperar hasta que el portal esté resuelto
  if (isLoading || !portal || portalError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-950'>
        <div className='text-center space-y-5'>
          <div className='relative mx-auto w-14 h-14'>
            <div className='absolute inset-0 rounded-full border border-slate-700' />
            <div className='absolute inset-0 rounded-full border-t border-blue-500 animate-spin' />
            <Shield className='absolute inset-0 m-auto w-5 h-5 text-blue-400' />
          </div>
          <p className='text-slate-500 text-xs tracking-widest uppercase'>Verificando portal</p>
        </div>
      </div>
    );
  }

  // ✅ URL correcta según tipo de dominio
  const goTo = (mode: 'create' | 'track') => {
    if (isCustomDomain) {
      navigate(`/public-report-detail?mode=${mode}`);
    } else {
      navigate(`/${portal}/public-report-detail?mode=${mode}`);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

        .pp-root    { font-family: 'DM Sans', sans-serif; }
        .pp-heading { font-family: 'Sora', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.25); }
          50%       { box-shadow: 0 0 20px 4px rgba(16,185,129,0.1); }
        }

        .anim-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
        .anim-2 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
        .anim-3 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
        .anim-4 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.38s both; }
        .anim-bg { animation: fadeIn 0.8s ease both; }

        .portal-card {
          transition: transform 0.3s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .portal-card:hover { transform: translateY(-5px); }

        .card-create:hover {
          border-color: rgba(59,130,246,0.45) !important;
          box-shadow: 0 24px 64px rgba(59,130,246,0.1), 0 4px 20px rgba(0,0,0,0.25) !important;
        }
        .card-track:hover {
          border-color: rgba(16,185,129,0.45) !important;
          box-shadow: 0 24px 64px rgba(16,185,129,0.1), 0 4px 20px rgba(0,0,0,0.25) !important;
        }

        .icon-box { transition: background 0.3s ease, transform 0.3s ease; }
        .card-create:hover .icon-box-blue  { background: rgba(59,130,246,0.2) !important; transform: scale(1.07); }
        .card-track:hover  .icon-box-green { background: rgba(16,185,129,0.2) !important; transform: scale(1.07); }

        .arrow-icon { transition: transform 0.25s ease, opacity 0.25s ease; opacity: 0; }
        .portal-card:hover .arrow-icon { transform: translateX(3px); opacity: 1; }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 52px 52px;
        }

        .badge-glow { animation: pulseGlow 3s ease infinite; }
        .tag-dot    { animation: floatDot 2.8s ease infinite; }
      `}</style>

      <Toaster position='bottom-right' richColors theme='dark' closeButton />

      <div className='pp-root min-h-screen bg-slate-950 relative overflow-hidden flex flex-col'>

        {/* Background */}
        <div className='anim-bg absolute inset-0 grid-bg pointer-events-none' />
        <div className='absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[420px] bg-emerald-500/4 rounded-full blur-[120px] pointer-events-none' />
        <div className='absolute bottom-[-60px] right-[-60px] w-[380px] h-[380px] bg-blue-500/5 rounded-full blur-[90px] pointer-events-none' />

        {/* Top bar */}
        <div className='relative z-10 flex items-center px-8 pt-8'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-white/6 border border-white/10 rounded-lg flex items-center justify-center'>
              <Shield size={15} className='text-slate-300' />
            </div>
            <span className='pp-heading text-slate-300 font-semibold text-sm'>SecureWhistle</span>
          </div>
        </div>

        {/* Main */}
        <div className='relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-14'>

          {/* Badge */}
          <div className='anim-1 inline-flex items-center gap-2.5 bg-emerald-500/8 border border-emerald-500/18 rounded-full px-4 py-1.5 mb-8 badge-glow'>
            <span className='tag-dot w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0' />
            <span className='text-emerald-300/80 text-[10px] font-semibold tracking-widest uppercase'>
              Canal Seguro
            </span>
          </div>

          {/* Heading */}
          <div className='text-center space-y-3 mb-12 max-w-md'>
            <h1 className='anim-2 pp-heading text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-[1.1]'>
              Tu voz{' '}
              <span
                className='text-transparent bg-clip-text'
                style={{ backgroundImage: 'linear-gradient(135deg, #34d399 0%, #60a5fa 100%)' }}
              >
                protegida
              </span>
            </h1>
            <p className='anim-3 text-slate-400 text-base leading-relaxed'>
              Reporta un incidente o consulta tu caso. Tu identidad está cifrada en todo momento.
            </p>
          </div>

          {/* Cards */}
          <div className='anim-4 w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4'>

            {/* Create */}
            <button
              onClick={() => goTo('create')}
              onMouseEnter={() => setHovered('create')}
              onMouseLeave={() => setHovered(null)}
              className='portal-card card-create text-left p-6 rounded-2xl border border-white/7 flex flex-col gap-5'
              style={{ background: 'rgba(255,255,255,0.03)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <div className='flex items-start justify-between'>
                <div
                  className='icon-box icon-box-blue w-[52px] h-[52px] rounded-xl flex items-center justify-center'
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)' }}
                >
                  <Shield size={24} className='text-blue-400' />
                </div>
                <ArrowRight size={16} className='arrow-icon text-blue-400 mt-0.5' />
              </div>

              <div className='space-y-1.5'>
                <p className='text-blue-400/60 text-[10px] font-bold tracking-widest uppercase'>Nueva denuncia</p>
                <h3 className='pp-heading text-lg font-bold text-white'>Crear denuncia</h3>
                <p className='text-slate-400 text-sm leading-relaxed'>
                  Reporta un incidente de forma anónima. Recibirás un código de seguimiento único.
                </p>
              </div>

              <div className='flex items-center gap-2 pt-3 border-t border-white/5'>
                <span className='text-slate-500 text-xs'>🔒 Uso de cifrado</span>
              </div>
            </button>

            {/* Track */}
            <button
              onClick={() => goTo('track')}
              onMouseEnter={() => setHovered('track')}
              onMouseLeave={() => setHovered(null)}
              className='portal-card card-track text-left p-6 rounded-2xl border border-white/7 flex flex-col gap-5'
              style={{ background: 'rgba(255,255,255,0.03)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <div className='flex items-start justify-between'>
                <div
                  className='icon-box icon-box-green w-[52px] h-[52px] rounded-xl flex items-center justify-center'
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.18)' }}
                >
                  <Search size={24} className='text-emerald-400' />
                </div>
                <ArrowRight size={16} className='arrow-icon text-emerald-400 mt-0.5' />
              </div>

              <div className='space-y-1.5'>
                <p className='text-emerald-400/60 text-[10px] font-bold tracking-widest uppercase'>Seguimiento</p>
                <h3 className='pp-heading text-lg font-bold text-white'>Consultar estado</h3>
                <p className='text-slate-400 text-sm leading-relaxed'>
                  Tengo un código de seguimiento y quiero ver el estado actual de mi denuncia.
                </p>
              </div>

              <div className='flex items-center gap-2 pt-3 border-t border-white/5'>
                <span className='text-slate-500 text-xs'>📋 Tiempo real · con tu código</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className='relative z-10 pb-7 text-center'>
          <p className='text-xs text-slate-700'>
            SecureWhistle © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
};

export default PublicPortal;