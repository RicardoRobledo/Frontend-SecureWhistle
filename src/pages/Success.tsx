import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { CheckCircle, ArrowRight, Shield } from 'lucide-react';
import 'react-toastify/dist/ReactToastify.css';

export default function Success() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.success('Tu cuenta ha sido creada exitosamente', {
      position: 'top-right',
      autoClose: 4000,
      theme: 'dark', // Ajustado para combinar con tu UI
    });
  }, []);

  return (
    <div className='flex min-h-screen bg-[#0b1120] text-white font-sans'>
      {/* Columna Izquierda - Hero (Consistente con tu captura) */}
      <div className='hidden lg:flex w-1/3 bg-[#2563eb] p-12 flex-col justify-between'>
        <div>
          <div className='flex items-center gap-2 mb-12'>
            <Shield className='w-8 h-8' />
            <span className='text-2xl font-bold tracking-tight'>SecureWhistle</span>
          </div>
          <h1 className='text-4xl font-bold leading-tight mb-4'>
            Protege la integridad de tu organización.
          </h1>
          <p className='text-blue-100 text-lg'>
            Tu entorno de denuncias anónimas ya está listo para operar.
          </p>
        </div>

        {/* Stepper (Estado Completado) */}
        <div className='space-y-6'>
          {[1, 2, 3].map((step) => (
            <div key={step} className='flex items-center gap-4 opacity-100'>
              <div className='w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-white text-blue-600 font-bold'>
                ✓
              </div>
              <div className='text-sm'>
                <p className='uppercase text-xs opacity-70'>Paso {step}</p>
                <p className='font-semibold'>
                  {step === 1 ? 'Tu Organización' : step === 2 ? 'Cuenta de Admin' : 'Selección de Plan'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha - Contenido de Éxito */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <div className='max-w-md w-full text-center'>
          <div className='inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-8'>
            <CheckCircle className='w-12 h-12 text-green-500' />
          </div>

          <h2 className='text-3xl font-bold mb-4 text-white'>¡Configuración Exitosa!</h2>
          <p className='text-gray-400 mb-10 leading-relaxed'>
            Por favor revisa el correo que te enviamos para poder acceder a tu cuenta, es probable que tarde uno poco.
          </p>

          <div className='space-y-4'>
            <button className='w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 group' onClick={() => navigate('/')}>
              Inicio
              <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
            </button>
          </div>
        </div>
      </div>

      <ToastContainer toastStyle={{ backgroundColor: '#1e293b', color: 'white' }} />
    </div>
  );
}