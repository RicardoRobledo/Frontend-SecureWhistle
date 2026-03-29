import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Home, Search, LifeBuoy, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-screen flex bg-white'>
      {/* Left Side - Visual (Consistente con Login) */}
      <div className='hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center'>
        <div className='absolute inset-0 bg-gradient-to-br from-blue-900 to-slate-900 opacity-90 z-10'></div>
        <img 
          src='https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=2300' 
          alt='Error 404' 
          className='absolute inset-0 w-full h-full object-cover'
        />
        <div className='relative z-20 p-12 text-white max-w-lg'>
          <div className='w-16 h-16 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 rounded-2xl flex items-center justify-center mb-8'>
            <AlertCircle size={32} className='text-blue-400' />
          </div>
          <h1 className='text-5xl font-bold mb-6 tracking-tight leading-tight'>Página no encontrada</h1>
          <p className='text-lg text-slate-300 leading-relaxed'>
            Parece que el enlace es incorrecto o el portal que intentas buscar no está disponible en este momento.
          </p>
        </div>
      </div>

      {/* Right Side - Error Content */}
      <div className='w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white overflow-y-auto'>
        <div className='w-full max-w-md space-y-10'>
          <div className='text-center lg:text-left'>
            <span className='text-blue-600 font-bold tracking-widest uppercase text-sm'>Error 404</span>
            <h2 className='text-4xl font-bold text-slate-900 tracking-tight mt-2'>¿Te has perdido?</h2>
            <p className='text-slate-500 mt-4 leading-relaxed'>
              No pudimos encontrar la ruta especificada.
            </p>
          </div>

          <div className='space-y-4'>
            <button 
              onClick={() => navigate('/')}
              className='w-full bg-slate-900 text-white font-semibold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2'
            >
              <Home size={18} />
              Volver a la Página Principal
            </button>
          </div>

          <div className='relative my-8'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-slate-200'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='px-4 bg-white text-slate-500 font-medium'>Otras opciones</span>
            </div>
          </div>

          <div className='flex justify-center'>
            <button 
              onClick={() => navigate('/register')}
              className='flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md transition-all group gap-3 text-center w-full sm:w-1/2'
            >
              <div className='w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform'>
                <Shield size={20} />
              </div>
              <div>
                <span className='block font-bold text-slate-800 text-sm'>Registrarse</span>
                <span className='block text-xs text-slate-500 mt-1'>Crear una cuenta nueva</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;