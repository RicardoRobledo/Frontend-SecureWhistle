import { 
  Shield, ShieldCheck, Fingerprint,
  Gavel, Briefcase, FileSearch,
} from 'lucide-react';
import { Report, ReportStatus, Priority, User, AccessLevel } from './types';

export const BUSINESS_UNITS = [
  'Corporativo', 'Logística', 'Ventas', 'Operaciones', 'Recursos Humanos', 'Planta 1', 'Planta 2', 'El Molino Residencial'
];

export const CITIES = [
  'León', 'Guadalajara', 'CDMX', 'Monterrey', 'Querétaro'
];

export const CHANNELS = [
  'Presentación', 'Correo Institucional', 'Intranet', 'Poster/Folleto', 'Recomendación', 'Redes Sociales', 'Otro'
];

export const REPORT_STATUS = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'EN_PROCESO', label: 'En Proceso' },
  { key: 'RESUELTO', label: 'Resuelto' },
  { key: 'DESCARTADO', label: 'Descartado' }
]

export const PRIORITIES = [
  { key: 'SIN ASIGNAR', label: 'Sin Asignar' },
  { key: 'BAJA', label: 'Baja' },
  { key: 'MEDIA', label: 'Media' },
  { key: 'ALTA', label: 'Alta' },
];

export const CLASSIFICATIONS = [
    { key: 'FUGA DE INFORMACION', label: 'Fuga de Información' },
    { key: 'ACOSO LABORAL', label: 'Acoso Laboral' },
    { key: 'FRAUDE', label: 'Fraude' },
    { key: 'DISCRIMINACION', label: 'Discriminación' },
    { key: 'CONFLICTO DE INTERES', label: 'Conflicto de Interés' },
    { key: 'ROBO', label: 'Robo' },
    { key: 'SEGURIDAD E HIGIENE', label: 'Seguridad e Higiene' }
  ];

export const RELATIONS = [
    { key: 'COLABORADOR', label: 'Colaborador' },
    { key: 'PROVEEDOR', label: 'Proveedor' },
    { key: 'CLIENTE', label: 'Cliente' },
    { key: 'EX EMPLEADO', label: 'Ex Empleado' },
    { key: 'ANONIMO', label: 'Prefiero no decirlo' }
  ]

export const MAX_FILES = 5;
export const MAX_SIZE_IMAGE = 5 * 1024 * 1024; // 5 MB
export const MAX_SIZE_PDF = 10 * 1024 * 1024; // 10 MB

export const MOCK_REPORTS: Report[] = [
  {
    id: 'D-001',
    date: '21/8/2025',
    city: 'León',
    classification: 'Fuga de Información',
    priority: Priority.UNASSIGNED,
    status: ReportStatus.PENDING,
    responsible: 'Sin asignar',
    accessLevel: AccessLevel.MEDIUM,
    riskScore: { financial: 80, legal: 60, reputational: 40 },
    description: 'Se ha detectado envío de correos con información sensible a dominios externos no autorizados.',
    businessUnit: 'Corporativo',
    location: 'Oficinas Centrales - Piso 3',
    incidentDate: '2025-08-20',
    incidentTime: '14:30',
    involvedPeople: 'Roberto N.',
    relation: 'Colaborador',
    channel: 'Intranet',
    files: ['evidencia1.pdf'],
    followUps: [],
    // Added auditTrail to comply with Report interface
    auditTrail: []
  },
  {
    id: 'D-002',
    date: '19/8/2025',
    city: 'Guadalajara',
    classification: 'Acoso Laboral',
    priority: Priority.HIGH,
    status: ReportStatus.IN_PROCESS,
    responsible: 'Juan Pérez',
    accessLevel: AccessLevel.LOW,
    riskScore: { financial: 10, legal: 90, reputational: 85 },
    description: 'Reporte de comportamiento inapropiado por parte de un supervisor en el área de logística.',
    businessUnit: 'Logística',
    relation: 'Colaborador',
    informantName: 'Ana López',
    channel: 'Poster/Folleto',
    followUps: [],
    // Added auditTrail to comply with Report interface
    auditTrail: []
  }
];

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Juan Pérez', email: 'juan.perez@empresa.com', role: 'Administrador', status: 'active', accessLevel: AccessLevel.HIGH },
  { id: '2', name: 'María González', email: 'maria.gonzalez@empresa.com', role: 'Supervisor', status: 'active', accessLevel: AccessLevel.MEDIUM },
  { id: '3', name: 'Carlos Ramírez', email: 'carlos.ramirez@empresa.com', role: 'Investigador', status: 'active', accessLevel: AccessLevel.LOW },
];

export const ROLE_DEFINITIONS = [
    { 
      id: 'SUPER_ADMIN', 
      label: 'Super Administrador', 
      icon: ShieldCheck, 
      color: 'amber', 
      desc: 'Acceso total sin restricciones.',
      permissions: ['Lectura de Denuncias', 'Gestión de Usuarios', 'Configuración de Sistema', 'Análisis Forense IA', 'Cierre de Casos', 'Auditoría Global']
    },
    { 
      id: 'IT_ADMIN', 
      label: 'Administrador IT', 
      icon: Shield, 
      color: 'slate', 
      desc: 'Gestión técnica y de catálogos.',
      permissions: ['Gestión de Catálogos', 'Mantenimiento de Servidores', 'Alta de Usuarios', 'Logs Técnicos']
    },
    { 
      id: 'COMPLIANCE_OFFICER', 
      label: 'Oficial de Cumplimiento', 
      icon: Gavel, 
      color: 'purple', 
      desc: 'Supervisión ética y legal.',
      permissions: ['Lectura de Denuncias', 'Análisis de Riesgo', 'Reportes Ejecutivos', 'Supervisión de Investigadores']
    },
    { 
      id: 'CASE_MANAGER', 
      label: 'Gestor de Casos', 
      icon: Briefcase, 
      color: 'blue', 
      desc: 'Triaje y asignación inicial.',
      permissions: ['Lectura de Denuncias', 'Asignación de Responsables', 'Chat con Denunciante', 'Definición de Prioridad']
    },
    { 
      id: 'FORENSIC_INVESTIGATOR', 
      label: 'Investigador Forense', 
      icon: Fingerprint, 
      color: 'cyan', 
      desc: 'Análisis de hechos y evidencias.',
      permissions: ['Lectura de Casos Asignados', 'Bitácora Forense', 'Chat con Denunciante', 'IA Forense (Consulta)']
    },
    { 
      id: 'EXTERNAL_AUDITOR', 
      label: 'Auditor Externo', 
      icon: FileSearch, 
      color: 'emerald', 
      desc: 'Revisión de procesos y logs.',
      permissions: ['Lectura de Casos Finalizados', 'Trazabilidad (Audit Trail)', 'Exportación de Datos']
    },
];
