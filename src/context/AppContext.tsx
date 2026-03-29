
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Report, User, ReportStatus, FollowUp, AuditEntry, Comment, AIAnalysis, BillingInfo } from '../types';
import { MOCK_REPORTS, MOCK_USERS, CITIES as INITIAL_CITIES, BUSINESS_UNITS as INITIAL_BU } from '../constants';

interface AppContextType {
  reports: Report[];
  users: User[];
  currentUser: User | null;
  cities: string[];
  businessUnits: string[];
  billing: BillingInfo;
  login: (email: string) => boolean;
  logout: () => void;
  addReport: (report: Omit<Report, 'id' | 'status' | 'date' | 'priority' | 'responsible' | 'auditTrail'>) => string;
  updateReport: (id: string, updates: Partial<Report>, logAction?: string) => void;
  updateReportAIAnalysis: (id: string, analysis: AIAnalysis) => void;
  addComment: (reportId: string, text: string, files?: string[]) => void;
  addFollowUp: (reportId: string, text: string, files?: string[], isFromCommittee?: boolean) => void;
  updateUser: (user: User) => void;
  addUser: (user: Omit<User, 'id' | 'status'>) => void;
  removeUser: (id: string) => void;
  addCity: (city: string) => void;
  removeCity: (city: string) => void;
  addBusinessUnit: (bu: string) => void;
  removeBusinessUnit: (bu: string) => void;
  buyAiCredits: (amount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS.map(r => ({ ...r, auditTrail: r.auditTrail || [], comments: r.comments || [] })));
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [cities, setCities] = useState<string[]>(INITIAL_CITIES);
  const [businessUnits, setBusinessUnits] = useState<string[]>(INITIAL_BU);

  const [billing, setBilling] = useState<BillingInfo>({
    planName: 'Enterprise Forensic Plus',
    status: 'activo',
    nextBillingDate: '15/10/2025',
    price: 499.00,
    currency: 'USD',
    paymentMethod: {
      type: 'card',
      last4: '4242',
      brand: 'VISA'
    },
    aiCredits: {
      total: 500,
      used: 342
    },
    features: [
      'Análisis Forense Ilimitado por nuestra IA personalizada',
      'Soporte Técnico 24/7 Gold',
      'Cumplimiento Certificado ISO 37001',
      'Almacenamiento Seguro Multi-Región',
      'Acceso God Mode Personalizado',
      'Integración con API Externa'
    ]
  });

  const login = (email: string) => {
    const user = users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    if (email === 'admin@empresa.com') {
       const admin = users[0];
       setCurrentUser(admin);
       return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const createAuditEntry = (action: string, details?: string): AuditEntry => ({
    id: Math.random().toString(36).substr(2, 9),
    date: new Date().toLocaleDateString('es-ES'),
    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    user: currentUser?.name || 'Sistema',
    action,
    details
  });

  const addReport = (data: Omit<Report, 'id' | 'status' | 'date' | 'priority' | 'responsible' | 'auditTrail'>) => {
    const newId = `D-${String(reports.length + 1).padStart(3, '0')}`;
    const initialLog = {
      id: 'log-initial',
      date: new Date().toLocaleDateString('es-ES'),
      time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      user: 'Sistema Externo',
      action: 'Creación de Denuncia',
      details: `Canal: ${data.channel}`
    };

    const newReport: Report = {
      ...data,
      id: newId,
      status: ReportStatus.PENDING,
      date: new Date().toLocaleDateString('es-ES'),
      priority: 'sin-asignar' as any,
      responsible: 'Sin asignar',
      comments: [],
      followUps: [],
      auditTrail: [initialLog],
      publicResolution: 'Su denuncia ha sido recibida y se encuentra en fase inicial de revisión.',
      files: data.files || []
    };
    setReports([newReport, ...reports]);
    return newId;
  };

  const updateReport = (id: string, updates: Partial<Report>, logAction?: string) => {
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        const actionText = logAction || 'Actualización de parámetros';
        const details = Object.entries(updates)
          .filter(([k]) => ['status', 'priority', 'responsible', 'accessLevel'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');

        return { 
          ...r, 
          ...updates, 
          updatedAt: new Date().toLocaleDateString('es-ES'),
          auditTrail: [createAuditEntry(actionText, details), ...r.auditTrail]
        };
      }
      return r;
    }));
  };

  const updateReportAIAnalysis = (id: string, analysis: AIAnalysis) => {
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        setBilling(b => ({
          ...b,
          aiCredits: { ...b.aiCredits, used: b.aiCredits.used + 1 }
        }));
        return { 
          ...r, 
          aiAnalysis: analysis,
          auditTrail: [createAuditEntry('Análisis IA Forense completado'), ...r.auditTrail]
        };
      }
      return r;
    }));
  };

  const addComment = (reportId: string, text: string, files?: string[]) => {
    if (!currentUser) return;
    
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      author: currentUser.name,
      role: currentUser.role,
      text,
      date: new Date().toLocaleString('es-ES'),
      files: files || []
    };

    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          comments: [newComment, ...(r.comments || [])],
          auditTrail: [createAuditEntry('Avance de Comité añadido'), ...r.auditTrail]
        };
      }
      return r;
    }));
  };

  const addFollowUp = (reportId: string, text: string, files?: string[], isFromCommittee: boolean = false) => {
    const newFollowUp: FollowUp = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        date: new Date().toLocaleString('es-ES'),
        files,
        isFromCommittee
    };

    setReports(prev => prev.map(r => {
        if (r.id === reportId) {
            const action = isFromCommittee ? 'Respuesta enviada al denunciante' : 'Información adicional recibida';
            return {
                ...r,
                followUps: [...(r.followUps || []), newFollowUp],
                auditTrail: [createAuditEntry(action), ...r.auditTrail]
            };
        }
        return r;
    }));
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  };

  const addUser = (userData: Omit<User, 'id' | 'status'>) => {
      const newUser: User = {
          ...userData,
          id: Math.random().toString(36).substr(2, 9),
          status: 'active'
      };
      setUsers([...users, newUser]);
  };

  const removeUser = (id: string) => {
    if (id === currentUser?.id) return; // No auto-eliminación
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const addCity = (city: string) => {
    if (!cities.includes(city)) setCities([...cities, city]);
  };
  const removeCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };
  const addBusinessUnit = (bu: string) => {
    if (!businessUnits.includes(bu)) setBusinessUnits([...businessUnits, bu]);
  };
  const removeBusinessUnit = (bu: string) => {
    setBusinessUnits(businessUnits.filter(b => b !== bu));
  };

  const buyAiCredits = (amount: number) => {
    setBilling(prev => ({
      ...prev,
      aiCredits: {
        ...prev.aiCredits,
        total: prev.aiCredits.total + amount
      }
    }));
  };

  return (
    <AppContext.Provider value={{ 
      reports, users, currentUser, cities, businessUnits, billing,
      login, logout, addReport, updateReport, updateReportAIAnalysis, addComment, 
      addFollowUp, updateUser, addUser, removeUser,
      addCity, removeCity, addBusinessUnit, removeBusinessUnit, buyAiCredits
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
