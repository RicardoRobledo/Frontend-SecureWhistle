import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Building } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import api from '../utils/api';
import { clearToken } from '../utils/tokenStore';

import { PASSWORD_REGEX, checkPasswordStrength } from '../utils/passwordValidation';


interface ProfileFormData {
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  email: string;
  phone_number: string;
  username: string;
  role: string;
  business_unit: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const EMPTY_PROFILE: ProfileFormData = {
  first_name: '',
  paternal_last_name: '',
  maternal_last_name: '',
  email: '',
  phone_number: '',
  username: '',
  role: '',
  business_unit: '',
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { portal, isCustomDomain } = useTenant();

  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const [formData, setFormData] = useState<ProfileFormData>(EMPTY_PROFILE);

  const [originalData, setOriginalData] = useState<ProfileFormData>(EMPTY_PROFILE);

  const userRoles: Record<string, string> = {
    SUPER_ADMIN:          'Administrador',
    IT_ADMIN:             'Administrador IT',
    COMPLIANCE_OFFICER:   'Oficial de Cumplimiento',
    CASE_MANAGER:         'Gestor de Casos',
    FORENSIC_INVESTIGATOR:'Investigador Forense',
    EXTERNAL_AUDITOR:     'Auditor Externo',
  };

  const onlyLettersAndSpaces = (value: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value.trim());

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordStrength, setPasswordStrength] = useState<{
    hasUppercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    hasLength: boolean;
  }>({ hasUppercase: false, hasNumber: false, hasSpecial: false, hasLength: false });

