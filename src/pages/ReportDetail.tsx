import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  AlertCircleIcon,
  FileText,
  FileImage,
  File, Save, Calendar, MapPin, Building, User, ArrowLeft,
  AlertTriangle, Clock, Users, ShieldAlert, History, MessageCircle, Send, 
  ShieldCheck, Paperclip, Activity, Shield, Search, ExternalLink, Megaphone,
  ChevronDown, Sparkles, Brain, Scale, Gavel, CheckCircle2,
  LayoutList, Zap, Info, ChevronRight, Lock, Plus, Globe, AlertOctagon, Download,
  FileSearch, TrendingUp, BarChart, Eye, ShieldQuestion, Cpu, Binary, Fingerprint,
  Link as LinkIcon, BookOpen, Briefcase, Mail, Phone
} from 'lucide-react';

import { GoogleGenAI, Type } from "@google/genai";
import { MOCK_USERS, ROLE_DEFINITIONS, PRIORITIES, CLASSIFICATIONS, REPORT_STATUS, MAX_FILES, MAX_SIZE_IMAGE, MAX_SIZE_PDF } from '../constants';
import { ReportStatus, Priority, complaint, RiskScore, AIAnalysis } from '../types';
import { useApp } from '../context/AppContext';
import { API_BASE_URL } from '../config/api';
import api from '../utils/api';
import { toast, Toaster } from 'sonner';
import { useTenant } from '../context/TenantContext';
import { get } from 'http';


