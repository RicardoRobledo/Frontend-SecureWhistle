import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Users, UserPlus, Edit2, Trash2, Shield, X, Check, Mail, 
  User as UserIcon, Lock, ShieldCheck, Fingerprint, Eye, 
  Gavel, Briefcase, FileSearch, Zap, Search, Filter, 
  MoreHorizontal, ChevronRight, Info, Phone, BookOpen, FolderSearch,
  Building, Key, History, Download, ChevronDown, ShieldAlert
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { Toaster, toast } from 'sonner';

import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import api from '../utils/api';
import { PASSWORD_REGEX, checkPasswordStrength } from '../utils/passwordValidation';

import {ROLE_DEFINITIONS} from '../constants';
import { get } from 'http';


interface BusinessUnit {
  id: number;
  business_unit: string;
};

interface StatCardProps {
  label: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

interface UserFormData {
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  username: string;
  phone_number: string;
  email: string;
  role: string;
  business_unit: number | '';
  password: string;
  confirm_password: string;
}

const initialFormData: UserFormData = {
  first_name: '', paternal_last_name: '', maternal_last_name: '',
  username: '', phone_number: '', email: '', role: '',
  business_unit: '', password: '', confirm_password: ''
};

interface TechnicalAuditLog {
  id: number
  first_name: string
  paternal_last_name: string
  maternal_last_name: string
  username: string
  role: string
  action: string
  created_at: string
}


export default function Roles() {
  const { portal, isCustomDomain } = useTenant();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [pwStrength, setPwStrength] = useState({
    hasLength: false, hasUppercase: false, hasNumber: false, hasSpecial: false
  });
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirm_password: '',
  });
  const [createPwStrength, setCreatePwStrength] = useState({
    hasLength: false, hasUppercase: false, hasNumber: false, hasSpecial: false
  });

  // Modals state
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrivilegesModalOpen, setIsPrivilegesModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [userForPassword, setUserForPassword] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const [technicalLogs, setTechnicalLogs] = useState<any[]>([]);
  const [logsCount, setLogsCount] = useState(0);
  const [logsNext, setLogsNext] = useState<string | null>(null);
  const [logsPrevious, setLogsPrevious] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.ceil(logsCount / pageSize);
  
  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  
  const [formData, setFormData] = useState<UserFormData>({
    first_name: '',
    paternal_last_name: '',
    maternal_last_name: '',
    username: '',
    phone_number: '',
    email: '',
    role: '',
    business_unit: '',
    password: '',
    confirm_password: ''
  });

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
  
    const businessUnitObj = businessUnits.find(
      bu => bu.business_unit === user.business_unit
    );
    
    setFormData({
      first_name: user.first_name ?? '',
      paternal_last_name: user.paternal_last_name ?? '',
      maternal_last_name: user.maternal_last_name ?? '',
      username: user.username ?? '',
      phone_number: user.phone_number ?? '',
      email: user.email ?? '',
      role: user.role ?? '',
      business_unit: businessUnitObj?.id ?? '',
      password: '',
      confirm_password: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenChangePassword = (user: User) => {
    setUserForPassword(user);
    setPasswordForm({ password: '', confirm_password: '' });
    setIsChangePasswordModalOpen(true);
  };

  const handleOpenView = (user: User) => {
    setEditingUser(user);
    setIsViewMode(true);

    const businessUnitObj = businessUnits.find(
      bu => bu.business_unit === user.business_unit
    );

    setFormData({
      first_name: user.first_name ?? '',
      paternal_last_name: user.paternal_last_name ?? '',
      maternal_last_name: user.maternal_last_name ?? '',
      username: user.username ?? '',
      phone_number: user.phone_number ?? '',
      email: user.email ?? '',
      role: user.role ?? '',
      business_unit: businessUnitObj?.id ?? '',
      password: '',
      confirm_password: ''
    });

    setIsModalOpen(true);
  };

  const changeUserPassword = async (
    userId: number,
    password: string,
    confirm_password: string
  ) => {
    const url = `${portal}/api/v1/users/user/change-password/${userId}/`;

    try {
      return await api.patch(`${API_BASE_URL}/` + url, { password, confirm_password });

    } catch (error: any) {
      if (error.response?.status === 400) {
        const apiErrors = error.response.data;

        if (apiErrors.password) {
          const msg = apiErrors.password[0];
          if (msg.includes('too similar'))      { toast.error('La contraseña es demasiado similar al nombre de usuario, nombre o correo.'); throw error; }
          if (msg.includes('too short'))        { toast.error('La contraseña debe tener al menos 8 caracteres.'); throw error; }
          if (msg.includes('too common'))       { toast.error('La contraseña es demasiado común.'); throw error; }
          if (msg.includes('entirely numeric')) { toast.error('La contraseña no puede ser solo números.'); throw error; }
          toast.error(msg); throw error;
        }

        if (apiErrors.confirm_password) {
          toast.error('Las contraseñas no coinciden.'); throw error;
        }

        if (apiErrors.non_field_errors) {
          toast.error(apiErrors.non_field_errors[0]); throw error;
        }

        toast.error('Datos inválidos. Revisa la información.');
      } else {
        toast.error('No se pudo cambiar la contraseña. Intenta de nuevo.');
      }
      throw error;
    }
  };

  const handleCloseChangePassword = () => {
    setIsChangePasswordModalOpen(false);
    setUserForPassword(null);
  };

  const getUsersData = async () => {
    try {

      const url = `${portal}/api/v1/users/`;

      const res = await api.get(`${API_BASE_URL}/` + url);
      setUsers(res.data || []);

    } catch (error) {
      toast.error('Error al obtener los usuarios.');
    }
  };

  const getTechnicalAuditLogsData = async (page = 1) => {
    try {

      const url = `${portal}/api/v1/audit-logs/technical/?page=${page}`;

      const res = await api.get(
        `${API_BASE_URL}/` + url
      );

      setTechnicalLogs(res.data.results);
      setLogsCount(res.data.count);
      setLogsNext(res.data.next);
      setLogsPrevious(res.data.previous);
      setCurrentPage(page);

    } catch (error) {
      toast.error('Error al obtener los logs de auditoría técnicos.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setIsViewMode(false);
    setFormData(initialFormData);
    setCreatePwStrength({ hasLength: false, hasUppercase: false, hasNumber: false, hasSpecial: false }); // ✅
  };

  const createUser = async (formData: UserFormData) => {
  const url = `${portal}/api/v1/users/user/`;

  try {
    const res = await api.post(`${API_BASE_URL}/` + url, {
      first_name:           formData.first_name,
      paternal_last_name:   formData.paternal_last_name,
      maternal_last_name:   formData.maternal_last_name,
      username:             formData.username,
      email:                formData.email,
      phone_number:         formData.phone_number,
      password:             formData.password,
      business_unit_id:     formData.business_unit,
      role:                 formData.role,
    });

    toast.success('Usuario creado correctamente');
    await getUsersData();

  } catch (error: any) {
    if (error.response?.status === 400) {
      const apiErrors = error.response.data;

      if (apiErrors.username) {
        const msg = apiErrors.username[0];
        if (msg.includes('already exists'))   { toast.error('El nombre de usuario ya está registrado.');  throw error; }
        if (msg.includes('at least 4'))       { toast.error('El usuario debe tener al menos 4 caracteres.'); throw error; }
        toast.error(msg); throw error;
      }
      if (apiErrors.email) {
        const msg = apiErrors.email[0];
        if (msg.includes('already exists'))   { toast.error('El correo ya está registrado.'); throw error; }
        if (msg.includes('valid email'))      { toast.error('El formato del correo es inválido.'); throw error; }
        toast.error(msg); throw error;
      }
      if (apiErrors.phone_number) {
        toast.error(apiErrors.phone_number[0]); throw error;
      }
      if (apiErrors.password) {
        const msg = apiErrors.password[0];
        if (msg.includes('too similar'))      { toast.error('La contraseña es demasiado similar al nombre de usuario, nombre, apellidos o correo.'); throw error; }
        if (msg.includes('too short'))        { toast.error('La contraseña debe tener al menos 12 caracteres.'); throw error; }
        if (msg.includes('too common'))       { toast.error('La contraseña es demasiado común.'); throw error; }
        if (msg.includes('entirely numeric')) { toast.error('La contraseña no puede ser solo números.'); throw error; }
        toast.error(msg); throw error;
      }
      if (apiErrors.non_field_errors) {
        toast.error(apiErrors.non_field_errors[0]); throw error;
      }
      toast.error('Datos inválidos. Revisa la información.');
    } else {
      toast.error('Error al crear usuario. Intenta de nuevo.');
    }
    throw error; // ← siempre relanza
  }
};

const updateUser = async (userData: UserFormData, userId: number) => {
  const url = `${portal}/api/v1/users/user/user-update/${userId}/`;

  try {
    await api.patch(`${API_BASE_URL}/` + url, {
      first_name:        userData.first_name,
      paternal_last_name: userData.paternal_last_name,
      maternal_last_name: userData.maternal_last_name,
      username:          userData.username,
      email:             userData.email,
      phone_number:      userData.phone_number,
      business_unit_id:  userData.business_unit,
      role:              userData.role,
    });

    toast.success('Usuario actualizado correctamente');
    await getUsersData();

  } catch (error) {
    toast.error('Error al actualizar usuario.');
    throw error; // ← agrega esto
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!editingUser) {
      if (!PASSWORD_REGEX.test(formData.password)) {
        toast.error('La contraseña no cumple los requisitos de seguridad.');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
    }

    try {
      if (editingUser) {
        // 🔁 ACTUALIZACIÓN
        const updatedUser = await updateUser(formData, editingUser.id);
        setUsers(prev =>
          prev.map(u =>
            u.id === editingUser.id ? { ...u, ...updatedUser } : u
          )
        );
      } else {
        // ➕ CREACIÓN
        const newUser = await createUser(formData);
      }

      handleCloseModal();
    } catch (error) {
      
    }
  };


  const handleDelete = async (id: string) => {

    const url = `${portal}/api/v1/users/user/delete/${id}/`;

    try {
      const res = await api.delete(`${API_BASE_URL}/` + url);
      toast.success('Usuario eliminado correctamente');
      await getUsersData();
    } catch (error) {
      toast.error('Error al eliminar usuario.');
    }
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const validateForm = (): boolean => {
      if (!formData.first_name.trim()) {
          toast.error('El nombre es obligatorio.'); return false;
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.first_name.trim())) {
          toast.error('El nombre solo puede contener letras y espacios.'); return false;
      }
      if (!formData.paternal_last_name.trim()) {
          toast.error('El apellido paterno es obligatorio.'); return false;
      }
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.paternal_last_name.trim())) {
          toast.error('El apellido paterno solo puede contener letras y espacios.'); return false;
      }
      if (!formData.username.trim()) {
          toast.error('El nombre de usuario es obligatorio.'); return false;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
          toast.error('El usuario solo puede contener letras, números y guión bajo.'); return false;
      }
      if (formData.username.length < 4) {
          toast.error('El usuario debe tener al menos 4 caracteres.'); return false;
      }
      if (!formData.email.trim()) {
          toast.error('El correo es obligatorio.'); return false;
      }
      if (!/^[a-zA-Z0-9._+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
          toast.error('El formato del correo es inválido.'); return false;
      }
      if (!formData.phone_number.trim()) {
          toast.error('El teléfono es obligatorio.'); return false;
      }
      const cleanedPhone = formData.phone_number.replace(/\D/g, '');
      if (cleanedPhone.length !== 10) {
          toast.error('El teléfono debe tener 10 dígitos.'); return false;
      }
      if (!formData.role) {
          toast.error('Selecciona un rol operativo.'); return false;
      }
      if (!formData.business_unit) {
          toast.error('Selecciona un departamento.'); return false;
      }
      if (formData.username.length < 4) {
          toast.error('El usuario debe tener al menos 4 caracteres.'); return false;
      }
      return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const nameFields = ['first_name', 'paternal_last_name', 'maternal_last_name'];
    if (nameFields.includes(name)) {
        if (value !== '' && !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value)) return;
    }

    if (name === 'phone_number') {
        if (value !== '' && !/^[\d\s\-\+\(\)]*$/.test(value)) return;
    }

    if (name === 'username') {
        if (value !== '' && !/^[a-zA-Z0-9_]*$/.test(value)) return;
    }

    if (name === 'email') {
        const val = value.replace(/[^a-zA-Z0-9@._+\-]/g, '');
        setFormData({ ...formData, email: val }); return;
    }

    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    if (!portal) return;

    const controller = new AbortController();

    const init = async () => {
      try {
        const [usersRes, catalogsRes] = await Promise.all([
          api.get(`${API_BASE_URL}/${portal}/api/v1/users/`, { signal: controller.signal }),
          api.get(`${API_BASE_URL}/${portal}/api/v1/catalogs/`, { signal: controller.signal }),
        ]);
        setUsers(usersRes.data || []);
        setBusinessUnits(catalogsRes.data.business_units || []);
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
        toast.error('Error al cargar datos iniciales.');
      }

      // Logs aparte, no bloquea el render principal
      getTechnicalAuditLogsData(1);
    };

    init();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      controller.abort();
      document.removeEventListener('mousedown', handleClickOutside);
    };

  }, [portal]); // ← portal como dep, no [] vacío

  const formatDateTime12h = (dateString: string) => {
    const date  = new Date(dateString);
    const day   = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year  = date.getFullYear();
    let hours   = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm  = hours >= 12 ? 'PM' : 'AM';
    hours       = hours % 12 || 12;
    return {
      date: `${day}-${month}-${year}`,
      time: `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`,
    };
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'todos' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleOpenMatrix = (roleId: string) => {
    setSelectedRoleForMatrix(roleId);
    setIsPrivilegesModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <Toaster position="bottom-right" richColors />
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
                 <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                      <Users size={24} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estructura Organizacional</h1>
                      <p className="text-slate-500 text-sm font-medium">Control de identidades y segregación de funciones.</p>
                    </div>
                 </div>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 active:scale-95 shrink-0"
            >
                <UserPlus size={18} />
                REGISTRAR NUEVA CUENTA
            </button>
        </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Cuentas Activas"
          value={users.filter(u => u.is_active).length}
          subtitle={`${users.length} cuentas en total`}
          icon={Users}
          color="text-slate-900"
          bg="bg-slate-50"
        />

        <StatCard
          label="Nivel Estratégico"
          value={users.filter(
            u => u.is_active && ['COMPLIANCE_OFFICER', 'EXTERNAL_AUDITOR'].includes(u.role)
          ).length}
          subtitle="Oficiales de cumplimiento y auditores externos"
          icon={BookOpen}
          color="text-blue-600"
          bg="bg-blue-50"
        />

        <StatCard
          label="Nivel Operativo"
          value={users.filter(
            u => u.is_active && ['CASE_MANAGER', 'FORENSIC_INVESTIGATOR'].includes(u.role)
          ).length}
          subtitle="Manejadores de casos e investigadores forenses"
          icon={FolderSearch}
          color="text-cyan-600"
          bg="bg-cyan-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LISTA DE USUARIOS PRINCIPAL */}
        <div className="xl:col-span-8 space-y-4">
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6 bg-white">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre o correo..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-300 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Filter size={16} className="text-slate-400" />
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="flex-1 md:w-48 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold uppercase tracking-widest focus:outline-none"
                        >
                            <option value="todos">Todos los Roles</option>
                            {ROLE_DEFINITIONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Identidad Corporativa</th>
                                <th className="px-8 py-5">Rol Operativo</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <tr key={user.id}
                                    className={`
                                      transition-all group
                                      ${user.is_active
                                        ? 'hover:bg-slate-50/80'
                                        : 'bg-slate-50/40 opacity-60 grayscale'}
                                    `}
                                  >

                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`
                                                w-10 h-10 rounded-full flex items-center justify-center
                                                font-bold text-xs shadow-sm
                                                transition-all
                                                ${user.is_active
                                                  ? (
                                                      user.role === 'SuperAdmin'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : user.role === 'Compliance'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    )
                                                  : 'bg-slate-200 text-slate-500'}
                                              `}
                                            >
                                              {user.first_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`
                                                text-sm font-bold transition-colors
                                                ${user.is_active
                                                  ? 'text-slate-900 group-hover:text-blue-600'
                                                  : 'text-slate-500'}
                                              `}>
                                                {user.first_name}
                                              </span>

                                              <span className={`
                                                text-[11px] font-medium
                                                ${user.is_active ? 'text-slate-500' : 'text-slate-400'}
                                              `}>
                                                {user.email}
                                              </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      {(() => {
                                        const role = ROLE_DEFINITIONS.find(r => r.id === user.role);

                                        if (!role) {
                                          return <StatusBadge type="role" status={user.role} />;
                                        }

                                        const colorMap: Record<string, string> = {
                                          SUPER_ADMIN: 'amber',
                                          IT_ADMIN: 'slate',
                                          COMPLIANCE_OFFICER: 'purple',
                                          CASE_MANAGER: 'blue',
                                          FORENSIC_INVESTIGATOR: 'cyan',
                                          EXTERNAL_AUDITOR: 'emerald',
                                        };

                                        const color = colorMap[user.role] ?? 'slate';

                                        return (
                                          <div className={`
                                              inline-flex items-center gap-2 px-3 py-1.5 rounded-xl
                                              border transition-all
                                              ${user.is_active
                                                ? `bg-${color}-500/10 border-white/5`
                                                : 'bg-slate-100 border-slate-200'}
                                            `}
                                          >
                                            <role.icon
                                              size={14}
                                              className={user.is_active ? `text-${color}-400` : 'text-slate-400'}
                                            />
                                            <span
                                              className={`
                                                text-[11px] font-bold tracking-wide
                                                ${user.is_active ? `text-${color}-400` : 'text-slate-400'}
                                              `}
                                            >
                                              {role.label}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <button
                                              onClick={() => handleOpenView(user)}
                                              title="Ver usuario"
                                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white
                                                        rounded-xl shadow-sm border border-transparent
                                                        hover:border-slate-100 transition-all"
                                            >
                                              <Eye size={14} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!user.is_active) return;
                                                handleOpenEdit(user);
                                              }}
                                              title="Editar Usuario"
                                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                            >
                                              <Edit2 size={14} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!user.is_active) return;
                                                setUserToDelete(user);
                                                setIsDeleteModalOpen(true);
                                              }}
                                              title="Eliminar Cuenta"
                                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm
                                                        border border-transparent hover:border-slate-100 transition-all
                                                        disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (!user.is_active) return;
                                                handleOpenChangePassword(user);
                                              }}
                                              title="Cambiar contraseña"
                                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                            >
                                              <Key size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                              <tr>
                                <td colSpan={4} className="px-8 py-20 text-center">
                                  <div className="flex flex-col items-center gap-4 text-slate-400">
                                    <div className="p-4 bg-slate-50 rounded-full"><Users size={32} strokeWidth={1} /></div>
                                    <p className="text-sm font-medium">No se encontraron usuarios con esos criterios.</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
              <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-bold text-blue-900">Segregación de Funciones</p>
                <p className="text-xs text-blue-700/80 leading-relaxed font-medium mt-1">
                  Este sistema cumple con los estándares internacionales de seguridad. Los roles de Administrador IT no tienen acceso a la lectura de denuncias para evitar conflictos de interés.
                </p>
              </div>
            </div>
        </div>

        {/* GUÍA DE ROLES DINÁMICA */}
        <div className="xl:col-span-4 space-y-6">
            <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">Matriz de Privilegios</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Seguridad Organizacional</p>
                      </div>
                  </div>
                  
                  <div className="space-y-4">
                      {ROLE_DEFINITIONS.map(role => (
                        <div 
                          key={role.id} 
                          onClick={() => handleOpenMatrix(role.id)}
                          className="group cursor-pointer p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <role.icon size={16} className={`text-${role.color}-400`} />
                              <span className="text-xs font-bold text-slate-200">{role.label}</span>
                            </div>
                            <ChevronRight size={14} className="text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{role.desc}</p>
                        </div>
                      ))}
                  </div>
                </div>
                <Zap size={150} className="absolute -bottom-10 -right-10 text-white/[0.02]" />
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Fingerprint size={14} className="text-blue-500" /> Auditoría de Accesos
                </h3>
                <div className="space-y-4">
                  {technicalLogs.slice(0, 3).map((log) => {
                    const fullName = `${log.first_name} ${log.paternal_last_name} ${log.maternal_last_name}`;
                    const time = new Date(log.created_at).toLocaleTimeString();

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {fullName}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">
                            {log.role} • {log.action}
                          </p>
                        </div>

                        <span className="text-[9px] font-bold text-slate-300">
                          {(() => {
                            const { date, time } = formatDateTime12h(log.created_at);
                            return `${date} ${time}`;
                          })()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button 
                  onClick={() => setIsLogsModalOpen(true)}
                  className="w-full mt-6 py-3 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Ver Logs Completos
                </button>
            </div>
        </div>
      </div>

      {/* MODAL DE ALTA / EDICIÓN MEJORADO */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="font-black text-slate-900 tracking-tight text-xl">
                          {isViewMode
                            ? 'Detalle de Usuario'
                            : editingUser
                            ? 'Actualizar Cuenta'
                            : 'Alta de Personal'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Asignación de credenciales forenses.</p>
                      </div>
                      <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-900 p-3 hover:bg-white rounded-2xl transition-all shadow-sm">
                          <X size={20} />
                      </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                            <div className="relative">
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="text" 
                                    className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="Ej. Juan"
                                    maxLength={50}
                                    value={formData.first_name}
                                    name="first_name"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Apellido paterno</label>
                            <div className="relative">
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="text"
                                    className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="Ej. Pérez"
                                    value={formData.paternal_last_name}
                                    maxLength={50}
                                    name="paternal_last_name"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Apellido materno</label>
                            <div className="relative">
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="text" 
                                    className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="Ej. Torres"
                                    value={formData.maternal_last_name}
                                    maxLength={50}
                                    name="maternal_last_name"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nombre de usuario</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="text"
                                    maxLength={30}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="Ej. JohnDoe"
                                    value={formData.username}
                                    name="username"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Número teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="text" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="Ej. 0123456789"
                                    value={formData.phone_number}
                                    maxLength={15}
                                    name="phone_number"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Corporativo</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                <input 
                                    disabled={isViewMode}
                                    required
                                    type="email" 
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 text-sm font-semibold transition-all"
                                    placeholder="correo@empresa.com"
                                    value={formData.email}
                                    name="email"
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {!editingUser && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                Contraseña
                              </label>
                              <div className="relative">
                                <input
                                  disabled={isViewMode}
                                  required
                                  type="password"
                                  className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl
                                            focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400
                                            text-sm font-semibold transition-all"
                                  placeholder="Contraseña"
                                  value={formData.password}
                                  onChange={(e) => {
                                    setFormData({ ...formData, password: e.target.value });
                                    setCreatePwStrength(checkPasswordStrength(e.target.value));
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                Confirma contraseña
                              </label>
                              <div className="relative">
                                <input
                                  disabled={isViewMode}
                                  required
                                  type="password"
                                  className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl
                                            focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400
                                            text-sm font-semibold transition-all"
                                  placeholder="Confirma tu contraseña"
                                  value={formData.confirm_password}
                                  onChange={(e) =>
                                    setFormData({ ...formData, confirm_password: e.target.value })
                                  }
                                />
                              </div>
                            </div>

                            {formData.password.length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {[
                                  { ok: createPwStrength.hasLength,    label: 'Mínimo 8 caracteres' },
                                  { ok: createPwStrength.hasUppercase, label: '1 letra mayúscula' },
                                  { ok: createPwStrength.hasNumber,    label: '1 número' },
                                  { ok: createPwStrength.hasSpecial,   label: '1 carácter especial (!@#...)' },
                                ].map(({ ok, label }) => (
                                  <div key={label} className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    <span>{ok ? '✓' : '○'}</span>
                                    <span>{label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                            Department
                          </label>

                          <div className="relative" ref={dropdownRef}>
                            <Building
                              className="absolute left-4 top-3.5 text-slate-400 pointer-events-none z-10"
                              size={18}
                            />

                            <button
                              disabled={isViewMode}
                              type="button"
                              onClick={() => setIsOpen(!isOpen)}
                              className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl
                                        focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400
                                        text-sm font-semibold transition-all cursor-pointer hover:bg-slate-100/50
                                        text-left"
                            >
                              {formData.business_unit && businessUnits.find(bu => bu.id === formData.business_unit)
                                ? businessUnits.find(bu => bu.id === formData.business_unit)?.business_unit
                                : 'Selecciona una opción'}
                            </button>

                            <ChevronDown
                              className={`absolute right-4 top-3.5 text-slate-400 pointer-events-none transition-transform ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                              size={18}
                            />

                            {isOpen && (
                              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                                <div className="max-h-[120px] overflow-y-auto p-1">
                                  {businessUnits.map((business_unit) => (
                                    <button
                                      disabled={isViewMode}
                                      key={business_unit.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          business_unit: business_unit.id,
                                        });
                                        setIsOpen(false); // ✅ Cierra el dropdown al seleccionar
                                      }}
                                      className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                                        ${formData.business_unit === business_unit.id
                                          ? 'bg-blue-500 text-white'
                                          : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                      {business_unit.business_unit}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {!editingUser && (
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Rol Operativo Designado</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {ROLE_DEFINITIONS.map((role) => {
                                const isSuperAdmin = role.id === 'SUPER_ADMIN';
                                const isSelected = formData.role === role.id;

                                return (
                                  <button
                                    key={role.id}
                                    type="button"
                                    disabled={isSuperAdmin || isViewMode}
                                    onClick={() => {
                                      if (isSuperAdmin) return;
                                      setFormData({ ...formData, role: role.id as UserRole });
                                    }}
                                    className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all text-center group
                                      ${
                                        isSuperAdmin
                                          ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60'
                                          : isSelected
                                          ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]'
                                          : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                                      }
                                    `}
                                  >
                                    <role.icon
                                      size={20}
                                      className={
                                        isSuperAdmin
                                          ? 'text-slate-300'
                                          : isSelected
                                          ? `text-${role.color}-400`
                                          : 'text-slate-300'
                                      }
                                    />
                                    <span className="text-[9px] font-black uppercase tracking-widest">
                                      {role.label.split(' ')[0]}
                                    </span>
                                  </button>
                                );
                            })}
                          </div>
                      </div>)}

                      <div className="pt-6 flex gap-4">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs
                                    hover:bg-slate-200 transition-colors uppercase tracking-[0.2em]"
                        >
                          Cerrar
                        </button>

                        {!isViewMode && (
                          <button
                            type="submit"
                            className="flex-2 py-4 bg-blue-600 text-white font-bold rounded-2xl text-xs
                                      hover:bg-slate-900 shadow-2xl shadow-blue-200 transition-all
                                      uppercase tracking-[0.2em] flex items-center justify-center gap-3 px-10"
                          >
                            Guardar cambios
                          </button>
                        )}
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* MODAL DETALLE DE PRIVILEGIOS */}
      {isPrivilegesModalOpen && selectedRoleForMatrix && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-10 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-3xl bg-slate-900 text-white shadow-xl`}>
                  {React.createElement(ROLE_DEFINITIONS.find(r => r.id === selectedRoleForMatrix)?.icon || Shield, { size: 32 })}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{ROLE_DEFINITIONS.find(r => r.id === selectedRoleForMatrix)?.label}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Desglose de Capacidades Operativas</p>
                </div>
              </div>
              <button onClick={() => setIsPrivilegesModalOpen(false)} className="p-3 bg-white rounded-2xl hover:bg-slate-100 text-slate-400 transition-all border border-slate-100 shadow-sm">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLE_DEFINITIONS.find(r => r.id === selectedRoleForMatrix)?.permissions.map((perm, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:bg-white hover:border-blue-200 transition-all">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{perm}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-900 text-white rounded-[32px] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Nivel de Responsabilidad</p>
                  <p className="text-lg font-bold">Acceso de Datos {selectedRoleForMatrix === 'SuperAdmin' ? 'Ilimitado' : selectedRoleForMatrix === 'Administrador' ? 'Técnico' : 'Sensible'}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Key size={24} className="text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {isChangePasswordModalOpen && userForPassword && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* HEADER */}
            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 tracking-tight text-xl">
                  Cambiar Contraseña
                </h3>
              </div>
              <button
                onClick={handleCloseChangePassword}
                className="text-slate-400 hover:text-slate-900 p-3 hover:bg-white rounded-2xl transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
              <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!userForPassword) return;

                // ✅ Validaciones aquí, antes de llamar a la API
                if (!PASSWORD_REGEX.test(passwordForm.password)) {
                  toast.error('La contraseña no cumple los requisitos de seguridad.');
                  return;
                }

                if (passwordForm.password !== passwordForm.confirm_password) {
                  toast.error('Las contraseñas no coinciden');
                  return;
                }

                try {
                  await changeUserPassword(
                    userForPassword.id,
                    passwordForm.password,
                    passwordForm.confirm_password
                  );
                  toast.success('Contraseña actualizada');
                  handleCloseChangePassword();
                } catch (error) {
                }
              }}
              className="p-10 space-y-6"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Nueva contraseña
                </label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl
                            focus:outline-none focus:ring-4 focus:ring-amber-600/10 focus:border-amber-400
                            text-sm font-semibold transition-all"
                  value={passwordForm.password}
                  maxLength={128}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, password: e.target.value });
                    setPwStrength(checkPasswordStrength(e.target.value));
                  }}
                />
              </div>

              {passwordForm.password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {[
                    { ok: pwStrength.hasLength,    label: 'Mínimo 12 caracteres' },
                    { ok: pwStrength.hasUppercase, label: '1 letra mayúscula' },
                    { ok: pwStrength.hasNumber,    label: '1 número' },
                    { ok: pwStrength.hasSpecial,   label: '1 carácter especial (!@#...)' },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span>{ok ? '✓' : '○'}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  Confirmar contraseña
                </label>
                <input
                  required
                  type="password"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl
                            focus:outline-none focus:ring-4 focus:ring-amber-600/10 focus:border-amber-400
                            text-sm font-semibold transition-all"
                  value={passwordForm.confirm_password}
                  maxLength={128}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirm_password: e.target.value,
                    })
                  }
                />
              </div>

              {/* ACTIONS */}
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={handleCloseChangePassword}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs
                            hover:bg-slate-200 transition-colors uppercase tracking-[0.2em]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="flex-1 py-4 bg-amber-600 text-white font-bold rounded-2xl text-xs
                            hover:bg-slate-900 shadow-2xl shadow-amber-200 transition-all
                            uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                >
                  <Key size={18} />
                  Cambiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINAR USUARIO */}
      {isDeleteModalOpen && userToDelete && (
        <div className="
          fixed inset-0 z-[130]
          flex items-center justify-center p-4
          bg-slate-900/70 backdrop-blur-md
          animate-in fade-in duration-300
        ">
          <div className="
            bg-white rounded-[40px] shadow-2xl
            w-full max-w-md overflow-hidden
            animate-in zoom-in-95 duration-300
          ">

            {/* HEADER */}
            <div className="
              px-10 py-8
              border-b border-slate-50
              flex justify-between items-center
              bg-rose-50/50
            ">
              <div>
                <h3 className="font-black text-slate-900 tracking-tight text-xl">
                  Desactivar usuario
                </h3>
              </div>

              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="text-slate-400 hover:text-slate-900
                          p-3 hover:bg-white rounded-2xl
                          transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}
            <div className="p-10 space-y-6">

              {/* WARNING */}
              <div className="
                flex items-start gap-3
                p-4 rounded-3xl
                bg-rose-50/80 border border-rose-300
              ">
                <Info size={16} className="text-rose-600 mt-0.5" />
                <p className="text-xs text-rose-700 font-medium leading-relaxed">
                  Esta acción es irreversible, el usuario seguirá existiendo en el sistema, pero perderá el acceso de forma inmediata y todos sus permisos quedarán revocados.
                </p>
              </div>

              {/* ACTIONS */}
              <div className="pt-6 flex gap-4">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                  }}
                  className="
                    flex-1 py-4
                    bg-slate-100 text-slate-600
                    font-bold rounded-2xl text-xs
                    hover:bg-slate-200 transition-colors
                    uppercase tracking-[0.2em]
                  "
                >
                  Cancelar
                </button>

                <button
                  onClick={async () => {
                    handleDelete(userToDelete.id);
                  }}
                  className="
                    flex-1 py-4
                    bg-rose-600 text-white
                    font-black rounded-2xl text-xs
                    hover:bg-slate-900
                    shadow-2xl shadow-rose-200
                    transition-all
                    uppercase tracking-[0.2em]
                  "
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL DE LOGS COMPLETOS */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[48px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-10 border-b border-slate-50 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <History className="text-blue-400" size={32} />
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Registro de inicio de sesión</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Audit consolidado</p>
                </div>
              </div>
              <button onClick={() => setIsLogsModalOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 text-white transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="space-y-4">
                  {technicalLogs.map((log) => {
                    const fullName = `${log.first_name} ${log.paternal_last_name} ${log.maternal_last_name}`;
                    const { date, time } = formatDateTime12h(log.created_at);

                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-6 p-4 hover:bg-slate-50 rounded-2xl transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="text-center min-w-[80px]">
                          <p className="text-[10px] font-black text-slate-400 uppercase">
                            {date}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {time}
                          </p>
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-800">
                            {fullName}
                          </p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            {log.role} • {log.action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-6">
              <div className="flex justify-between items-center">

                <p className="text-xs text-slate-400 font-medium italic flex items-center gap-2">
                  <ShieldAlert size={14} />
                  Los logs no pueden ser editados ni eliminados por política interna.
                </p>

              </div>

              {/* PAGINADOR */}
              <div className="flex justify-center items-center gap-2">

                {/* Primera */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => getTechnicalAuditLogsData(1)}
                  className="px-3 py-2 text-xs font-bold bg-white border rounded-lg disabled:opacity-40"
                >
                  « Primera
                </button>

                {/* Anterior */}
                <button
                  disabled={!logsPrevious}
                  onClick={() => getTechnicalAuditLogsData(currentPage - 1)}
                  className="px-3 py-2 text-xs font-bold bg-white border rounded-lg disabled:opacity-40"
                >
                  ‹ Anterior
                </button>

                {/* Página actual */}
                <span className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                {/* Siguiente */}
                <button
                  disabled={!logsNext}
                  onClick={() => getTechnicalAuditLogsData(currentPage + 1)}
                  className="px-3 py-2 text-xs font-bold bg-white border rounded-lg disabled:opacity-40"
                >
                  Siguiente ›
                </button>

                {/* Última */}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => getTechnicalAuditLogsData(totalPages)}
                  className="px-3 py-2 text-xs font-bold bg-white border rounded-lg disabled:opacity-40"
                >
                  Última »
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, value, subtitle, icon: Icon, color, bg }: StatCardProps) => (
  <div className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-5 group hover:border-blue-200 transition-all">
    <div className={`p-5 ${bg} rounded-[24px] ${color} transition-transform group-hover:scale-110 duration-500`}>
      <Icon size={28} />
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{label}</p>
      <p className="text-4xl font-black text-slate-900 tracking-tighter">{value}</p>
      <p className="text-[12px] text-slate-400 font-medium mt-1">{subtitle}</p>
    </div>
  </div>
);
