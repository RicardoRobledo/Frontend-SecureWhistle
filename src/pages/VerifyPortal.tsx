import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Home, AlertCircle, Search } from 'lucide-react';
import { Toaster, toast } from 'sonner'; // ✅ FIX 1: toast importado
import axios from 'axios';
import { API_BASE_URL } from '../config/api';


const VerifyPortal: React.FC = () => {
  const navigate = useNavigate();
  const [portal, setPortal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verifyPortal = async () => {
    // ✅ FIX 5: validación antes de hacer request
    if (!portal.trim()) {
      setError('Por favor ingresa un portal.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `${API_BASE_URL}/accounts/api/v1/verify/organization-portal/`,
        { portal: encodeURIComponent(portal.trim()) }
      );

      navigate(`/${portal}/public-report`);

    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setError('Portal no encontrado.');
      } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        navigate(`/${portal}/reactivate`, { state: { authorized: true } });
       }else {
        setError('Error al verificar el portal. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-50 p-6'>
      {/* ✅ FIX 1: Toaster agregado */}
      <Toaster position='bottom-right' richColors />

      <div className='w-full max-w-md bg-white rounded-3xl shadow-xl p-10 space-y-8'>

        <div className='text-center space-y-4'>
          <div className='w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto'>
            <Shield size={28} />
          </div>
          <h2 className='text-3xl font-bold text-slate-900'>
            Accede a tu organización
          </h2>
          <p className='text-slate-500 text-sm'>
            Ingresa el portal de tu organización.
          </p>
        </div>

        <div className='space-y-4'>
          <div className='relative'>
            <Search className='absolute left-4 top-3.5 text-slate-400' size={18} />
            <input
              type='text'
              placeholder='Ej. empresa123'
              value={portal}
              onChange={(e) => {
                setPortal(e.target.value);
                setError(''); // limpiar error al escribir
              }}
              // ✅ FIX 5: maxLength + submit con Enter
              maxLength={50}
              onKeyDown={(e) => e.key === 'Enter' && verifyPortal()}
              className='w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-400 text-sm font-medium transition-all'
            />
          </div>

          {/* ✅ FIX 6: solo error state, sin toast duplicado */}
          {error && (
            <div className='flex items-center gap-2 text-rose-600 text-xs font-medium'>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* ✅ FIX 7: también disabled cuando portal está vacío */}
          <button
            onClick={verifyPortal}
            disabled={loading || !portal.trim()}
            className='w-full bg-slate-900 text-white font-semibold py-3.5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
          >
            {loading ? 'Verificando...' : 'Ingresar al portal'}
          </button>
        </div>

        <div className='text-center'>
          <button
            onClick={() => navigate('/')}
            className='text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-2 mx-auto transition-colors'
          >
            <Home size={14} />
            Volver al inicio
          </button>
        </div>

      </div>
    </div>
  );
};

export default VerifyPortal;