const ReportDetail: React.FC = () => {
  const { userRole } = useOutletContext<{ userRole: string | null }>();
  const { id } = useParams<{ id: string }>();
  const sanitizedId = encodeURIComponent(id || '');
  const { portal, isCustomDomain } = useTenant();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLogs, setAuditLogs] = useState<{ results: any[] }>({results: []});
  const [complaint, setComplaint] = useState<any>(null);
  const [complaintFollowUps, setComplaintFollowUps] = useState<any[]>([]);
  const { reports, updateReport, updateReportAIAnalysis } = useApp();

  const [selectedForensicUser, setSelectedForensicUser] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [committeeMessage, setCommitteeMessage] = useState('');
  const [committeeFiles, setCommitteeFiles] = useState<File[]>([]);
  
  // IA Specific State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [dataProcessed, setDataProcessed] = useState(false);
  const [isLoadingComplaint, setIsLoadingComplaint] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Estados locales para edición
  const [forensicUsers, setForensicUsers] = useState<any[]>([]);
  const [editedStatus, setEditedStatus] = useState('');
  const [editedPriority, setEditedPriority] = useState('');
  const [editedResponsible, setEditedResponsible] = useState<number | null>(null);
  const [editedAccessLevel, setEditedAccessLevel] = useState('');
  const [editedPublicResolution, setEditedPublicResolution] = useState('');
  const [editedRisk, setEditedRisk] = useState<RiskScore>({ 
    financial: 0, financialJustification: '',
    legal: 0, legalJustification: '',
    reputational: 0, reputationalJustification: ''
  });

  const isSuper = userRole === ROLE_DEFINITIONS[0].id;
  const isInvestigador = userRole === ROLE_DEFINITIONS[4].id;
  const isGestor = userRole === ROLE_DEFINITIONS[3].id;
  const isCompliance = userRole === ROLE_DEFINITIONS[2].id;
  const isAuditor = userRole === ROLE_DEFINITIONS[5].id;

  const canSeeInfo = isSuper || isInvestigador || isGestor || isCompliance;
  const canAssign = isSuper || isGestor;
  const canSeeCommittee = isSuper || isInvestigador || isCompliance;
  const canChatWithInformant = isSuper || isInvestigador || isGestor;
  const canEditRisk = isSuper || isGestor || isCompliance;
  const canSeeIA = isSuper || isInvestigador;
  const canCloseCase = isSuper || isGestor || isCompliance;
  const canSeeTrazability = isSuper || isAuditor;

  // If the user is an auditor, default to the 'audit' tab, otherwise default to "info"
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'risk' | 'audit' | 'ia' | 'committee'>(isAuditor ? 'audit' : 'info');

  const responsibleOptions = [
    // Si no hay asignado → "Sin Responsable"
    ...(complaint?.assigned_to
      ? []
      : [{ key: '', label: 'Sin Responsable' }]),

    // Si es forense y no hay usuarios cargados → mostrar "Tú"
    ...(isInvestigador && forensicUsers.length === 0
      ? [{ key: complaint?.assigned_to ?? '', label: 'Tú' }]
      : forensicUsers?.map((u: any) => ({
          key: u.id,
          label: `${u.first_name} ${u.paternal_last_name}`
        })) || []
    )
  ];

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (isAuditor) {
        await verifyComplaint(controller.signal);
      } else {
        await getComplaintData(controller.signal);
        if (userRole !== ROLE_DEFINITIONS[4].id) {
          await getForensicUsers(controller.signal);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    if (activeTab === 'chat') {
      getChatHistory();
    } else if (activeTab === 'committee') {
      getComplaintFollowUps();
    } else if (activeTab === 'audit') {
      getAuditLogs();
    } else if (activeTab === 'ia') {
      setIsTabLoading(true);
      setAiAnalysis(null);
      setDataProcessed(false);
      setIsProcessing(false);

      const load = async () => {
        // Tiempo mínimo para que el loader se vea bien
        const minDelay = new Promise(resolve => setTimeout(resolve, 1500));

        // API call
        await getForensicAnalysis(controller.signal);

        // Espera a que pasen al menos 1.5s Y la API haya respondido
        await minDelay;

        setIsTabLoading(false);  // ← solo apaga el loader cuando todo terminó
      };

      load();

      return () => controller.abort();
    }

    return () => controller.abort();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && chatHistory.length > 0) {
      setTimeout(() => {
        scrollToBottom('auto');
      }, 50);
    }
  }, [chatHistory]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const processData = async () => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/process-files/`;
    try {
      setIsProcessing(true);
      await api.post(`${API_BASE_URL}/${url}`);
      toast.success('El procesamiento puede tardar un rato. Por favor regresa más tarde.');
    } catch (err: any) {
      if (err?.status === 404) {
        toast.info('Los datos de la denuncia no han sido procesados.');
      } else {
        toast.error('Error al iniciar el procesamiento.');
      }
    }
  };

  const beginForensicAnalysis = async () => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/forensic-analysis/`;
    try {
      setIsProcessing(true);
      const res = await api.post(`${API_BASE_URL}/${url}`);
      if (res.data.status === 'COMPLETADO') {
        setDataProcessed(true);
        setIsProcessing(false);
        toast.info('Los datos de esta denuncia han sido procesados.');
      } else if (res.data.status === 'EN_PROGRESO') {
        toast.info('El análisis puede tardar un rato. Por favor regresa más tarde.');
      } else if(res.data.status === 'NO_PROCESADO'){
        setIsProcessing(false);
        toast.info('Los datos de esta denuncia no han sido procesados.');
      }
    } catch (err: any) {
      if (err?.response?.status === 403) {
        const detail = err?.response?.data?.detail || '';
        if (detail.includes('Límite de análisis forenses')) {
          toast.error('Has alcanzado el límite de análisis forenses de tu plan para este mes.');
        } else {
          toast.error('No tienes permiso para realizar esta acción.');
        }
      }else{
        setIsAnalyzing(false);
        setIsProcessing(false);
        toast.error('Error al procesar, es probable que sea un problema de formato o límite de páginas a procesar.');
      }
    }
  };

  const getProcessedComplaintFilesStatus = async (signal?: AbortSignal) => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/processed-files/status/`;
    try {
      const res = await api.get(`${API_BASE_URL}/${url}`, { signal });
      if (res.data.status === 'COMPLETADO') {
        setDataProcessed(true);
        setIsProcessing(false);
        toast.info('Los datos de esta denuncia han sido procesados.');
      } else if (res.data.status === 'EN_PROGRESO') {
        setIsProcessing(true);
        toast.info('El procesamiento puede tardar un rato. Por favor regresa más tarde.');
      } else if(res.data.status === 'NO_PROCESADO'){
        setIsProcessing(false);
        toast.info('Los datos de esta denuncia no han sido procesados.');
      }
    } catch (err: any) {
      setIsAnalyzing(false);
      setIsProcessing(false);
      toast.error('Error al procesar, es probable que sea un problema de formato o límite de páginas a procesar.');
    }
  };

  const getForensicAnalysis = async (signal?: AbortSignal) => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/retrieve-forensic-analysis/`;
    try {
      const response = await api.get(`${API_BASE_URL}/${url}`, { signal });

      if(response.status===202){
        setIsProcessing(true);
        toast.info('El análisis forense está en progreso. Por favor regresa más tarde.');
      }else{
        const ai_analysis = response.data.processed_data.ai_analysis;
        setAiAnalysis(ai_analysis);
        setIsProcessing(false);
        setIsAnalyzing(false);
        toast.success('El análisis forense ha sido completado.');
      }
    } catch (err: any) {
      if (err?.status === 404) {
        const controller = new AbortController();
        await getProcessedComplaintFilesStatus(controller.signal);
      }else if(err?.status === 500){
        setAiAnalysis({
          riskLevel: 'fallido',
          urgencyScore: 0,
          impactScore: 0,
          justification: err?.response?.data?.error_detail || 'El análisis no pudo completarse.',
          executiveSummary: 'Ocurrió un error durante el análisis forense. Por favor intenta iniciar un nuevo análisis.',
          escalationAlert: null,
          mexicanLegalFramework: '',
          investigationChecklist: [],
          suggestedQuestions: [],
          isError: true,   // ← flag para manejar UI de error
        });
        setIsProcessing(false);
        setIsAnalyzing(false);
      }
    }
  };

  const getAuditLogs = async (page = 1, signal?: AbortSignal) => {
    try {
      setIsLoadingAudit(true);
      const res = await api.get(
        `${API_BASE_URL}/${portal}/api/v1/audit-logs/`,
        { signal, params: { complaint_id: sanitizedId, page } }
      );
      setAuditLogs(res.data);
      setAuditPage(page);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener los registros de trazabilidad.');
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const getChatHistory = async (signal?: AbortSignal) => {
    try {
      setIsLoadingChat(true);
      const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/chat/${complaint?.chat?.id}/history/`;
      const res = await api.get(`${API_BASE_URL}/${url}`, { signal });
      setChatHistory(res.data || []);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener el historial del chat.');
    } finally {
      setIsLoadingChat(false);
    }
  };

  const getComplaintFollowUps = async (signal?: AbortSignal) => {
    try {
      const res = await api.get(
        `${API_BASE_URL}/${portal}/api/v1/complaints/complaint/${sanitizedId}/follow-ups/`,
        { signal }
      );
      setComplaintFollowUps(res.data);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener la bitácora de avances del comité interno.');
    }
  };

  const getForensicUsers = async (signal?: AbortSignal) => {
    const url = `${portal}/api/v1/users/forensic-investigators/`;
    try {
      const res = await api.get(`${API_BASE_URL}/${url}`, { signal });
      setForensicUsers(res.data);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener los investigadores forenses.');
    }
  };

  const sendChatMessage = async (message: string) => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/chat/${complaint?.chat?.id}/`;
    const res = await api.post(
      `${API_BASE_URL}/`+url,
      { message }
    );

    toast.success('Mensaje enviado correctamente.');

    return res.data;
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

  const getAuditDescription = (action: string, entity: string) => {
    const actionMap: Record<string, string> = {
      CREATE: "creó",
      READ: "consultó",
      UPDATE: "actualizó",
      DELETE: "eliminó",
      STATUS_CHANGE: "cambió el estatus de",
      LOGIN: "inició sesión en",
      LOGOUT: "cerró sesión en",
    };

    const entityMap: Record<string, string> = {
      USER: "un usuario",
      USER_PASSWORD: "la contraseña del usuario",
      USER_PROFILE: "el perfil del usuario",
      USER_PASSWORD_PROFILE: "la contraseña del perfil",
      ORGANIZATION: "la organización",
      SCORE: "la matriz de riesgo",
      ROLE: "el rol",
      CHAT: "el chat",
      COMPLAINT: "la denuncia",
      COMPLAINT_FILE: "un archivo de la denuncia",
      COMPLAINT_MESSAGE: "un mensaje de la denuncia",
      COMPLAINT_MESSAGE_FILE: "un archivo del chat de la denuncia",
      COMPLAINT_FOLLOWUP: "un avance del comité interno",
      COMPLAINT_FOLLOWUP_FILE: "un archivo del comité interno",
      BUSINESS_UNIT: "la unidad de negocio",
      STATE: "el estado",
    };

    const actionLabel = actionMap[action] || action.toLowerCase();
    const entityLabel = entityMap[entity] || entity.toLowerCase();

    return `${actionLabel} ${entityLabel}`;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      READ: "bg-blue-400",
      CREATE: "bg-emerald-400",
      UPDATE: "bg-amber-400",
      DELETE: "bg-rose-500",
      STATUS_CHANGE: "bg-purple-500",
      LOGIN: "bg-indigo-400",
      LOGOUT: "bg-slate-400",
    };

    return colorMap[action] || "bg-slate-300";
  };

  const getRoleLabel = (roleId: string) => {
    const role = ROLE_DEFINITIONS.find(r => r.id === roleId);
    return role ? role.label : roleId;
  };

  const getComplaintData = async (signal?: AbortSignal) => {
    const url = `${portal}/api/v1/complaints/complaint/${sanitizedId}/`;
    try {
      const response = await api.get(`${API_BASE_URL}/${url}`, { signal });
      const data = response.data.complaint;
      setComplaint(data);
      setEditedStatus(data.status);
      setEditedPriority(data.priority);
      setEditedPublicResolution(data.public_resolution_message || '');
      setEditedRisk({
        financial: parseFloat(data.financial_percentage) || 0,
        financialJustification: data.financial_justification || '',
        legal: parseFloat(data.legal_percentage) || 0,
        legalJustification: data.legal_justification || '',
        reputational: parseFloat(data.reputational_percentage) || 0,
        reputationalJustification: data.reputational_justification || '',
      });
      if (data.assigned_to) setEditedResponsible(data.assigned_to);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return; // ignorar abort
      toast.error('No se pudo cargar la denuncia.');
    } finally {
      setIsLoadingComplaint(false);
    }
  };

  const verifyComplaint = async (signal?: AbortSignal) => {
    const url = `${portal}/api/v1/complaints/complaint-auditor/${sanitizedId}/`;
    try {
      const response = await api.get(`${API_BASE_URL}/${url}`, { signal });
      const data = response.data.complaint;
      setComplaint(data);
      setEditedStatus(data.status);
      setEditedPriority(data.priority);
      setEditedPublicResolution(data.public_resolution_message || '');
      setEditedRisk({
        financial: parseFloat(data.financial_percentage) || 0,
        financialJustification: data.financial_justification || '',
        legal: parseFloat(data.legal_percentage) || 0,
        legalJustification: data.legal_justification || '',
        reputational: parseFloat(data.reputational_percentage) || 0,
        reputationalJustification: data.reputational_justification || '',
      });
      if (data.assigned_to) setEditedResponsible(data.assigned_to);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('No se pudo cargar la denuncia.');
    } finally {
      setIsLoadingComplaint(false);
    }
  };

  const handleOpenFile = async (
    fileId: number,
    filename: string,
    ext: string
  ) => {

    const fileUrl = `${portal}/api/v1/complaints/complaint-file/${fileId}/`

    try {
      const response = await api.get(
        `${API_BASE_URL}/`+fileUrl,
        {
          responseType: "blob",
        }
      );

      // Mapeo de extensiones a MIME types
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
      };

      const mimeType = mimeTypes[ext.toLowerCase()];
      if (!mimeType) {
        toast.error('Tipo de archivo no permitido.');
        return;
      }
      const typedBlob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);
      window.open(url, "_blank");

      setTimeout(() => window.URL.revokeObjectURL(url), 10000);

    } catch (error) {
      toast.error("No se pudo abrir el archivo.");
    }
  };


  const handleOpenMessageFile = async (
    fileId: number,
    ext: string
  ) => {
    try {

      const messageFileurl = `${portal}/api/v1/complaints/complaint/${complaint?.id}/chat/${complaint?.chat?.id}/message-file/${fileId}/`;

      const response = await api.get(
        `${API_BASE_URL}/`+messageFileurl,
        {
          responseType: "blob",
        }
      );

      // Mapeo de extensiones a MIME types
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
      };

      const mimeType = mimeTypes[ext.toLowerCase()];
      if (!mimeType) {
        toast.error('Tipo de archivo no permitido.');
        return;
      }
      const typedBlob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(typedBlob);
      window.open(url, "_blank");

      // Limpia la URL después de un momento
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);

    } catch (error) {
      toast.error("No se pudo abrir el archivo.");
    }
  };


  const handleOpenFollowupFile = async (
    fileId: number,
    followupId: number,
    ext: string
  ) => {
    const followupFileUrl = `${portal}/api/v1/complaints/complaint/${complaint?.id}/follow-up/${followupId}/followup-file/${fileId}/`;
    try {
      const response = await api.get(
        `${API_BASE_URL}/`+followupFileUrl,
        {
          responseType: "blob",
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


  const getOrderedForensicUsers = () => {
    if (!complaint?.assigned_to || forensicUsers.length === 0) {
      return forensicUsers;
    }
    
    const assignedUser = forensicUsers.find(user => user.id === complaint.assigned_to);
    const otherUsers = forensicUsers.filter(user => user.id !== complaint.assigned_to);
    
    return assignedUser ? [assignedUser, ...otherUsers] : forensicUsers;
  };

  const runAIAnalysis = async () => {
    if (!complaint) return;
    setIsAnalyzing(true);
    setAiAnalysis(null); // limpia resultado anterior
    
    // Simula el tiempo de procesamiento de la IA
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const analysisResult = {
        category: 'Fraude Financiero',
        riskLevel: 'alto',
        justification: 'La denuncia describe patrones típicos de malversación de fondos con múltiples personas involucradas.',
        urgencyScore: 78,
        impactScore: 85,
        executiveSummary: 'Se detectan indicios de fraude interno con posible complicidad de personal directivo. Se recomienda intervención inmediata y resguardo de evidencia digital.',
        escalationAlert: 'Requiere notificación al Consejo de Administración en menos de 24 horas.',
        isUrgent: true,
        patterns: ['Manipulación de registros contables', 'Transferencias no autorizadas'],
        investigationChecklist: ['Auditar cuentas bancarias', 'Revisar correos corporativos', 'Entrevistar testigos clave'],
        suggestedQuestions: ['¿Con qué frecuencia ocurrían las irregularidades?', '¿Quién tenía acceso a los fondos?'],
        mexicanLegalFramework: 'Posible aplicación del Art. 222 CPF (abuso de confianza) y Art. 400 Bis (operaciones con recursos de procedencia ilícita).',
      };

      setAiAnalysis(analysisResult);
    } catch (error) {
      toast.error('Error al ejecutar el análisis forense.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFileIcon = (ext: string) => {
    const cleanExt = ext.replace(".", "").toLowerCase();

    if (cleanExt === "pdf") {
      return <FileText size={18} className="text-red-500" />;
    }

    if (cleanExt === "doc" || cleanExt === "docx") {
      return <FileText size={18} className="text-blue-600" />;
    }

    if (
      cleanExt === "png" ||
      cleanExt === "jpg" ||
      cleanExt === "jpeg"
    ) {
      return <FileImage size={18} className="text-green-500" />;
    }

    return <File size={18} className="text-slate-400" />;
  };

  if (!complaint) return null;

  const handleSaveRiskScore = async () => {

    setIsSaving(true);

    const url = `${portal}/api/v1/complaints/complaint-update-scores/${complaint.id}/`

    try{
      await api.patch(
        `${API_BASE_URL}/`+url,
        {
          financial_percentage: editedRisk.financial,
          legal_percentage: editedRisk.legal,
          reputational_percentage: editedRisk.reputational,
          financial_justification: editedRisk.financialJustification,
          legal_justification: editedRisk.legalJustification,
          reputational_justification: editedRisk.reputationalJustification,
        });
      
        toast.success('Matriz de riesgo actualizada exitosamente.');

    } catch (error) {
      toast.error('Error al guardar la matriz de riesgo.');
    };

    setIsSaving(false);

  };

  const handleSave = async () => {
    const data = {
      status: editedStatus,
      priority: editedPriority,
      assigned_to: editedResponsible,
      public_resolution_message: editedPublicResolution,
    };

    setIsSaving(true);

    try {

      const url = `${portal}/api/v1/complaints/complaint-update/${complaint.id}/`
      
      await api.patch(
        `${API_BASE_URL}/`+url, 
        data
      );

      toast.success('Expediente actualizado exitosamente.');
      setIsSaving(false);
      
      // Recarga los datos después de guardar
      await getComplaintData();
    } catch (error) {
      setIsSaving(false);
      toast.error('Error al actualizar el expediente.');
    }
  };

  const handleAddCommitteeAvance = async () => {
    if (!committeeMessage.trim()) return;
    if (isSubmittingFollowUp) return; // ← guard extra

    setIsSubmittingFollowUp(true); // ← deshabilita

    const formData = new FormData();
    formData.append("message", committeeMessage);
    committeeFiles.forEach(file => formData.append("files", file));

    const url = `${portal}/api/v1/complaints/complaint/${complaint.id}/follow-up/`

    try {
      const res = await api.post(`${API_BASE_URL}/` + url, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newFollowUp = res.data.follow_up || res.data;
      setComplaintFollowUps(prev => [...prev, newFollowUp]);

      const chatMessageFromFollowup = {
        id: newFollowUp.id,
        role: userRole,
        message: newFollowUp.message,
        created_at: newFollowUp.created_at,
        files: (newFollowUp.followup_files || []).map(file => ({
          ...file, fromFollowup: true, followupId: newFollowUp.id
        }))
      };

      setChatHistory(prev => [...prev, chatMessageFromFollowup]);
      setCommitteeMessage('');
      setCommitteeFiles([]);
      toast.success("Avance registrado con archivos.");

    } catch (error) {
      toast.error("Error al registrar avance.");
    } finally {
      setIsSubmittingFollowUp(false); // ← re-habilita siempre
    }
  };

  const handleSendChatToInformant = async () => {
    if (!chatMessage.trim()) return;

    if (chatMessage.trim().length > 1000) {
      toast.error('El mensaje no puede exceder 1000 caracteres.');
      return;
    }

    const tempId = Date.now();

    const optimisticMessage = {
      id: tempId,
      role: userRole,
      message: chatMessage,
      created_at: new Date().toISOString(),
      isTemp: true
    };

    setIsSendingMessage(true);
    setChatMessage('');

    try {
      const realMessage = await sendChatMessage(chatMessage);

      // 2️⃣ Reemplazar el mensaje temporal por el real del backend
      setChatHistory(prev => [...prev, optimisticMessage]);

    } catch (error) {
      // 3️⃣ Si falla, eliminar mensaje optimista
      setChatHistory(prev =>
        prev.filter(msg => msg.id !== tempId)
      );

      toast.error("No se pudo enviar el mensaje.");
    }finally {
      setIsSendingMessage(false);
    }
  };

  const removeFile = (index: number) => {
    setCommitteeFiles(prev => prev.filter((_, i) => i !== index));
  };

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

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

const handleFiles = async (files: FileList | null) => {
  if (!files) return;

  const newFiles = Array.from(files);
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const valid: File[] = [];

  for (const file of newFiles) {
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

  setCommitteeFiles(prev => {
    const combined = [...prev, ...valid];
    if (combined.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos permitidos.`, { id: 'max-files' });
      return combined.slice(0, MAX_FILES);
    }
    return combined;
  });
};

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const InternalReportStatusSelect = ({ label, value, options, onChange, disabled }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all disabled:opacity-40 shadow-inner"
        >
          {options.map((o: any) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="absolute right-4 top-4 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );

  const InternalPrioritySelect = ({ label, value, options, onChange, disabled }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all disabled:opacity-40 shadow-inner"
        >
          {options.map((o: any) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="absolute right-4 top-4 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );

  const InternalSelect = ({ label, value, options, onChange, disabled }: any) => (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all disabled:opacity-40 shadow-inner"
        >
          {options.map((o: any) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          className="absolute right-4 top-4 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );


  return (
    <div className="max-w-[1500px] mx-auto pb-20 animate-in fade-in duration-700">
      <Toaster position="bottom-right" richColors />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-6">
          <button onClick={() => {
              if (isAuditor) {
                  isCustomDomain ? navigate('/finalized/') : navigate(`/${portal}/finalized/`);
              } else {
                  isCustomDomain ? navigate('/complaints/') : navigate(`/${portal}/complaints/`);
              }
          }} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><ArrowLeft size={18} /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expediente {complaint.id}</h1>
              {isSuper && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest">GOD MODE ON</span>}
            </div>
            <p className="text-xs text-slate-400 font-bold tracking-widest mt-1 flex items-center gap-2">
              <Activity size={12} /> CREADO: {complaint?.created_at
                            ? (() => {
                                const date = new Date(complaint.created_at);

                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();

                                let hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');

                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                hours = hours % 12;
                                hours = hours ? hours : 12;
                                const formattedHours = String(hours).padStart(2, '0');

                                return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
                              })()
                            : 'No disponible'}
            </p>
          </div>
        </div>
      </header>

      <nav className="flex items-center border-b border-slate-200 mb-10 gap-10 overflow-x-auto no-scrollbar scroll-smooth">
        {(canSeeInfo) && <TabBtn id="info" label="Hechos" active={activeTab} onClick={setActiveTab} icon={FileText} />}
        {(canSeeCommittee) && <TabBtn id="committee" label="Comité Interno" active={activeTab} onClick={setActiveTab} icon={ShieldCheck} />}
        {(canChatWithInformant) && <TabBtn id="chat" label="Comunicación" active={activeTab} onClick={setActiveTab} icon={MessageCircle} />}
        {(canEditRisk) && [ROLE_DEFINITIONS[2].id,ROLE_DEFINITIONS[0].id].includes(userRole) && <TabBtn id="risk" label="Matriz de Riesgo" active={activeTab} onClick={setActiveTab} icon={AlertTriangle} />}
        {(canSeeIA) && <TabBtn id="ia" label="IA Forense" active={activeTab} onClick={setActiveTab} icon={Sparkles} />}
        {(canSeeTrazability) &&<TabBtn id="audit" label="Trazabilidad" active={activeTab} onClick={setActiveTab} icon={History} />}
      </nav>

      <main className="animate-in slide-in-from-bottom-2 duration-500 mt-7">
        {/* PESTAÑA: HECHOS (VISIBILIDAD TOTAL) */}
        {activeTab === 'info' && (
          <div className="space-y-8">
            {canAssign && (
              <div className="flex justify-end items-center gap-3 w-full">
                <button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-slate-900 text-white px-7 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                  <Save size={16} /> 
                  {isSaving ? 'GUARDANDO...' : 'ACTUALIZAR EXPEDIENTE'}
                </button>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-8">
              <InternalSelect 
                label="Asignar Responsable" 
                value={editedResponsible ?? ''} // ← Convierte null a string vacío para el select
                disabled={!canAssign && !isSuper}
                options={responsibleOptions}
                onChange={(v: string) => {
                  // Convierte el string vacío a null, o parsea el número
                  setEditedResponsible(v === '' ? null : parseInt(v));
                }} 
              />
              <InternalReportStatusSelect
                label='Estatus Operativo'
                value={editedStatus}
                disabled={
                  !canAssign && !isSuper
                }
                options={REPORT_STATUS}
                onChange={(v: string) => setEditedStatus(v)}
              />
              <InternalPrioritySelect 
                label='Prioridad de Atención'
                value={editedPriority} 
                disabled={!canAssign && !isSuper}
                options={PRIORITIES}
                onChange={(v: string) => setEditedPriority(v)} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-white border border-slate-200 rounded-[32px] p-10 shadow-sm space-y-12">
                   <section>
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Megaphone size={14} /> Relato del Denunciante
                      </h3>
                      <p className="text-xl text-slate-700 leading-relaxed italic border-l-4 border-blue-100 pl-8 py-2 bg-slate-50/50 rounded-r-2xl">
                        "{complaint.incident_description}"
                      </p>
                   </section>
                   
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                      <DataPoint label="Clasificación" value={complaint.classification.toLowerCase()} icon={LayoutList} />
                      <DataPoint label="Ciudad / Sede" value={complaint.state.state_headquearters} icon={MapPin} />
                      <DataPoint label="Unidad de Negocio" value={complaint.business_unit.business_unit} icon={Building} />
                      <DataPoint 
                        label="Fecha del Incidente" 
                        value={
                          complaint?.incident_date
                            ? (() => {
                                const date = new Date(complaint.incident_date);

                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();

                                let hours = date.getHours();
                                const minutes = String(date.getMinutes()).padStart(2, '0');

                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                hours = hours % 12;
                                hours = hours ? hours : 12;
                                const formattedHours = String(hours).padStart(2, '0');

                                return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
                              })()
                            : 'No disponible'
                        }
                        icon={Calendar}
                      />
                   </div>

                   <div className="border-t border-slate-100 pt-10">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Sujetos y Relación</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                        <DataPoint label="Personas Implicadas" value={complaint.parties_involved || 'N/A'} icon={Users} />
                        <DataPoint label="Relación con Empresa" value={complaint.enterprise_relation.toLowerCase() || 'N/A'} icon={Briefcase} />
                      </div>
                   </div>

                   <div className="border-t border-slate-100 pt-10">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Datos de Contacto Recibidos</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                        <DataPoint label="Nombre" value={complaint.name || 'N/A'} icon={User} />
                        <DataPoint label="Correo Electrónico" value={complaint.email || 'N/A'} icon={Globe} />
                        <DataPoint label="Teléfono de Contacto" value={complaint.phone_number || 'N/A'} icon={Activity} />
                      </div>
                      {(complaint.additionalEmails || complaint.additionalPhones) && (
                        <div className="mt-4 grid grid-cols-2 gap-4">
                           {/* Fixed missing icon imports for Mail and Phone */}
                           {complaint.additionalEmails && complaint.additionalEmails.length > 0 && <DataPoint label="Emails Adicionales" value={complaint.additionalEmails.join(', ')} icon={Mail} />}
                           {complaint.additionalPhones && complaint.additionalPhones.length > 0 && <DataPoint label="Tels Adicionales" value={complaint.additionalPhones.join(', ')} icon={Phone} />}
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-8">
                {canAssign && (<div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-6">Resolución Pública</h3>
                    <textarea 
                      value={editedPublicResolution}
                      maxLength={500}
                      onChange={(e) => setEditedPublicResolution(e.target.value)}
                      disabled={!canCloseCase && !isSuper}
                      placeholder="Este texto será visible para el denunciante al consultar su código..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-300 min-h-[160px] focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-4 italic flex items-center gap-2">
                       <Info size={12} /> Solo actualice este campo cuando el caso esté en estado resuelto.
                    </p>
                 </div>)}

                 <div className="space-y-8">
                  {/* ========================= */}
                  {/* ARCHIVOS PRINCIPALES */}
                  {/* ========================= */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Archivos de la denuncia
                    </h3>

                    <div className="max-h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {complaint.files && complaint.files.length > 0 ? (
                      complaint.files.map((file: any) => {
                        const extension = file?.ext ? file.ext.toUpperCase() : 'FILE';

                        const formattedDate = file?.created_at
                          ? new Date(file.created_at).toLocaleDateString('es-MX')
                          : 'Fecha no disponible';

                        return (
                          <div
                            key={`complaint-${file.id}`}
                            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                {getFileIcon(file?.ext || '')}
                              </div>

                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-slate-800">
                                  {file?.original_name || 'Archivo sin nombre'}{extension.toLowerCase()}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {formattedDate}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenFile(file.id, file.filename, file.ext)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 transition-all active:scale-95"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Sin archivos de la denuncia.
                      </p>
                    )}
                    </div>
                  </div>


                  {/* ========================= */}
                  {/* ARCHIVOS DEL CHAT */}
                  {/* ========================= */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Archivos del chat
                    </h3>

                    <div className="max-h-64 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {complaint.chat?.files?.some((msg: any) => msg.files.length > 0) ? (
                        complaint.chat.files.flatMap((msg: any) =>
                          msg.files.map((file: any) => (
                            <div
                              key={`chat-${file.id}`}
                              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                  {getFileIcon(file.ext)}
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-slate-700">
                                    {file.original_name || 'Archivo sin nombre'}{file.ext.toLowerCase()}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(file.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleOpenMessageFile(file.id, file.ext)}
                                className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          ))
                        )
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Sin archivos en el chat.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: MATRIZ DE RIESGO (CON JUSTIFICACIONES EDITABLES) */}
        {activeTab === 'risk' && [ROLE_DEFINITIONS[2].id, ROLE_DEFINITIONS[0].id].includes(userRole)&& (
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {!isAuditor && (
              <div className="flex justify-end items-center gap-3 w-full">
                <button 
                  onClick={handleSaveRiskScore} 
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-slate-900 text-white px-7 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                  <Save size={16} /> 
                  {isSaving ? 'GUARDANDO...' : 'ACTUALIZAR PUNTAJE DE RIESGOS'}
                </button>
              </div>
            )}
            <div className="bg-white border border-slate-200 rounded-[32px] p-10 shadow-sm">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><TrendingUp size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Evaluación de Impacto Corporativo</h3>
                  <p className="text-xs text-slate-400 font-medium">Cuantificación y fundamentación del riesgo institucional por parte del personal.</p>
                </div>
              </div>

              <div className="space-y-16">
                <RiskSliderWithJustification 
                  label="Impacto Financiero" 
                  value={editedRisk.financial} 
                  justification={editedRisk.financialJustification || ''}
                  disabled={!canEditRisk && !isSuper}
                  onValueChange={v => setEditedRisk({...editedRisk, financial: v})} 
                  onJustificationChange={j => setEditedRisk({...editedRisk, financialJustification: j})}
                  color="rose"
                  placeholder="Escriba aquí la justificación del impacto económico..."
                />
                <RiskSliderWithJustification 
                  label="Vulnerabilidad Legal" 
                  value={editedRisk.legal} 
                  justification={editedRisk.legalJustification || ''}
                  disabled={!canEditRisk && !isSuper}
                  onValueChange={v => setEditedRisk({...editedRisk, legal: v})} 
                  onJustificationChange={j => setEditedRisk({...editedRisk, legalJustification: j})}
                  color="indigo"
                  placeholder="Escriba aquí la justificación del riesgo jurídico..."
                />
                <RiskSliderWithJustification 
                  label="Daño Reputacional" 
                  value={editedRisk.reputational} 
                  justification={editedRisk.reputationalJustification || ''}
                  disabled={!canEditRisk && !isSuper}
                  onValueChange={v => setEditedRisk({...editedRisk, reputational: v})} 
                  onJustificationChange={j => setEditedRisk({...editedRisk, reputationalJustification: j})}
                  color="amber"
                  placeholder="Escriba aquí la justificación de la afectación de marca..."
                />
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: IA FORENSE (IA PERSONALIZADA) */}
        {activeTab === 'ia' && (
  <div className="max-w-[1400px] mx-auto space-y-8">

    {/* ── 1. LOADER INICIAL (auto-dismiss ~2s) ──────────────────── */}
    {isTabLoading ? (
      <div className="h-[600px] bg-slate-900 rounded-[48px] flex flex-col items-center justify-center text-center overflow-hidden relative border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0" />
        <div className="relative z-10 space-y-8 max-w-md">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-blue-500/10 rounded-full animate-ping [animation-delay:300ms]" />
            <div className="relative w-32 h-32 bg-slate-800 rounded-full border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileSearch size={48} className="animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Preparando módulo forense
            </h3>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">
              Cargando entorno de análisis...
            </p>
          </div>
          {/* Barra de progreso animada */}
          <div className="w-64 mx-auto h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-[progress_2.2s_ease-in-out_forwards]"
              style={{
                animation: 'none',
                background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
                width: '100%',
                transform: 'scaleX(0)',
                transformOrigin: 'left',
                transition: 'transform 2.2s ease-in-out',
              }}
              ref={el => { if (el) requestAnimationFrame(() => el.style.transform = 'scaleX(1)'); }}
            />
          </div>
        </div>
      </div>

    /* ── 2. FORMULARIO (procesar → analizar) ─────────────────────── */
    ) : !isAnalyzing && !aiAnalysis ? (
      <div className="h-[600px] bg-slate-900 rounded-[48px] flex flex-col items-center justify-center text-center overflow-hidden relative border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0" />
        <div className="relative z-10 space-y-10 max-w-md px-8">

          <div className="relative mx-auto w-28 h-28">
            <div className="w-28 h-28 bg-slate-800 rounded-full border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Brain size={44} />
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">IA Forense</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Nuestra IA analiza la denuncia para detectar patrones de riesgo,
              sugerir líneas de investigación y aplicar el marco legal mexicano.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={processData}
              disabled={dataProcessed || isProcessing}
              className={`flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 ${
                dataProcessed
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                  : isProcessing
                    ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
              }`}
            >
              {dataProcessed ? (
                <><CheckCircle2 size={15} /> Información procesada</>
              ) : isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  Procesando información...
                </>
              ) : (
                <><Zap size={15} /> Procesar información</>
              )}
            </button>

            {/* Botón de análisis también deshabilitado mientras procesa */}
            <button
              onClick={beginForensicAnalysis}
              disabled={!dataProcessed || isProcessing}
              className={`flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                dataProcessed && !isProcessing
                  ? 'bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-xl shadow-blue-900/40'
                  : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              }`}
            >
              <Sparkles size={15} /> Iniciar Análisis Forense
            </button>
          </div>
        </div>
      </div>

    /* ── 3. ANALIZANDO ───────────────────────────────────────────── */
    ) : isAnalyzing ? (
      <div className="h-[600px] bg-slate-900 rounded-[48px] flex flex-col items-center justify-center text-center overflow-hidden relative border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0" />
        <div className="relative z-10 space-y-8 max-w-md">
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <div className="relative w-32 h-32 bg-slate-800 rounded-full border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cpu size={48} className="animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Cognición Forense Activa
            </h3>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">
              Analizando con IA personalizada...
            </p>
          </div>
        </div>
      </div>

    /* ── 4. RESULTADO ────────────────────────────────────────────── */
    ) : aiAnalysis ? (
  <div className="space-y-6">
    <div className="flex justify-end">
      <button
        onClick={async () => {
          setAiAnalysis(null);
          setDataProcessed(false);
          setIsProcessing(true);
          toast.info('Verificando, espera un momento...');
          // Consulta estado de archivos para saber qué botón habilitar
          const controller = new AbortController();
          await getProcessedComplaintFilesStatus(controller.signal);
        }}
        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-all active:scale-95 shadow-sm"
      >
        <Zap size={13} /> Nuevo análisis
      </button>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95 duration-700">

      <div className="lg:col-span-4 space-y-8">

        <div className={`p-10 rounded-[48px] shadow-2xl relative overflow-hidden ${
          aiAnalysis.riskLevel === 'crítico' ? 'bg-gradient-to-br from-rose-600 to-red-900' :
          aiAnalysis.riskLevel === 'alto'    ? 'bg-gradient-to-br from-amber-600 to-orange-800' :
                                               'bg-gradient-to-br from-indigo-600 to-blue-800'
        }`}>
          <div className="relative z-10 text-white">
            <div className="flex justify-between items-start mb-10">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <ShieldAlert size={28} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Score de Urgencia</p>
                <p className="text-3xl font-black">{aiAnalysis.urgencyScore}%</p>
              </div>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 mb-2">IA Forense Personalizada</h3>
            <p className="text-5xl font-black uppercase tracking-tighter mb-6">{aiAnalysis.riskLevel}</p>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${aiAnalysis.urgencyScore}%` }} />
            </div>
            <p className="text-sm text-white/80 leading-relaxed font-medium">{aiAnalysis.justification}</p>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-[40px] p-8 shadow-xl border border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <BookOpen size={14} /> Sugerencia Legal (México)
            </h4>
            <p className="text-slate-300 leading-relaxed italic text-xs">{aiAnalysis.mexicanLegalFramework}</p>
            <div className="mt-6 flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
              <Gavel size={12} /> Basado en Legislación de {complaint.state?.state_headquearters}
            </div>
          </div>
          <Scale size={120} className="absolute -bottom-10 -right-10 text-white/[0.03]" />
        </div>

      </div>

      <div className="lg:col-span-8 space-y-8">

        <div className="bg-white border border-slate-200 rounded-[48px] p-12 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-6">
            <Brain size={32} className="text-blue-600" />
            Análisis forense por nuestra IA personalizada
          </h3>
          <p className="text-lg text-slate-600 leading-relaxed font-medium">{aiAnalysis.executiveSummary}</p>
          {aiAnalysis.escalationAlert && (
            <div className="mt-10 p-6 bg-rose-50 border border-rose-100 rounded-[32px] flex items-start gap-4">
              <AlertOctagon size={24} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Alerta de Escalamiento</p>
                <p className="text-sm font-bold text-rose-900">{aiAnalysis.escalationAlert}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Scale size={14} className="text-blue-500" /> Hoja de Ruta Investigativa
            </h4>
            <ul className="space-y-4">
              {(aiAnalysis.investigationChecklist ?? []).map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">
                    {i + 1}
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <MessageCircle size={14} className="text-emerald-500" /> Preguntas Clave para el Informante
            </h4>
            <ul className="space-y-4">
              {(aiAnalysis.suggestedQuestions ?? []).map((q: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600 italic">
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded mt-0.5 shrink-0">
                    <ChevronRight size={12} />
                  </div>
                  "{q}"
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  </div>
) : null}
  </div>
)}

        {/* OTROS TABS MANTENIDOS */}
        {activeTab === 'chat' && (
          /* Reducimos max-w-6xl a max-w-2xl para que sea más estrecho */
          <div className="max-w-xl mx-auto h-[calc(120vh-167px)] w-full">

            <div className="flex flex-col h-full bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-xl">

              {/* Header - Un poco más compacto */}
              <div className="p-5 border-b border-slate-100 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-inner">
                    C
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Canal Seguro
                    </h4>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Lock size={10} /> Encriptación Activa
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages - Ajustamos padding para que no se vea tan vacío */}
              <div className="flex-1 px-6 py-8 overflow-y-auto space-y-6 bg-slate-50/30">
                {isLoadingChat ? (
                  <div className="text-center text-xs text-slate-400">
                    Cargando conversación...
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role !== 'DENUNCIANTE'
                          ? 'items-end ml-auto'
                          : 'items-start'
                      } gap-1 max-w-[85%]`}
                    >
                      <span className="text-[9px] font-bold text-slate-400 uppercase mx-2 tracking-widest">
                        {getRoleLabel(msg.role)}
                      </span>

                      <div
                        className={`p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${
                          msg.role !== 'DENUNCIANTE'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                        }`}
                      >
                        {msg.message}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 justify-start">
                            {[...msg.files].reverse().map((file) => {
                              const extension =
                                file.ext?.replace(".", "").toUpperCase() || "FILE";

                              return (
                                <button
                                  key={file.id}
                                  onClick={() => handleOpenMessageFile(file.id, file.ext)}
                                  className="
                                    flex items-center gap-2
                                    px-3 py-2
                                    bg-blue-100 hover:bg-blue-200
                                    border border-blue-300
                                    rounded-xl
                                    text-xs
                                    transition-all
                                    hover:shadow-sm
                                    active:scale-95">
                                  {/* TEXTO */}
                                  <span className="font-semibold text-slate-800 text-[12px]">
                                    {file.original_name || 'Archivo sin nombre'}
                                  </span>
                                  <span
                                  className="
                                    text-blue-700
                                    text-[10px]
                                    font-bold
                                    bg-white
                                    px-2 py-0.5
                                    rounded-md
                                    border border-blue-300
                                  ">
                                  {extension}
                                </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 👇 FECHA FORMATEADA */}
                      {msg.created_at && (
                        <span className="text-[10px] text-slate-400 px-2">
                          {formatDateTime12h(msg.created_at)}
                        </span>
                      )}
                    </div>
                  ))
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area - Más elegante */}
              <div className="p-5 border-t border-slate-100 bg-white">
                <div className="flex flex-col gap-1 w-full">

                  {/* FILA: textarea + botón */}
                  <div className="flex gap-3 items-center">
                    <textarea
                      value={chatMessage}
                      maxLength={1000}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Escriba un mensaje..."
                      rows={2}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm 
                                focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 
                                transition-all resize-none max-h-28 overflow-y-auto"
                    />

                    <button
                      onClick={handleSendChatToInformant}
                      disabled={!chatMessage.trim()}
                      className="bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-700 
                                active:scale-95 transition-all shadow-lg shadow-blue-200 
                                disabled:opacity-50 disabled:shadow-none"
                    >
                      <Send size={18} />
                    </button>
                  </div>

                  {/* CONTADOR SEPARADO */}
                  <div className="flex justify-end text-[10px] text-slate-400 px-1">
                    {chatMessage.length} / 1000
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'committee' && (
           <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
                 <div className="relative z-10"><h3 className="text-2xl font-bold">Bitácora Forense</h3><p className="text-sm text-slate-400 mt-2">Canal confidencial del comité de ética.</p></div>
                 <Gavel size={120} className="absolute -bottom-10 -right-10 text-white/[0.03]" />
              </div>
              <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm p-6 space-y-5">
                {/* INPUT PRINCIPAL */}
                <textarea
                  value={committeeMessage}
                  maxLength={2000}
                  onChange={(e) => setCommitteeMessage(e.target.value)}
                  placeholder="Documente un avance técnico o hallazgo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm 
                            focus:outline-none focus:ring-4 focus:ring-blue-600/5 
                            focus:border-blue-400 transition-all resize-none min-h-[110px]"
                />

                {/* ARCHIVOS COMO CHIPS */}
                {committeeFiles.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {committeeFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 bg-slate-100 border border-slate-200 
                                  rounded-full px-4 py-2 text-xs font-medium"
                      >
                        <span className="truncate max-w-[100px]">
                          {file.name}
                        </span>

                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* FOOTER CONTROLES */}
                <div className="flex items-center justify-between pt-2">

                  {/* ADJUNTAR */}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 
                                    hover:text-blue-600 cursor-pointer transition-colors">
                    <Paperclip size={14} />
                    Adjuntar
                    <input
                      type="file"
                      multiple
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </label>

                  {/* BOTÓN ENVIAR */}
                  <button
                    onClick={handleAddCommitteeAvance}
                    disabled={!committeeMessage.trim() || isSubmittingFollowUp}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold 
                              hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 
                              disabled:opacity-40 disabled:shadow-none"
                  >
                    {isSubmittingFollowUp ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        REGISTRANDO...
                      </div>
                    ) : 'REGISTRAR HALLAZGO'}
                  </button>

                </div>
              </div>
              <div className="space-y-6 mt-10">
                {Array.isArray(complaintFollowUps) && complaintFollowUps.length > 0 &&
                  complaintFollowUps.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-900 text-white rounded-lg font-bold text-[12px]">
                            {getRoleLabel(c.role)}
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10">
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                          {c.message}
                        </p>

                        {c.followup_files && c.followup_files.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 justify-start">
                            {[...c.followup_files].reverse().map((file) => {
                              const extension =
                                file.ext?.replace(".", "").toUpperCase() || "FILE";

                              return (
                                <button
                                  key={file.id}
                                  onClick={() => handleOpenFollowupFile(file.id, c.id, file.ext, )}
                                  className="
                                    flex items-center gap-2
                                    px-3 py-2
                                    bg-blue-100 hover:bg-blue-200
                                    border border-blue-300
                                    rounded-xl
                                    text-xs
                                    transition-all
                                    hover:shadow-sm
                                    active:scale-95"
                                >
                                  <span className="font-semibold text-slate-800 text-[12px]">
                                    {file.original_name || 'Archivo sin nombre'}
                                  </span>
                                  <span
                                    className="
                                      text-blue-700
                                      text-[10px]
                                      font-bold
                                      bg-white
                                      px-2 py-0.5
                                      rounded-md
                                      border border-blue-300
                                    "
                                  >
                                    {extension}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
           </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
            {/* HEADER ESTILO SCREENSHOT */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Cadena de Custodia</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">
                  REGISTRO DE TRAZABILIDAD
                </p>
              </div>
              <div className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-widest">
                {auditLogs.count || 0} EVENTOS
              </div>
            </div>

            {/* LISTADO DE EVENTOS */}
            <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/30">
              {isLoadingAudit ? (
                <div className="flex flex-col items-center justify-center h-60 gap-4">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Cargando trazabilidad...
                  </p>
                </div>
              ) : (<div className="space-y-6 relative">

                {auditLogs.results?.map((log, index) => (
                  <div key={log.id} className="relative pl-10">

                    {/* Línea vertical timeline */}
                    {index !== auditLogs.results.length - 1 && (
                      <div className="absolute left-[14px] top-6 bottom-0 w-px bg-slate-200" />
                    )}

                    {/* Punto dinámico */}
                    <div className={`absolute left-0 top-1 h-3 w-3 rounded-full ${getActionColor(log.action)} ring-4 ring-white shadow-sm`} />

                    {/* Contenido */}
                    <div className="flex items-start justify-between bg-white border border-slate-100 rounded-2xl px-6 py-5 hover:shadow-md hover:border-slate-200 transition-all duration-200">

                      {/* LADO IZQUIERDO */}
                      <div className="flex flex-col gap-2 w-full min-w-0">

                        <span className="text-sm font-bold text-slate-900 tracking-tight">
                          {getAuditDescription(log.action, log.entity)}
                        </span>

                        {log.description && (
                          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-900 leading-relaxed whitespace-pre-line w-full">
                            {log.description}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-1">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                              {log.user.substring(0,2).toUpperCase()}
                            </div>
                            <span className="text-slate-700 font-semibold">{log.user} - {getRoleLabel(log.role)}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{formatDateTime12h(log.created_at)}</span>
                        </div>

                      </div>

                    </div>
                  </div>
                ))}
              </div>)}
            </div>

            {/* PAGINADOR INTEGRADO */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Página {auditPage} de {Math.ceil((auditLogs.count || 1) / 50)}
              </p>

              <div className="flex items-center gap-2">

                {/* PRIMERO */}
                <button
                  onClick={() => getAuditLogs(1)}
                  disabled={!auditLogs.previous}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
                >
                  Primero
                </button>

                {/* ANTERIOR */}
                <button
                  onClick={() => getAuditLogs(auditPage - 1)}
                  disabled={!auditLogs.previous}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
                >
                  Anterior
                </button>

                {/* CURRENT PAGE */}
                <div className="h-8 w-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-[11px] font-black">
                  {auditPage}
                </div>

                {/* SIGUIENTE */}
                <button
                  onClick={() => getAuditLogs(auditPage + 1)}
                  disabled={!auditLogs.next}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
                >
                  Siguiente
                </button>

                {/* ÚLTIMO */}
                <button
                  onClick={() => 
                    getAuditLogs(
                      Math.ceil((auditLogs.count || 1) / 30)
                    )
                  }
                  disabled={!auditLogs.next}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all active:scale-95 uppercase"
                >
                  Último
                </button>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// COMPONENTES AUXILIARES ACTUALIZADOS

const RiskSliderWithJustification = ({ label, value, justification, onValueChange, onJustificationChange, disabled, color, placeholder }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
      <div className="md:col-span-5 space-y-4">
        <div className="flex justify-between items-end">
          <h5 className="text-sm font-bold text-slate-700">{label}</h5>
          <div className={`px-4 py-1.5 rounded-xl text-xs font-bold bg-${color}-50 text-${color}-600 border border-${color}-100`}>
            {value} / 100
          </div>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={value} 
          disabled={disabled}
          onChange={(e) => onValueChange(parseInt(e.target.value))}
          className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-${color}-600 disabled:opacity-30`}
        />
        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">
           <span>Bajo Impacto</span>
           <span>Riesgo Crítico</span>
        </div>
      </div>

      <div className="md:col-span-7">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block px-1">Justificación del Gestor</label>
        <textarea 
          value={justification}
          maxLength={1000}
          disabled={disabled}
          onChange={(e) => onJustificationChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all min-h-[100px] resize-none"
        />
      </div>
    </div>
  </div>
);

const TabBtn = ({ id, label, active, onClick, icon: Icon }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex items-center gap-2.5 pb-4 text-xs font-bold uppercase tracking-[0.15em] transition-all relative whitespace-nowrap px-2 group ${active === id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
  >
    <Icon size={16} className={`transition-transform ${active === id ? 'scale-110' : 'group-hover:scale-110'}`} /> {label}
    {active === id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in slide-in-from-left duration-300"></div>}
  </button>
);

const DataPoint = ({ label, value, icon: Icon }: any) => (
  <div className="group">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-sm font-bold text-slate-800 leading-tight">{value}</p>
  </div>
);

const InternalSelect = ({ label, value, options, onChange, disabled }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] px-1">{label}</label>
    <div className="relative">
      <select 
        value={value} 
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs font-bold appearance-none focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all disabled:opacity-40 shadow-inner"
      >
        {options.map((o: any) => <option key={o} value={o}>{String(o).toUpperCase()}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

export default ReportDetail;