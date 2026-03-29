
export enum ReportStatus {
  PENDING = 'pendiente',
  IN_PROCESS = 'en-proceso',
  RESOLVED = 'resuelto',
  DISMISSED = 'descartado'
}

export enum Priority {
  HIGH = 'alta',
  MEDIUM = 'media',
  LOW = 'baja',
  UNASSIGNED = 'sin-asignar'
}

export enum AccessLevel {
  LOW = 'Bajo',
  MEDIUM = 'Medio',
  HIGH = 'Alto'
}

export interface RiskScore {
  financial: number;
  legal: number;
  reputational: number;
}

export interface AuditEntry {
  id: string;
  date: string;
  time: string;
  user: string;
  action: string;
  details?: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
  role: string;
  files?: string[];
}

export interface FollowUp {
  id: string;
  text: string;
  date: string;
  files?: string[];
  isFromCommittee?: boolean;
}

export interface Report {
  id: string;
  date: string;
  
  // Clasificación y Estado
  classification: string;
  priority: Priority;
  status: ReportStatus;
  responsible: string;
  accessLevel: AccessLevel;
  
  // Scoring de Riesgo
  riskScore: RiskScore;
  
  // Detalles del Incidente
  city: string;
  businessUnit: string;
  location?: string;
  incidentDate?: string;
  incidentTime?: string;
  
  // Contenido
  description: string;
  involvedPeople?: string;
  
  // Informante
  relation: string;
  informantName?: string;
  email?: string;
  phone?: string;
  additionalEmails?: string[];
  additionalPhones?: string[];
  files?: string[];
  channel?: string;
  
  // Auditoría y Comunicación
  updatedAt?: string;
  comments?: Comment[];
  publicResolution?: string;
  followUps?: FollowUp[];
  auditTrail: AuditEntry[];
}

export interface Stat {
  label: string;
  value: string | number;
  color?: string;
}
