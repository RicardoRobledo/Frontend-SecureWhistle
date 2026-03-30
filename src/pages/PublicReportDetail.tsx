import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Check, Lock, ChevronRight, Fingerprint, Search, Calendar, MapPin, User, FileText, Upload, Plus, Trash2, ArrowLeft, Clock, MessageCircle, Send, Paperclip } from 'lucide-react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { Report, AccessLevel } from '../types';
import { useApp } from '../context/AppContext';
import { Toaster, toast } from 'sonner';
import { useTenant } from '../context/TenantContext';
import { API_BASE_URL, TURNSTILE_SITE_KEY } from '../config/api';
import { Turnstile } from '@marsidev/react-turnstile';
import { CLASSIFICATIONS, RELATIONS, REPORT_STATUS, ROLE_DEFINITIONS, MAX_FILES, MAX_SIZE_IMAGE, MAX_SIZE_PDF } from '../constants';

import axios from 'axios';


const PublicReportDetail: React.FC = () => {

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { portal, isCustomDomain, isLoading, portalError } = useTenant();
  const { addReport, reports, addFollowUp } = useApp();
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [businessUnits, setBusinessUnits] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [complaintId, setComplaintId] = useState<string>('');
  const [complaint, setComplaint] = useState<null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<'wizard' | 'tracking' | 'success'>('wizard');
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [files, setFiles] = useState<File[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const [trackingCode, setTrackingCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Follow-up state
  const [followUpText, setFollowUpText] = useState('');
  const [followUpFiles, setFollowUpFiles] = useState<File[]>([]);
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);

  useEffect(() => {
  // Si aún no hay portal o está cargando, no hacemos nada
  if (!portal || isLoading || portalError) return;

  const controller = new AbortController();

  const loadCatalogs = async () => {
    try {
      const [statesRes, unitsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/${portal}/api/v1/catalogs/public-states/`, {
          signal: controller.signal,
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }),
        axios.get(`${API_BASE_URL}/${portal}/api/v1/catalogs/public-business-units/`, {
          signal: controller.signal,
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }),
      ]);
      setStates(statesRes.data);
      setBusinessUnits(unitsRes.data);
    } catch (err: any) {
      if (axios.isCancel(err)) return;
      if (err.response?.status === 404) {
        toast.error('Portal no encontrado.');
      } else {
        toast.error('Error al cargar los catálogos.');
      }
    }
  };

  loadCatalogs();

  const mode = searchParams.get('mode');
  setView(mode === 'track' ? 'tracking' : 'wizard');

  return () => controller.abort();
  }, [portal]); 

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const [formData, setFormData] = useState({
    state: '',
    businessUnit: '',
    date: '',
    time: '',
    description: '',
    classification: '',
    involvedPeople: '',
    relation: '',
    name: '',
    email: '',
    phone: '',
    channel: ''
  });

  const currentStatus = REPORT_STATUS.findIndex(s => s.key === complaint?.status);

  const getRoleLabel = (roleId: string) => {
    const role = ROLE_DEFINITIONS.find(r => r.id === roleId);
    return role ? role.label : roleId;
  };

  const isFutureDateTime = () => {
    if (!formData.date) return false;

    const now = new Date();

    // Si NO hay hora → validar solo la fecha
    if (!formData.time) {
        const selectedDate = new Date(formData.date);
        const today = new Date(now.toDateString()); // hoy 00:00

        return selectedDate > today;
    }

    // Si hay hora → validar fecha + hora
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    return selectedDateTime > now;
  };


  const handleOpenFile = async (
    fileId: number,
    ext: string
  ) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/${portal}/api/v1/complaints/public-complaint/${complaint?.id}/chat/${complaint?.chat?.id}/message-file/${fileId}/`,
        {
          responseType: "blob",
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }
      );

      const blob = response.data;

      // Mapeo de extensiones a MIME types
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };

      const mimeType = mimeTypes[ext.toLowerCase()] ?? "application/octet-stream";
      const typedBlob = new Blob([blob], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);

      // Abre en nueva pestaña (PDF e imágenes se renderizan directo)
      window.open(url, "_blank");

      // Limpia la URL después de un momento
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);

    } catch (error) {
      toast.error("No se pudo abrir el archivo.");
    }
  };


  const handleNext = async () => {
    // Validación de fecha futura
    if (step === 1) {
        if (!formData.state) {
            toast.error('Selecciona un estado o sede.'); return;
        }
        if (!formData.businessUnit) {
            toast.error('Selecciona una unidad de negocio.'); return;
        }
        if (!formData.date || !formData.time) {
            toast.error('Ingresa una fecha y hora aproximada del incidente.'); return;
        }
        if (isFutureDateTime()) {
            toast.error('La fecha y hora no pueden estar en el futuro.'); return;
        }
    }

    if (step === 2) {
        if (!formData.classification) {
        toast.error('Selecciona el tipo de incidente.'); return;
        }
        if (!formData.description.trim() || formData.description.trim().length < 20) {
        toast.error('La descripción debe tener al menos 20 caracteres.'); return;
        }
    }

    if (step === 4) {
        // Nombre — solo letras y espacios si se ingresó
        if (formData.name.trim()) {
            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.name.trim())) {
                toast.error('El nombre solo puede contener letras y espacios.'); return;
            }
        }

        // Email — formato válido si se ingresó
        if (formData.email.trim()) {
            if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
                toast.error('El formato del correo es inválido.'); return;
            }
        }

        if (!formData.relation) {
            toast.error('Selecciona tu relación con la empresa.'); return;
        }

        // Teléfono — 10 dígitos si se ingresó
        if (formData.phone.trim()) {
            if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
                toast.error('El teléfono solo puede contener números.'); return;
            }
            const cleaned = formData.phone.replace(/\D/g, '');
            if (cleaned.length !== 10) {
                toast.error('El teléfono debe tener 10 dígitos.'); return;
            }
        }
    }

    if (step < totalSteps) {
        setStep(step + 1);
    } else {
        toast.info('Por favor espera mientras verificamos la información y enviamos tu denuncia...');
        await handleSubmitComplaint();
        window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (step > 1) {
        setStep(step - 1);
    } else {
        navigate('/');
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);

    const sanitizedCode = trackingCode.trim();

    if (!/^CMP-[a-zA-Z0-9]+$/.test(sanitizedCode)) {
        toast.error('Formato inválido.');
        setIsSearching(false);
        return;
    }

    try {
        const complaintRes = await axios.get(
        `${API_BASE_URL}/${portal}/api/v1/complaints/public-complaint/${sanitizedCode}/`,
        { headers: { 'ngrok-skip-browser-warning': 'true' }}
        );

        const complaintData = complaintRes.data;
        setComplaint(complaintData);

        if (complaintData.chat.id) {
            const chatHistory = await axios.get(
                `${API_BASE_URL}/${portal}/api/v1/complaints/public-complaint/${sanitizedCode}/chat/${complaintData.chat.id}/history/`,
                { headers: { 'ngrok-skip-browser-warning': 'true' }}
            );

            setChatMessages(chatHistory.data.messages);
        }

        setCaptchaToken(null);
        setShowCaptcha(false);

    } catch (error) {
        toast.error('No se encontró ninguna denuncia con ese código.');
    }

    setIsSearching(false);
    };

  const handleSendMessage = async (token?: string) => {

    const captcha = token ?? captchaToken;

    if (!captcha) {
        toast.error('El captcha no ha sido verificado');
        return;
    }

    if (!followUpText && followUpFiles.length === 0) {
        toast.error('El mensaje es obligatorio.');
        return;
    }

    setIsSendingFollowUp(true);

    try {

        const form = new FormData();
        form.append("message", followUpText);
        form.append("captcha_token", captcha);   // ← usa el captcha correcto

        followUpFiles.forEach(file => {
            form.append("files", file);
        });

        const res = await axios.post(
            `${API_BASE_URL}/${portal}/api/v1/complaints/public-complaint/${complaint?.id}/chat/${complaint?.chat?.id}/`,
            form,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                    'ngrok-skip-browser-warning': 'true'
                },
            }
        );

        setChatMessages(prev => [
            ...prev,
            {
                ...res.data,
                role: "DENUNCIANTE"
            }
        ]);

        setFollowUpText("");
        setFollowUpFiles([]);
        setCaptchaToken(null);
        setShowCaptcha(false);

        toast.success("Mensaje enviado correctamente.");

    } catch (error) {
        toast.error("Error al enviar el mensaje.");
    } finally {
        setIsSendingFollowUp(false);
    }
    };

  const validateImageDimensions = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.width > 4096 || img.height > 4096) {
            reject(new Error(`"${file.name}" excede las dimensiones máximas (4096×4096px).`));
        } else {
            resolve();
        }
        };
        img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`"${file.name}" no es una imagen válida.`));
        };
        img.src = url;
    });
  };

  const validateFiles = async (incoming: File[], existing: File[]): Promise<File[]> => {
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const valid: File[] = [];

    for (const file of incoming) {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!allowedExtensions.includes(ext)) {
        toast.error(`"${file.name}" tiene una extensión no permitida.`);
        continue;
        }

        const maxSize = ext === '.pdf' ? MAX_SIZE_PDF : MAX_SIZE_IMAGE;
        if (file.size > maxSize) {
        const mb = maxSize / (1024 * 1024);
        toast.error(`"${file.name}" excede el límite de ${mb} MB.`);
        continue;
        }

        // ── Validar dimensiones solo para imágenes ────────────────
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        try {
            await validateImageDimensions(file);
        } catch (err: any) {
            toast.error(err.message);
            continue;
        }
        }

        valid.push(file);
    }

    const combined = [...existing, ...valid];
    if (combined.length > MAX_FILES) {
        toast.error(`Máximo ${MAX_FILES} archivos permitidos.`);
        return combined.slice(0, MAX_FILES);
    }

    return combined;
    };

  const formatDateTime12h = (dateString: string) => {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 → 12

    const formattedHours = String(hours).padStart(2, '0');

    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
    };

  const handleSubmitComplaint = async () => {
    setIsSubmitting(true);
    try {
        const form = new FormData();

        // 1️⃣ Contexto
        form.append("state_id", formData.state);
        form.append("business_unit_id", formData.businessUnit);

        // Combinar fecha + hora
        const localDateTime = formData.time
            ? new Date(`${formData.date}T${formData.time}:00`)
            : new Date(`${formData.date}T00:00:00`);

        const incidentDateTime = localDateTime.toISOString();

        form.append("incident_date", incidentDateTime);

        // 2️⃣ Detalles
        form.append("classification", formData.classification);
        form.append("incident_description", formData.description);
        form.append("parties_involved", formData.involvedPeople);

        // 3️⃣ Contacto
        form.append("enterprise_relation", formData.relation || "ANONIMO");

        if(formData.name){
            form.append("name", formData.name);
        }
        if(formData.email){
            form.append("email", formData.email);
        }
        if(formData.phone){
            form.append("phone_number", formData.phone);
        }
        
        // Captcha token
        form.append("captcha_token", captchaToken);

        // 4️⃣ Archivos reales
        files.forEach((file) => {form.append("files", file);});

        const res = await axios.post(`${API_BASE_URL}/${portal}/api/v1/complaints/public-complaint/`,form,
            {
                headers: {
                "Content-Type": "multipart/form-data",
                'ngrok-skip-browser-warning': 'true'
                },
            }
        );

        setComplaintId(res.data.complaint_id);
        toast.success("Denuncia enviada correctamente");
        setView("success");

    } catch (error) {
        if(error.response?.status === 429) {
            toast.error('Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.');
        } else {
            toast.error("Error al enviar la denuncia");
        }
    } finally {
        setIsSubmitting(false);
    }
    };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2 relative">
       {Array.from({length: totalSteps}).map((_, i) => {
           const s = i + 1;
           const isActive = s === step;
           const isCompleted = s < step;
           return (
               <div key={s} className="flex flex-col items-center relative z-10">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 
                        ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 
                          isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                       {isCompleted ? <Check size={14} /> : s}
                   </div>
                   <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                       {s === 1 ? 'Contexto' : s === 2 ? 'Detalles' : s === 3 ? 'Evidencia' : 'Contacto'}
                   </span>
               </div>
           )
       })}
       <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -z-0 hidden md:block" style={{ left: '10%', width: '80%' }}></div>
    </div>
  );

  if (view === 'success') {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-10 rounded-3xl shadow-xl text-center border border-slate-100">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Reporte Recibido!</h2>
                <p className="text-slate-500 mb-6 text-sm">Hemos encriptado y guardado tu denuncia.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Tu Código de Seguimiento</p>
                    <p className="text-3xl font-mono font-bold text-slate-800 tracking-wider">{complaintId}</p>
                    <p className="text-xs text-slate-400 mt-2">Guarda este código para consultar el estado o añadir información después.</p>
                </div>
                <div className="space-y-3">
                    <button onClick={() => window.location.reload()} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Nuevo Reporte</button>
                    <button onClick={() => navigate('/')} className="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-800">Volver al Inicio</button>
                </div>
            </div>
        </div>
    );
  }

  if (view === 'tracking') {
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10 md:pb-20">
            <Toaster position="bottom-right" richColors />
            
            <nav className="p-4 md:p-6">
                <button 
                    onClick={() => isCustomDomain ? navigate('/public-report/') : navigate(`/${portal}/public-report/`)} 
                    className="flex items-center text-slate-500 hover:text-slate-900 font-medium text-sm gap-2 transition-colors"
                >
                    <ArrowLeft size={16} /> Volver
                </button>
            </nav>

            <div className="max-w-5xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="text-center mb-8 md:mb-10">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Search size={28} className="md:w-8 md:h-8" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Seguimiento de Denuncia</h1>
                    <p className="text-slate-500 mt-2 text-sm md:text-base">Consulta el progreso de tu reporte y mantén comunicación con el comité.</p>
                </div>

                {/* Search Form */}
                <form onSubmit={handleTrackSearch} className="relative mb-10 md:mb-12 max-w-lg mx-auto">
                    <input 
                        type="text"
                        maxLength={14}
                        value={trackingCode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z0-9\-]/g, '');
                            setTrackingCode(val);
                        }}
                        className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg bg-white border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center tracking-widest font-bold text-slate-800 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 shadow-sm"
                    />
                    <button 
                        disabled={!trackingCode || isSearching}
                        className="mt-3 w-full md:mt-0 md:absolute md:right-2 md:top-2 md:bottom-2 md:w-auto bg-slate-900 text-white px-6 py-3 md:py-0 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isSearching ? '...' : 'Consultar'}
                    </button>
                </form>

                {complaint && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
                        
                        {/* Status Column - Izquierda */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-slate-50 p-5 md:p-6 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900 text-lg">Reporte #{complaint.id}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <StatusBadge type="status" status={complaint.status} />
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{complaint.date}</span>
                                    </div>
                                </div>
                                
                                <div className="p-6 md:p-8">
                                    <div className="relative pl-6 space-y-8 border-l-2 border-slate-200 ml-2">
                                        {[
                                            { title: 'Denuncia Recibida', description: 'Tu denuncia fue registrada correctamente.' },
                                            { title: 'En Análisis', description: 'Un investigador está revisando los hechos.' },
                                            { title: 'Resolución', description: 'Conclusión final del proceso.' },
                                            { title: 'Descartada', description: 'La denuncia no procedió.' },
                                        ].map((step, index) => {
                                            const isActive = currentStatus === index;
                                            const isCompleted = currentStatus > index;
                                            const isDiscarded = step.title === 'Descartada' && isActive;

                                            return (
                                                <div key={index} className={`relative ${!isCompleted && !isActive ? 'opacity-40' : ''}`}>
                                                    <div className={`absolute -left-[35px] top-1 w-5 h-5 rounded-full border-4 border-white ring-4 shadow-sm transition-all duration-300
                                                        ${isDiscarded ? 'bg-red-500 ring-red-100' : 
                                                          isCompleted ? 'bg-green-500 ring-green-100' : 
                                                          isActive ? 'bg-blue-600 ring-blue-100 animate-pulse' : 'bg-slate-300 ring-slate-100'}`}
                                                    ></div>
                                                    <h4 className={`text-sm font-bold ${isDiscarded ? 'text-red-600' : 'text-slate-900'}`}>
                                                        {step.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {step.description}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Official Committee Message */}
                            <div className="bg-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-600/20 relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield size={18} className="text-blue-200" />
                                        <h5 className="text-xs font-bold uppercase tracking-widest text-blue-100">Mensaje Oficial</h5>
                                    </div>
                                    <p className="text-sm leading-relaxed font-medium">
                                        {complaint.status === REPORT_STATUS[2].key || complaint.status === REPORT_STATUS[3].key
                                            ? `${complaint.public_resolution_message || 'El comité ha concluido el caso.'}`
                                            : 'Su denuncia está en proceso de análisis. Aún no existe una resolución final.'}
                                    </p>
                                </div>
                                <Shield size={80} className="absolute -bottom-4 -right-4 text-white/10" />
                            </div>
                        </div>

                        {/* Communication Channel - Derecha */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col h-[500px] md:h-[650px] lg:h-[750px] w-full overflow-hidden">
                                {/* Header del Chat */}
                                <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                            <MessageCircle size={22} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 text-sm md:text-base truncate">Canal de Comunicación</h3>
                                            <p className="text-[11px] text-green-500 flex items-center gap-1 font-medium">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Canal activo
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Área de Mensajes */}
                                <div ref={chatContainerRef} className="flex-1 p-4 md:p-6 overflow-y-auto bg-[#f8fafc] space-y-6">
                                    {chatMessages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center opacity-40 px-4">
                                            <div className="w-16 h-16 bg-slate-200 rounded-full mb-4 flex items-center justify-center">
                                                <Clock size={32} className="text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500">No hay mensajes aún.</p>
                                            <p className="text-xs text-slate-400">Las actualizaciones aparecerán aquí.</p>
                                        </div>
                                    ) : (
                                        chatMessages.map((msg) => {
                                            const isDenunciante = msg.role === "DENUNCIANTE";
                                            const isInternalUser = !isDenunciante;

                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${
                                                        isDenunciante ? "justify-end" : "justify-start"
                                                    } items-end gap-2`}
                                                >

                                                    {/* IZQUIERDA → USUARIOS INTERNOS (BLANCO + Fingerprint) */}
                                                    {isInternalUser && (
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-cyan-50 flex-shrink-0 flex items-center justify-center border border-white shadow-sm">
                                                            <Fingerprint
                                                                size={18}
                                                                className="text-cyan-600"
                                                                strokeWidth={2.5}
                                                            />
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`flex flex-col ${
                                                            isDenunciante ? "items-end" : "items-start"
                                                        } max-w-[85%] md:max-w-[75%]`}
                                                    >
                                                        <div
                                                            className={`px-4 py-3 shadow-sm text-sm ${
                                                                isDenunciante
                                                                    ? "bg-blue-600 text-white rounded-2xl rounded-br-none shadow-blue-200"
                                                                    : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-none"
                                                            }`}
                                                        >
                                                            <div
                                                                className={`text-[10px] font-bold uppercase mb-1 ${
                                                                    isDenunciante
                                                                        ? "text-blue-100"
                                                                        : "text-slate-500"
                                                                }`}
                                                            >
                                                                {msg.role}
                                                            </div>

                                                            <p className="leading-relaxed break-words">
                                                                {msg.message}
                                                            </p>

                                                            {msg.files && msg.files.length > 0 && (
                                                                <div className="mt-3 space-y-2">
                                                                    {msg.files.map((file: any) => (
                                                                    <div
                                                                        key={file.id}
                                                                        onClick={() => handleOpenFile(file.id, file.ext)}
                                                                        className={`
                                                                        flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
                                                                        transition-all duration-200 cursor-pointer
                                                                        ${isDenunciante
                                                                            ? "bg-white/20 hover:bg-white/30 text-white border border-white/20"
                                                                            : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"}
                                                                        `}
                                                                    >
                                                                        <Paperclip
                                                                        size={14}
                                                                        className={isDenunciante ? "text-white/80" : "text-blue-500"}
                                                                        />
                                                                        <span className="truncate max-w-[180px]">
                                                                        {file.original_name}{file.ext}
                                                                        </span>
                                                                    </div>
                                                                    ))}
                                                                </div>
                                                                )}
                                                        </div>

                                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                            {formatDateTime12h(msg.created_at)}
                                                        </span>
                                                    </div>

                                                    {/* DERECHA → DENUNCIANTE (AZUL + User icon) */}
                                                    {isDenunciante && (
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-50 flex-shrink-0 flex items-center justify-center border border-white shadow-sm">
                                                            <User
                                                                size={18}
                                                                className="text-blue-600"
                                                                strokeWidth={2.5}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                            
                                    )}
                                </div>

                                {/* Input Area */}
                                <div className="p-3 md:p-4 bg-white border-t border-slate-100">
                                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-2 ..."
                                        onDragOver={(e) => {
                                            e.preventDefault(); // importante
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            const droppedFiles = Array.from(e.dataTransfer.files);
                                            setFollowUpFiles(await validateFiles(droppedFiles, followUpFiles));
                                        }}
                                        >
                                        {followUpFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {followUpFiles.map((file, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-medium border border-blue-200 shadow-sm"
                                                >
                                                    <Paperclip size={12} />
                                                    
                                                    <span className="max-w-[120px] truncate">
                                                    {file.name}
                                                    </span>

                                                    <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFollowUpFiles(prev =>
                                                        prev.filter((_, idx) => idx !== i)
                                                        )
                                                    }
                                                    className="hover:text-red-500 transition-colors"
                                                    >
                                                    <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                ))}
                                            </div>
                                        )}
                                                                                                                                
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            className="hidden"
                                            id="chatFileUpload"
                                            onChange={async (e) => {
                                                if (!e.target.files) return;
                                                const newFiles = Array.from(e.target.files);
                                                setFollowUpFiles(await validateFiles(newFiles, followUpFiles));
                                            }}
                                        />
                                        <textarea 
                                            placeholder="Escribe un mensaje..."
                                            value={followUpText}
                                            onChange={(e) => setFollowUpText(e.target.value)}
                                            rows={2}
                                            maxLength={1000}
                                            className="w-full bg-transparent border-none p-2 text-sm focus:outline-none resize-none text-slate-700"
                                        />
                                        <p className={`text-xs text-right mt-1 ${
                                            followUpText.length > 1000 ? 'text-red-500' : 'text-gray-400'
                                        }`}>
                                            {followUpText.length}/1000
                                        </p>
                                        
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 mt-2">
                                            <label
                                                htmlFor="chatFileUpload"
                                                className="p-2 text-slate-500 hover:text-blue-600 transition-all flex items-center gap-2 text-[11px] font-bold cursor-pointer"
                                                >
                                                <Paperclip size={18} />
                                                <span className="hidden sm:inline">Adjuntar</span>
                                            </label>
                                                                                            
                                            <button 
                                                disabled={
                                                    isSendingFollowUp ||
                                                    (!followUpText.trim() && followUpFiles.length === 0)
                                                }
                                                onClick={() => {
                                                    if (!showCaptcha) {
                                                        setShowCaptcha(true);
                                                    }
                                                }}
                                                className="bg-blue-600 text-white pl-4 pr-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
                                            >
                                                {isSendingFollowUp ? 'Enviando...' : (
                                                    <>
                                                        <span className="hidden sm:inline">ENVIAR</span>
                                                        <Send size={14} />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {showCaptcha && (
                                <div className="mt-2 text-center">
                                    <Turnstile
                                        siteKey={TURNSTILE_SITE_KEY}
                                        onSuccess={(token) => {
                                            setCaptchaToken(token);
                                            handleSendMessage(token);
                                        }}
                                        onExpire={() => setCaptchaToken(null)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
        <Toaster position="bottom-right" richColors />
        <div className="px-6 py-6 flex justify-between items-center max-w-2xl mx-auto">
            <button onClick={() => {isCustomDomain ? navigate(`/public-report`) : navigate(`/${portal}/public-report`)}} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Shield size={24} />
            </button>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nueva Denuncia</div>
            <div className="w-6"></div>
        </div>

        <div className="max-w-xl mx-auto px-6 mt-4">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">
                    {step === 1 && "¿Dónde y Cuándo?"}
                    {step === 2 && "Cuéntanos qué pasó"}
                    {step === 3 && "¿Tienes pruebas?"}
                    {step === 4 && "Información de Contacto"}
                </h1>
                <p className="text-slate-500 text-sm mt-2">
                    {step === 1 && "Empecemos por ubicar el incidente."}
                    {step === 2 && "Describe los hechos y las personas involucradas."}
                    {step === 3 && "Sube 1 o más archivos de evidencia."}
                    {step === 4 && "Puedes hacerlo totalmente anónimo si prefieres."}
                </p>
            </div>

            {renderStepIndicator()}

            <form className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white p-8 animate-in slide-in-from-bottom-4 duration-500">
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Estado o sede</label>
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                value={formData.state}
                                onChange={(e) => setFormData({...formData, state: e.target.value})}
                            >
                                <option value="">Seleccionar...</option>
                                {states.map(c => <option key={c.id} value={c.id}>{c.state_headquearters}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Unidad de Negocio</label>
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                value={formData.businessUnit}
                                onChange={(e) => setFormData({...formData, businessUnit: e.target.value})}
                            >
                                <option value="">Seleccionar...</option>
                                {businessUnits.map(u => <option key={u.id} value={u.id}>{u.business_unit}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Fecha Aproximada</label>
                                <input 
                                    type="date"
                                    max={(() => {
                                        const now = new Date();
                                        const year = now.getFullYear();
                                        const month = String(now.getMonth() + 1).padStart(2, '0');
                                        const day = String(now.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    })()}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Hora Aproximada</label>
                                <div className="relative">
                                    <input 
                                        type="time" 
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                                    />
                                    <Clock size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Tipo de Incidente</label>
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                value={formData.classification}
                                onChange={(e) => setFormData({...formData, classification: e.target.value})}
                            >
                                <option value="">Seleccionar clasificación...</option>
                                {CLASSIFICATIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Descripción detallada</label>
                            <textarea
                                rows={6}
                                maxLength={2000}
                                placeholder="Escribe aquí los detalles de lo sucedido..."
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800 resize-none"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            ></textarea>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-700">Personas Implicadas (Opcional)</label>
                             <textarea
                                rows={3}
                                maxLength={500}
                                placeholder="Indica nombre(s), cargo(s) o descripción..."
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800 resize-none"
                                value={formData.involvedPeople}
                                onChange={(e) => setFormData({...formData, involvedPeople: e.target.value})}
                             />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6">
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={async (e) => {
                                if (!e.target.files) return;
                                const newFiles = Array.from(e.target.files);
                                setFiles(await validateFiles(newFiles, files));
                            }}
                            className="hidden"
                            id="fileUpload"
                            />

                        <label
                            htmlFor="fileUpload"
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group block"
                        >
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Upload size={20} />
                            </div>
                            <p className="font-bold text-slate-700">Subir Evidencias</p>
                            <p className="text-xs text-slate-400 mt-1">Imágenes, pdf y word</p>
                        </label>

                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Los archivos PDF no deben contener imágenes incrustadas. Si tienes imágenes como evidencia, súbelas por separado en formato JPG o PNG.
                            </p>
                        </div>

                        {files.length > 0 ? (
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100"
                                >
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <FileText size={16} className="text-blue-500" />
                                    {file.name}
                                    </div>

                                    <button
                                    type="button"
                                    onClick={() =>
                                        setFiles(files.filter((_, i) => i !== index))
                                    }
                                    className="text-slate-400 hover:text-red-500"
                                    >
                                    <Trash2 size={16} />
                                    </button>
                                </div>
                                ))}
                            </div>
                            ) : (
                            <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-400 italic">
                                No hay archivos.
                            </div>
                            )}
                        </div>
                )}

                {step === 4 && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                            <Lock className="text-blue-600 mt-1 shrink-0" size={18} />
                            <div>
                                <p className="text-sm font-bold text-blue-900">¿Deseas ser contactado?</p>
                                <p className="text-xs text-blue-700 mt-1">Sí dejas vacíos los campos opcionales será 100% anónimo.</p>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Relación con la empresa</label>
                            <select 
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-all font-medium text-slate-800"
                                value={formData.relation}
                                onChange={(e) => setFormData({...formData, relation: e.target.value})}
                            >
                                <option value="">Seleccionar...</option>
                                {RELATIONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Nombre (Opcional)</label>
                            <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl focus:bg-white font-medium text-slate-800"
                                value={formData.name}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== '' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val)) return;
                                    setFormData({...formData, name: val});
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Correo (Opcional)</label>
                                <input
                                    type="email"
                                    maxLength={100}
                                    value={formData.email}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-medium text-slate-800"
                                    onChange={(e) => {
                                    const val = e.target.value.replace(/[^a-zA-Z0-9@._+\-]/g, '');
                                    setFormData({...formData, email: val});
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Teléfono (Opcional)</label>
                                <input
                                    type="tel"
                                    maxLength={15}
                                    value={formData.phone}
                                    className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl font-medium text-slate-800"
                                    onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== '' && !/^[\d\s\-\+\(\)]*$/.test(val)) return;
                                    setFormData({...formData, phone: val});
                                    }}
                                />
                            </div>
                        </div>
                        <div className='text-center mb-6'>
                            <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)}/>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
                    <button type="button" onClick={handleBack} className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                        {step === 1 ? 'Cancelar' : 'Atrás'}
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        disabled={isSubmitting}
                        className="flex-[2] py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                        {step === totalSteps ? (
                            isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Enviando...
                            </>
                            ) : (
                            'Enviar Denuncia'
                            )
                        ) : (
                            <>
                            Continuar
                            <ChevronRight size={18} />
                            </>
                        )}
                        </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default PublicReportDetail;
