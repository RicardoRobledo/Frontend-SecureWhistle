import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { Shield, Lock, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { setToken } from '../utils/tokenStore';
import axios from 'axios';
import api from '../utils/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { portal, isCustomDomain } = useTenant();
  const { refreshAuth } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !portal) {
      toast.error('Por favor completa todos los campos.');
      return;
    }
    setIsSubmitting(true);
    try {
      const tokenResponse = await axios.post(
        `${API_BASE_URL}/accounts/api/v1/token/`,
        { username, password, portal },
        { withCredentials: true }
      );
      const { access } = tokenResponse.data;
      if (!access) { toast.error('Respuesta del servidor inválida.'); return; }

      setToken(access);

      const roleRes = await api.get(
        `${API_BASE_URL}/${portal}/api/v1/users/user/user-role/`,
      );

      refreshAuth(roleRes.data.user_role);
      navigate(isCustomDomain ? `/dashboard/` : `/${portal}/dashboard/`);

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          navigate(`/${portal}/reactivate`, { state: { authorized: true } });
        }else if (error.response?.status === 401 || error.response?.status === 404) {
          toast.error('Credenciales incorrectas. Verifica tus datos.');
        } else {
          toast.error('Error de conexión. Intenta nuevamente.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        .lf { font-family: 'DM Sans', sans-serif; }
        .hf { font-family: 'Sora', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .a1{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) .05s both}
        .a2{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) .13s both}
        .a3{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) .21s both}
        .a4{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) .29s both}
        .a5{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) .37s both}
        .iglow:focus { outline:none; border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
        .btnl { position:relative; overflow:hidden; transition: background .2s, transform .15s; }
        .btnl:hover:not(:disabled) { background:#1e3a5f; transform:translateY(-1px); }
        .btnl:active:not(:disabled) { transform:translateY(0); }
        .btnl::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.06),transparent); pointer-events:none; }
        .grid-bg {
          background-image: linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
          background-size: 40px 40px;
        }
        @keyframes pulse2 { 0%,100%{opacity:.5} 50%{opacity:1} }
        .sdot { animation: pulse2 2.4s ease infinite; }
      `}</style>

      <Toaster position='bottom-right' richColors theme='dark' closeButton />

      <div className='lf min-h-screen flex bg-slate-950'>

        {/* LEFT — Branding */}
        <div className='hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col'>
          <img
            src='https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2301'
            alt='' className='absolute inset-0 w-full h-full object-cover'
            style={{ filter:'brightness(.28) saturate(.7)' }}
          />
          <div className='absolute inset-0 bg-gradient-to-br from-blue-900/60 to-slate-950' />
          <div className='grid-bg absolute inset-0' />
          <div className='absolute top-1/3 left-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none' />

          <div className='relative z-10 flex flex-col h-full p-14'>
            <div className='flex items-center gap-3'>
              <div className='w-9 h-9 bg-white/8 border border-white/15 rounded-xl flex items-center justify-center'>
                <Shield size={17} className='text-blue-300' />
              </div>
              <span className='hf text-white/80 font-semibold text-sm tracking-wide'>SecureWhistle</span>
            </div>

            <div className='flex-1 flex items-center justify-center'>
              <div className='space-y-5 max-w-xs'>
                <div className='flex items-center gap-2'>
                  <span className='sdot w-1.5 h-1.5 rounded-full bg-blue-400 inline-block' />
                  <span className='text-blue-300/70 text-[10px] font-medium tracking-widest uppercase'>Panel de administración</span>
                </div>
                <h1 className='hf text-[2.4rem] font-bold text-white leading-[1.15] tracking-tight'>
                  Gestión segura de tu organización
                </h1>
                <p className='text-slate-400 text-sm leading-relaxed font-light'>
                  Accede con tus credenciales para administrar reportes, usuarios y configuraciones de tu portal corporativo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Form */}
        <div className='w-full lg:w-[48%] flex flex-col bg-white'>
          <div className='flex-1 flex items-center justify-center px-8 py-14 overflow-y-auto'>
            <div className='w-full max-w-[360px] space-y-8'>

              <div className='a1 space-y-1.5'>
                <p className='text-[11px] font-semibold text-blue-600 tracking-widest uppercase'>Acceso restringido</p>
                <h2 className='hf text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight'>Iniciar sesión</h2>
                <p className='text-slate-500 text-sm'>Credenciales para el panel administrativo.</p>
              </div>

              <div className='a2 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3'>
                <AlertTriangle size={13} className='text-amber-500 flex-shrink-0 mt-0.5' />
                <p className='text-amber-700 text-xs leading-relaxed'>
                  Área exclusiva para personal autorizado.
                </p>
              </div>

              <form onSubmit={handleLogin} className='a3 space-y-5'>
                <div className='space-y-1.5'>
                  <label className='text-[11px] font-semibold text-slate-500 uppercase tracking-wide'>Usuario</label>
                  <input
                    type='text' placeholder='JohnDoe' value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={30} required autoComplete='username'
                    className='iglow w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all placeholder:text-slate-300'
                  />
                </div>

                <div className='space-y-1.5'>
                  <label className='text-[11px] font-semibold text-slate-500 uppercase tracking-wide'>Contraseña</label>
                  <div className='relative'>
                    <input
                      type={showPassword ? 'text' : 'password'} placeholder='••••••••••' value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={128} required autoComplete='current-password'
                      className='iglow w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm transition-all placeholder:text-slate-300'
                    />
                    <button type='button' onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type='submit' disabled={isSubmitting}
                  className='btnl w-full bg-slate-900 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'>
                  {isSubmitting
                    ? <><Loader2 size={15} className='animate-spin' /> Verificando...</>
                    : <><Lock size={14} /> Iniciar sesión</>}
                </button>
              </form>

              <p className='a5 text-center text-[11px] text-slate-400 leading-relaxed'>
                {' · '}Accesos monitoreados
              </p>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;