  const csrftoken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];
  
  const handleLogout = async () => {
    await api.post(`${API_BASE_URL}/accounts/api/v1/token/logout/`,
    {},
    {
      withCredentials: true,
      headers: {
        'X-CSRFToken': csrftoken
      }
    });
    clearToken();

    if(isCustomDomain) navigate(`/gateway`);
    else navigate(`/${portal}/gateway`);
  };

  useEffect(() => {
    if (!portal) return;

    const controller = new AbortController();

    const load = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(
          `${API_BASE_URL}/${portal}/api/v1/users/user-profile/`,
          { signal: controller.signal }
        );
        const data = res.data;
        console.log('Perfil cargado:', data);
        const parsed: ProfileFormData = {
          first_name:         data.first_name         || '',
          paternal_last_name: data.paternal_last_name || '',
          maternal_last_name: data.maternal_last_name || '',
          email:              data.email              || '',
          phone_number:       data.phone_number       || '',
          username:           data.username           || '',
          role:               data.role               || '',
          business_unit:      data.business_unit      || '',
        };
        setFormData(parsed);
        setOriginalData(parsed);
      } catch (err: any) {
        if (err?.code === 'ERR_CANCELED') return;
        toast.error('Error al obtener el perfil de usuario.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
    return () => controller.abort();

  }, [portal]); // ← solo portal, sin fetchProfile

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

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (name === 'new_password') setPasswordStrength(checkPasswordStrength(value));
  };

  const handleSaveProfile = async () => {

    if (!validateProfileForm()) return;

    const url = `/${portal}/api/v1/users/user-profile/`;

    try {
      setIsProfileSaving(true);
      await api.patch(`${API_BASE_URL}` + url, formData);
      setOriginalData(formData);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      toast.error('Error al guardar los cambios');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const validateProfileForm = (): boolean => {
    if (!formData.first_name.trim()) {
      toast.error('El nombre es obligatorio.'); return false;
    }
    if (!onlyLettersAndSpaces(formData.first_name)) {
      toast.error('El nombre solo puede contener letras y espacios.'); return false;
    }
    if (!formData.paternal_last_name.trim()) {
      toast.error('El apellido paterno es obligatorio.'); return false;
    }
    if (!onlyLettersAndSpaces(formData.paternal_last_name)) {
      toast.error('El apellido paterno solo puede contener letras y espacios.'); return false;
    }
    if (!formData.maternal_last_name.trim()) {
      toast.error('El apellido materno es obligatorio.'); return false;
    }
    if (!onlyLettersAndSpaces(formData.maternal_last_name)) {
      toast.error('El apellido materno solo puede contener letras y espacios.'); return false;
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('El formato del correo es inválido.'); return false;
    }
    if (formData.phone_number) {
      const cleaned = formData.phone_number.replace(/\D/g, '');
      if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone_number)) {
        toast.error('El teléfono solo puede contener números.'); return false;
      }
      if (cleaned.length !== 10) {
        toast.error('El teléfono debe tener 10 dígitos.'); return false;
      }
    }
    return true;
  };

  const handleChangePassword = async () => {

    if (passwordData.new_password === passwordData.current_password) {
      toast.error('La nueva contraseña no puede ser igual a la actual.');
      return;
    }

    if (!PASSWORD_REGEX.test(passwordData.new_password)) {
      toast.error('La contraseña debe tener mínimo 12 caracteres, mayúscula, número y carácter especial.');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    const url = `${portal}/api/v1/users/user-password-profile/`;

    try {
      setIsPasswordSaving(true);
      await api.patch(`${API_BASE_URL}/` + url, {
        current_password: passwordData.current_password,
        new_password:     passwordData.new_password,
        confirm_password: passwordData.confirm_password,
      });

      clearToken();
      toast.success('Contraseña actualizada. Inicia sesión nuevamente.');

      handleLogout();

    } catch (error: any) {
      const data = error?.response?.data;

      if (data) {
        if (data.current_password) {
          toast.error('La contraseña actual es incorrecta.');
          return;
        }
        if (data.confirm_password) {
          const msg = data.confirm_password[0];
          if (msg.includes('at least 12') || msg.includes('min_length')) {
            toast.error('La contraseña debe tener al menos 12 caracteres.');
          } else {
            toast.error('Las contraseñas no coinciden.');
          }
          return;
        }
        if (data.new_password) {
          const msg = data.new_password[0];
          if (msg.includes('too short'))              toast.error('La contraseña debe tener al menos 12 caracteres.');
          else if (msg.includes('too common'))        toast.error('La contraseña es demasiado común.');
          else if (msg.includes('too similar'))       toast.error('La contraseña es demasiado similar al nombre de usuario, nombre, apellidos o correo.');
          else if (msg.includes('entirely numeric'))  toast.error('La contraseña no puede ser solo números.');
          else if (msg.includes('igual a la actual')) toast.error('La nueva contraseña no puede ser igual a la actual.');
          else if (msg.includes('least 12 characters')) toast.error('La contraseña debe tener al menos 12 caracteres.');
          else                                        toast.error(msg);
          return;
        }
        if (data.non_field_errors) {
          toast.error(data.non_field_errors[0]);
          return;
        }
        toast.error('Datos inválidos. Revisa la información.'); // ← agrega esto
        return;
      }

      toast.error('Error al cambiar la contraseña. Intenta de nuevo.'); // ← y esto
    }finally {
      setIsPasswordSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    toast.info('Cambios descartados');
  };

  const getInitials = (): string => {
    const first = formData.first_name?.trim().charAt(0).toUpperCase() ?? '';
    const last  = formData.paternal_last_name?.trim().charAt(0).toUpperCase() ?? '';
    return (first + last) || 'U';
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Toaster position="bottom-right" richColors />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
        <p className="text-gray-500">Gestiona tu información personal y configuración</p>
      </div>

      {/* Información Personal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Información Personal</h2>
          <p className="text-sm text-gray-500">Tu información de perfil visible para otros administradores</p>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {getInitials()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {formData.first_name} {formData.paternal_last_name}
              </h3>
              <p className="text-gray-500">{userRoles[formData.role] || 'Usuario'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu nombre"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Apellido paterno</label>
              <input
                type="text"
                name="paternal_last_name"
                value={formData.paternal_last_name}
                onChange={handleInputChange}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu apellido paterno"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Apellido materno</label>
              <input
                type="text"
                name="maternal_last_name"
                value={formData.maternal_last_name}
                onChange={handleInputChange}
                maxLength={50}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu apellido materno"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Nombre de usuario</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  maxLength={30}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="usuario123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  maxLength={100}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  maxLength={15}
                  pattern="[\+\d\s\-\(\)]{7,15}"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="+52 123 456 7890"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Departamento</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.business_unit || 'No asignado'}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-gray-500 bg-gray-50 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isProfileSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProfileSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {/* Sección de Seguridad */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Seguridad</h2>
          <p className="text-sm text-gray-500">Actualiza tu contraseña</p>
        </div>

        <div className="p-8 space-y-4">

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contraseña actual</label>
            <input
              type="password"
              name="current_password"
              value={passwordData.current_password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
            <input
              type="password"
              name="new_password"
              value={passwordData.new_password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />

            {passwordData.new_password.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { ok: passwordStrength.hasLength,    label: 'Mínimo 12 caracteres' },
                  { ok: passwordStrength.hasUppercase, label: '1 letra mayúscula' },
                  { ok: passwordStrength.hasNumber,    label: '1 número' },
                  { ok: passwordStrength.hasSpecial,   label: '1 carácter especial (!@#...)' },
                ].map(({ ok, label }) => (
                  <div key={label} className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <span>{ok ? '✓' : '○'}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Confirmar nueva contraseña</label>
            <input
              type="password"
              name="confirm_password"
              value={passwordData.confirm_password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {/* Indicador de coincidencia */}
            {passwordData.confirm_password.length > 0 && (
              <p className={`text-xs font-medium mt-1 ${
                passwordData.new_password === passwordData.confirm_password
                  ? 'text-emerald-600'
                  : 'text-rose-500'
              }`}>
                {passwordData.new_password === passwordData.confirm_password
                  ? '✓ Las contraseñas coinciden'
                  : '○ Las contraseñas no coinciden'}
              </p>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleChangePassword}
              disabled={
                isPasswordSaving ||
                !passwordData.current_password ||
                !passwordData.new_password ||
                !passwordData.confirm_password
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPasswordSaving ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;