import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { 
  Shield, Building, Lock, ArrowRight, CheckCircle2, 
  Check, Phone, MapPin, ChevronDown, Mail, UserPlus 
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, PRICES, TURNSTILE_SITE_KEY } from '../config/api';
import { Turnstile } from '@marsidev/react-turnstile';


type PlanName = 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
type Frequency = 'MONTHLY' | 'ANNUAL'; 

type Price = {
  id: string;
  nickname: string;
  unit_amount: number;
  currency: string;
  planName: PlanName;
  frequency: Frequency;
};

const Register = () => {
  const [step, setStep] = useState(1);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Price | null>(null);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  type FormErrors = Partial<Record<keyof typeof formData, string>>;
  const [errors, setErrors] = useState<FormErrors>({});
  let newErrors: FormErrors = {};

  const [formData, setFormData] = useState({
    name: '',
    company_email: '',
    phone_number: '',
    state: '',
    first_name: '',
    paternal_last_name: '',
    maternal_last_name: '',
    email: '',
    phone: '',
    username: '',
    password: ''
  });

  const plans: {
    key: PlanName;
    label: string;
    desc: string;
    highlight?: boolean;
  }[] = [
    { key: 'BASIC', label: 'Básico', desc: 'Ideal para comenzar' },
    { key: 'PROFESSIONAL', label: 'Profesional', desc: 'Para equipos en crecimiento', highlight: true },
    { key: 'ENTERPRISE', label: 'Empresarial', desc: 'Para grandes organizaciones' },
  ];

  const mexicanStates = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 
    'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  function getSelectedPlan(
    planName: PlanName,
    frequency: Frequency
  ): Price | undefined {
    return PRICES.find(
      p => p.planName === planName && p.frequency === frequency
    );
  }

  const nextStep = () => {
    setStep((prev) => prev + 1);
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };
    
  const prevStep = () => {
    setStep((prev) => prev - 1);
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateStep1 = () => {
    let newErrors = {};

    // Validar Nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la empresa es obligatorio';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(formData.name.trim())) {
      newErrors.name = 'El nombre solo puede contener letras sin espacios';
    }

    // Validar Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.company_email) {
      newErrors.company_email = 'El correo corporativo es obligatorio';
    } else if (!emailRegex.test(formData.company_email)) {
      newErrors.company_email = 'El formato del correo es inválido';
    }

    // Validar Teléfono (México: 10 dígitos)
    const cleanPhone = formData.phone_number.replace(/\D/g, ''); // Quita espacios y guiones
    if (!formData.phone_number) {
      newErrors.phone_number = 'El teléfono es obligatorio';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone_number = 'El teléfono debe tener 10 dígitos';
    }

    // Validar Estado
    if (!formData.state) {
      newErrors.state = 'Debes seleccionar un estado de México';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const onlyLettersAndSpaces = (value: string) =>/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value.trim());

  const validateStep2 = () => {
    let newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es obligatorio';
    } else if (!onlyLettersAndSpaces(formData.first_name)) {
      newErrors.first_name = 'El nombre solo puede contener letras y espacios';
    }

    if (!formData.paternal_last_name.trim()) {
      newErrors.paternal_last_name = 'El apellido paterno es obligatorio';
    } else if (!onlyLettersAndSpaces(formData.paternal_last_name)) {
      newErrors.paternal_last_name = 'El apellido paterno solo puede contener letras y espacios';
    }

    if (!formData.maternal_last_name.trim()) {
      newErrors.maternal_last_name = 'El apellido materno es obligatorio';
    } else if (!onlyLettersAndSpaces(formData.maternal_last_name)) {
      newErrors.maternal_last_name = 'El apellido materno solo puede contener letras y espacios';
    }

    // Validar Nombres y Apellidos
    if (!formData.first_name.trim()) newErrors.first_name = 'El nombre es obligatorio';
    if (!formData.paternal_last_name.trim()) newErrors.paternal_last_name = 'El apellido paterno es obligatorio';
    if (!formData.maternal_last_name.trim()) newErrors.maternal_last_name = 'El apellido materno es obligatorio';
    
    // Validar Email Personal
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'El correo personal es obligatorio';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El formato del correo personal es inválido';
    }

    // Validar Teléfono (Personal)
    if (!formData.phone) {
      newErrors.phone = 'El teléfono personal es obligatorio';
    } else if (formData.phone.replace(/\D/g, '').length !== 10) {
      newErrors.phone = 'El teléfono debe tener 10 dígitos';
    }

    // Validar Usuario
    if (!formData.username) {
      newErrors.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.length < 4) {
      newErrors.username = 'El usuario debe tener al menos 4 caracteres';
    } else if (/\s/.test(formData.username)) {
      newErrors.username = 'El usuario no puede contener espacios';
    }

    // Validar Contraseña
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 12) {
      newErrors.password = 'La contraseña debe tener al menos 12 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      newErrors.password = 'La contraseña requiere mayúscula, minúscula, número y carácter especial';
    } else if (formData.username.length < 4) {
      newErrors.username = 'El usuario debe tener al menos 4 caracteres';
    }

    setErrors(newErrors);
    return newErrors;
  };

  const verifyEnterprise = async () => {

    // Validación antes de enviar
    if (!formData.name || !formData.company_email || !formData.state) {
      toast.error('Por favor completa los campos');
      return;
    }

    const formErrors = validateStep1();
    const errorKeys = Object.keys(formErrors);

    if (errorKeys.length > 0) {
      // Tomamos el primer error de la lista para mostrarlo en el toast
      const firstErrorMessage = formErrors[errorKeys[0] as keyof FormErrors] ?? 'Error de validación';

      toast.error('Error de validación', {
        description: firstErrorMessage, // Aquí se imprime el error específico
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);

    const promise = axios.post(`${API_BASE_URL}/accounts/api/v1/verify/organization/`, {
      name: formData.name,
      state: formData.state,
      phone_number: formData.phone_number,
      company_email: formData.company_email
    });

    toast.promise(promise, {
      loading: 'Verificando disponibilidad de la organización...',
      success: (response) => {
        setIsLoading(false);
        nextStep(); // <--- If verification is successful, proceed to next step
        return `Organización disponible. ¡Continuemos!`;
      },
      error: (error) => {
        setIsLoading(false);
        if (error.response?.status === 400) {
          return 'Ya existe una organización con ese nombre, correo o teléfono.';
        }
        return 'Error de conexión con el servidor.';
      },
    });
  };

  const validateAdmin = async () => {
    // 1. Ejecutamos la validación detallada (que ya incluye el chequeo de campos vacíos)
    const formErrors = validateStep2();
    const errorKeys = Object.keys(formErrors);

    if (!formData.first_name || !formData.paternal_last_name || !formData.maternal_last_name ||
        !formData.email || !formData.phone || !formData.username || !formData.password) {
      toast.error('Por favor completa los campos');
      return;
    }

    // Si hay errores, mostramos el primero en el Toast
    if (errorKeys.length > 0) {
      const firstErrorMessage = formErrors[errorKeys[0]];
      
      toast.error('Error en datos de administrador', {
        description: firstErrorMessage,
      });
      return;
    }

    // Iniciamos estado de carga para bloquear el botón
    setIsLoading(true);

    // 2. Definimos la promesa
    // IMPORTANTE: Mapeamos paternal -> middle_name y maternal -> last_name para Django
    const promise = axios.post(`${API_BASE_URL}/accounts/api/v1/verify/admin-user/`, {
      username: formData.username,
      password: formData.password,
      first_name: formData.first_name,
      paternal_last_name: formData.paternal_last_name,
      maternal_last_name: formData.maternal_last_name,
      email: formData.email,
      phone_number: formData.phone
    });

    // 3. Ejecutamos con toast visual de Sonner
    toast.promise(promise, {
      loading: 'Verificando credenciales de administrador...',
      success: (response) => {
        setIsLoading(false);
        nextStep(); // Solo avanza si la respuesta de la API es exitosa (200 OK)
        return 'Cuenta de administrador validada.';
      },
      error: (error) => {
        setIsLoading(false);

        if (error.response?.status === 400) {
          const apiErrors = error.response.data;

          if (apiErrors.username) {
            const msg = apiErrors.username[0];
            if (msg.includes('already exists'))        return 'El nombre de usuario ya está registrado.';
            if (msg.includes('letras'))                return msg;
            if (msg.includes('at least 4'))            return 'El usuario debe tener al menos 4 caracteres.';
            return msg;
          }

          if (apiErrors.email) {
            const msg = apiErrors.email[0];
            if (msg.includes('already exists'))        return 'El correo ya está registrado.';
            if (msg.includes('valid email'))           return 'El formato del correo es inválido.';
            return msg;
          }

          if (apiErrors.phone_number) {
            return apiErrors.phone_number[0]; // tus mensajes ya están en español
          }

          if (apiErrors.password) {
            const msg = apiErrors.password[0];
            if (msg.includes('too similar'))           return 'La contraseña es demasiado similar al nombre de usuario, nombre, apellidos o correo.';
            if (msg.includes('too short'))             return 'La contraseña debe tener al menos 12 caracteres.';
            if (msg.includes('too common'))            return 'La contraseña es demasiado común.';
            if (msg.includes('entirely numeric'))      return 'La contraseña no puede ser solo números.';
            return msg; // mayúscula, minúscula, especial → ya están en español
          }

          return 'Datos inválidos. Revisa la información.';
        }

        return 'Error al validar el administrador. Intenta de nuevo.';
      },
    });
  };

  const validatePlan = async () => {
    if (!selectedPlan) {
      toast.error('Por favor selecciona un plan');
      return;
    }

    setIsLoading(true);

    const promise = axios.post(`${API_BASE_URL}/accounts/api/v1/register/`, {
      captcha_token: captchaToken,
      user: {
        first_name: formData.first_name,
        paternal_last_name: formData.paternal_last_name,
        maternal_last_name: formData.maternal_last_name,
        username: formData.username,
        password: formData.password,
        phone_number: formData.phone,
        email: formData.email,
      },
      organization:{
        name: formData.name,
        company_email: formData.company_email,
        phone_number: formData.phone_number,
        state: formData.state,
        on_trial: true,
      },
      payment:{
        price_id: selectedPlan.id,  // ✅ Solo enviamos el ID
        is_annual: isAnnual,
      }
    });

    toast.promise(promise, {
      loading: 'Creando tu cuenta...',
      success: (response) => {
        setIsLoading(false);
        setFormData(prev => ({ ...prev, password: '', username: '' })); // ← agregar esta línea
        window.location.href = response.data.url; // Redirige al checkout de Stripe
        return 'Cuenta creada exitosamente';
      },
      error: (error) => {
        setIsLoading(false);
        console.log(error);
        if (error.response?.status === 400) {
          return 'Error al crear la cuenta. Verifica los datos.';
        }
        return 'Error de conexión con el servidor.';
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const nameFields = ['first_name', 'paternal_last_name', 'maternal_last_name'];
    if (nameFields.includes(name)) {
      if (value !== '' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value)) return;
    }

    if (name === 'phone_number' || name === 'phone') {
      if (value !== '' && !/^[\d\s\-\+\(\)]*$/.test(value)) return;
    }

    if (name === 'name') {
      if (value !== '' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]+$/.test(value)) return;
    }

    if (name === 'username') {
      if (value !== '' && !/^[a-zA-Z0-9_]*$/.test(value)) return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSelectState = (val: string) => {
    setFormData({ ...formData, state: val });
    setIsSelectOpen(false);
  };

  return (
    <div className='h-screen w-full bg-[#0B1120] flex flex-col md:flex-row text-white font-sans selection:bg-blue-500/30 overflow-hidden'>
      <Toaster position='bottom-right' richColors theme='dark' closeButton />

      {/* LADO IZQUIERDO: PROGRESS */}
      <div className='hidden md:flex md:w-1/3 bg-blue-600 p-12 flex-col justify-between relative overflow-hidden h-full text-left'>
        <div className='z-10'>
          <Link to='/' className='flex items-center gap-2 mb-12 hover:opacity-90 transition-opacity'>
            <Shield size={32} />
            <span className='text-2xl font-bold italic tracking-tight'>SecureWhistle</span>
          </Link>
          <h2 className='text-4xl font-extrabold leading-tight mb-6'>Protege la integridad de tu organización.</h2>
          <p className='text-blue-100 text-lg'>Configura tu entorno de denuncias anónimas en menos de 5 minutos.</p>
        </div>
        
        <div className='z-10 space-y-4'>
          {[1, 2, 3].map((num) => (
            <div key={num} className='flex items-center gap-4'>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                step >= num ? 'bg-white text-blue-600 border-white shadow-lg' : 'border-blue-400 text-blue-400'
              }`}>
                {step > num ? <CheckCircle2 size={20} /> : num}
              </div>
              <div className='flex flex-col text-left'>
                <span className={`text-xs uppercase tracking-widest ${step === num ? 'text-white font-bold' : 'text-blue-300'}`}>Paso {num}</span>
                <span className={`text-sm ${step === num ? 'text-white font-medium' : 'text-blue-200'}`}>
                  {num === 1 ? 'Tu Organización' : num === 2 ? 'Cuenta de Admin' : 'Selección de Plan'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className='absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl' />
      </div>

      {/* LADO DERECHO: FORMULARIO */}
      <div className='flex-1 bg-[#0F172A] overflow-y-auto h-full custom-scrollbar'>
        <div className='min-h-full flex flex-col items-center justify-center p-8 md:p-16'>
          <div className='max-w-xl w-full py-10'>
            
            {step === 1 && (
              <div key='step1' className='animate-slide-in'>
                <div className='flex items-center gap-2 text-blue-400 mb-2'>
                  <Building size={20} />
                  <span className='text-sm font-bold uppercase'>Configuración Inicial</span>
                </div>
                <h1 className='text-3xl font-bold mb-8 text-left'>Datos de la Empresa</h1>
                
                <div className='space-y-5 text-left'>
                  <div>
                    <label className='block text-sm font-medium text-gray-400 mb-2'>Nombre de la Organización</label>
                    <input name='name' maxLength={100} value={formData.name} onChange={handleChange} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Ej. TechSolutions' />
                  </div>
                  
                  <div className='grid md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-400 mb-2'>Correo Corporativo</label>
                      <input name='company_email' type='email' maxLength={100} value={formData.company_email} onChange={handleChange} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='admin@empresa.com' />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-400 mb-2'>Teléfono sin extensión</label>
                      <div className='flex items-center bg-[#1E293B] border border-gray-700 rounded-xl px-4 focus-within:border-blue-500 transition text-left'>
                        <Phone size={18} className='text-gray-500' />
                        <input name='phone_number' maxLength={15} value={formData.phone_number} onChange={handleChange} className='bg-transparent py-3.5 px-2 w-full outline-none' placeholder='0123456789' />
                      </div>
                    </div>
                  </div>

                  <div className='relative text-left'>
                    <label className='block text-sm font-medium text-gray-400 mb-2'>Estado</label>
                    <div onClick={() => setIsSelectOpen(!isSelectOpen)} className={`flex items-center justify-between w-full bg-[#1E293B] border cursor-pointer rounded-xl px-4 py-3.5 transition ${isSelectOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-700'}`}>
                      <div className='flex items-center gap-2 text-sm'>
                        <MapPin size={18} className='text-gray-500' />
                        <span className={formData.state ? 'text-white' : 'text-gray-500'}>{formData.state || 'Selecciona un estado...'}</span>
                      </div>
                      <ChevronDown size={18} className={`text-gray-500 transition-transform ${isSelectOpen ? 'rotate-180' : ''}`} />
                    </div>
                    {isSelectOpen && (
                      <div className='absolute z-50 w-full mt-2 bg-[#1E293B] border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
                        <div className='max-h-[200px] overflow-y-auto custom-scrollbar'>
                          {mexicanStates.map((estado) => (
                            <div key={estado} onClick={() => handleSelectState(estado)} className='px-6 py-3 hover:bg-blue-600 cursor-pointer transition text-sm text-gray-300 hover:text-white'>
                              {estado}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={verifyEnterprise} 
                    disabled={isLoading}
                    className={`w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Verificando...' : 'Siguiente paso'} <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: ADMIN */}
            {step === 2 && (
              <div key='step2' className='animate-slide-in'>
                <button onClick={prevStep} className='text-gray-500 hover:text-white mb-6 text-sm flex items-center gap-1 transition-colors'>← Volver</button>
                <div className='flex items-center gap-2 text-blue-400 mb-2'>
                  <UserPlus size={20} />
                  <span className='text-sm font-bold uppercase'>Acceso Maestro</span>
                </div>
                <h1 className='text-3xl font-bold mb-8 text-left'>Cuenta de Administrador</h1>
                
                <div className='space-y-5 text-left'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <input name='first_name' maxLength={50} onChange={handleChange} value={formData.first_name} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Nombre' />
                    <input name='paternal_last_name' maxLength={50} onChange={handleChange} value={formData.paternal_last_name} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Apellido paterno' />
                    <input name='maternal_last_name' maxLength={50} onChange={handleChange} value={formData.maternal_last_name} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Apellido materno' />
                  </div>
                  
                  <div className='grid md:grid-cols-2 gap-4'>
                    <div className='flex items-center bg-[#1E293B] border border-gray-700 rounded-xl px-4 focus-within:border-blue-500 transition'>
                      <Mail size={18} className='text-gray-500' />
                      <input name='email' type='email' maxLength={100} value={formData.email} onChange={handleChange} className='bg-transparent py-3.5 px-2 w-full outline-none' placeholder='Email Personal' />
                    </div>
                    <div className='flex items-center bg-[#1E293B] border border-gray-700 rounded-xl px-4 focus-within:border-blue-500 transition'>
                      <Phone size={18} className='text-gray-500' />
                      <input name='phone' maxLength={15} value={formData.phone} onChange={handleChange} className='bg-transparent py-3.5 px-2 w-full outline-none' placeholder='Teléfono sin extension' />
                    </div>
                  </div>

                  <div className='grid md:grid-cols-2 gap-4'>
                    <input name='username' maxLength={30} value={formData.username} onChange={handleChange} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Usuario' />
                    <div className='relative'>
                      <input name='password' type='password' maxLength={128} value={formData.password} onChange={handleChange} className='w-full bg-[#1E293B] border border-gray-700 rounded-xl px-4 py-3.5 focus:border-blue-500 outline-none transition' placeholder='Contraseña' />
                      <Lock size={18} className='absolute right-4 top-4 text-gray-600' />
                    </div>
                  </div>

                  {/* ✅ Indicador de requisitos de contraseña */}
                  {formData.password.length > 0 && (
                    <div className='grid grid-cols-2 gap-1.5 mt-1'>
                      {[
                        { ok: formData.password.length >= 12,                                                    label: 'Mínimo 12 caracteres' },
                        { ok: /[A-Z]/.test(formData.password),                                                   label: '1 letra mayúscula' },
                        { ok: /\d/.test(formData.password),                                                      label: '1 número' },
                        { ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),                 label: '1 carácter especial' },
                      ].map(({ ok, label }) => (
                        <div key={label} className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-400' : 'text-gray-500'}`}>
                          <span>{ok ? '✓' : '○'}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    onClick={validateAdmin} 
                    disabled={isLoading}
                    className={`w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Validando...' : 'Configurar Plan'} <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: PLAN */}
            {step === 3 && (
              <div key='step3' className='animate-slide-in'>
                <button onClick={prevStep} className='text-gray-500 hover:text-white mb-6 text-sm flex items-center gap-1'>← Volver</button>
                <div className='text-center mb-8'>
                  <h1 className='text-3xl font-bold mb-3'>Selecciona tu Plan</h1>
                  <div className='flex items-center justify-center gap-3 bg-[#1E293B] w-fit mx-auto p-1 rounded-full border border-gray-700'>
                    <button onClick={() => setIsAnnual(false)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${!isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Mensual</button>
                    <button onClick={() => setIsAnnual(true)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${isAnnual ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Anual (-20%)</button>
                  </div>
                </div>

                <div className='space-y-3'>
                  {plans.map(plan => {
                    const price = getSelectedPlan(
                      plan.key,
                      isAnnual ? 'ANNUAL' : 'MONTHLY'
                    );

                    const isSelected = selectedPlan?.id === price?.id;

                    return (
                      <div
                        key={plan.key}
                        onClick={() => setSelectedPlan(price)}
                        className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-800 bg-gray-800/40 hover:border-gray-600'
                          }`}
                      >
                        <div className='flex justify-between items-center'>
                          <div className='text-left'>
                            <div className='flex items-center gap-2'>
                              <h3 className='font-bold text-lg'>{plan.label}</h3>
                              {plan.highlight && (
                                <span className='text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold'>
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className='text-xs text-gray-400 mt-1'>{plan.desc}</p>
                          </div>

                          <div className='text-right'>
                            <div className='text-xl font-bold'>
                              ${price?.unit_amount ? (price.unit_amount / 100).toLocaleString() : '0'}
                            </div>
                            <div className='text-[10px] text-gray-500 uppercase font-bold'>
                              MXN / {isAnnual ? 'AÑO' : 'MES'}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className='absolute -right-2 -top-2 bg-blue-600 rounded-full p-1'>
                            <Check size={14} className='text-white' />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className='mt-8 p-6 bg-blue-900/20 border border-blue-500/20 rounded-2xl mb-6'>
                  <div className='flex justify-between items-center'>
                    <div className='text-left'>
                      <p className='text-gray-400 text-xs font-bold uppercase mb-1'>Total a pagar:</p>
                      <p className='text-xs text-blue-400 italic'>
                        {selectedPlan ? `Plan ${plans.find(p => p.key === selectedPlan.planName)?.label}` : 'Selecciona un plan'}
                      </p>
                    </div>
                    <div className='text-right'>
                      <span className='text-3xl font-black'>
                        ${selectedPlan ? (selectedPlan.unit_amount / 100).toLocaleString() : '0'}
                        <span className='text-sm font-normal text-gray-400 ml-1'>MXN</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className='text-center mb-6'>
                  <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)}/>
                </div>

                <button 
                  className='w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-lg shadow-xl transition-all active:scale-95 uppercase' 
                  onClick={validatePlan}
                  disabled={!selectedPlan || isLoading || !captchaToken}
                >
                  {isLoading ? 'Procesando...' : 'Finalizar y Pagar'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3B82F6; }
      `}} />
    </div>
  );
};

export default Register;