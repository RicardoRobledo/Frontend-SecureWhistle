import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { API_BASE_URL } from '../config/api';
import { useTenant } from '../context/TenantContext';
import { MapPin, Building2, Plus, Trash2, ShieldCheck, Info } from 'lucide-react';
import api from '../utils/api';

// ✅ FIX 1: Interfaces correctas — reemplaza useState<string[]>
interface CatalogState {
  id: string;
  state_headquearters: string;
}

interface CatalogBusinessUnit {
  id: string;
  business_unit: string;
}


const MAX_INPUT_LENGTH = 100;

const CatalogManagement: React.FC = () => {
  const { portal, isCustomDomain, isLoading, domainError, portalError } = useTenant();

  const [businessUnits, setBusinessUnits] = useState<CatalogBusinessUnit[]>([]);
  const [states, setStates] = useState<CatalogState[]>([]);
  const [newState, setNewState] = useState('');
  const [newBusinessUnit, setNewBusinessUnit] = useState('');

  const [confirmDeleteState, setConfirmDeleteState] = useState<string | null>(null);
  const [confirmDeleteBU, setConfirmDeleteBU] = useState<string | null>(null);

  const onlyLettersAndSpaces = (value: string) =>/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(value);

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newState.trim();

    if (!trimmed || trimmed.length > MAX_INPUT_LENGTH) {
      toast.error(`El nombre no puede superar ${MAX_INPUT_LENGTH} caracteres.`);
      return;
    }

    let url = `${portal}/api/v1/catalogs/state/`;

    try {
      const res = await api.post(
        `${API_BASE_URL}/` + url,
        { state_headquearters: trimmed }
      );
      setStates(prev => [...prev, res.data.state]);
      setNewState('');
      toast.success('Estado agregado correctamente.');
    } catch (error) {
      toast.error('Error al agregar el estado.');
    }
  };

  const handleAddBusinessUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newBusinessUnit.trim();

    if (!trimmed || trimmed.length > MAX_INPUT_LENGTH) {
      toast.error(`El nombre no puede superar ${MAX_INPUT_LENGTH} caracteres.`);
      return;
    }

    let url = `${portal}/api/v1/catalogs/business-unit/`;

    try {
      const res = await api.post(
        `${API_BASE_URL}/` + url,
        { business_unit: trimmed }
      );
      setBusinessUnits(prev => [...prev, res.data.business_unit]);
      setNewBusinessUnit('');
      toast.success('Unidad de negocio agregada correctamente.');
    } catch (error) {
      toast.error('Error al agregar la unidad de negocio.');
    }
  };

  // ✅ FIX 5: Eliminación en dos pasos — primero confirma, luego borra
  const removeState = async (id: string) => {
    if (confirmDeleteState !== id) {
      setConfirmDeleteState(id);
      return;
    }

    let url = `${portal}/api/v1/catalogs/state/${id}/`;

    try {
      await api.delete(`${API_BASE_URL}/` + url);
      setStates(prev => prev.filter(s => s.id !== id));
      setConfirmDeleteState(null);
      toast.success('Estado eliminado correctamente.');
    } catch (error) {
      toast.error('Error al eliminar el estado.');
    }
  };

  // ✅ FIX 5: Eliminación en dos pasos
  const removeBusinessUnit = async (id: string) => {
    if (confirmDeleteBU !== id) {
      setConfirmDeleteBU(id);
      return;
    }

    let url = `${portal}/api/v1/catalogs/business-unit/${id}/`;

    try {
      await api.delete(`${API_BASE_URL}/` + url);
      setBusinessUnits(prev => prev.filter(bu => bu.id !== id));
      setConfirmDeleteBU(null);
      toast.success('Unidad de negocio eliminada correctamente.');
    } catch (error) {
      toast.error('Error al eliminar la unidad de negocio.');
    }
  };

  useEffect(() => {
  if (!portal) return;

  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/${portal}/api/v1/catalogs/`, {
        signal: controller.signal,
      });
      setStates(res.data.states || []);
      setBusinessUnits(res.data.business_units || []);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED') return;
      toast.error('Error al obtener los catálogos.');
    }
  };

  fetchData();
  return () => controller.abort();

  }, [portal]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administración de Catálogos</h1>
          <p className="text-slate-500 mt-1">Configure las opciones disponibles para los denunciantes y filtros administrativos.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Sincronización en Tiempo Real</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* PANEL: ESTADOS */}
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Estados y sedes</h3>
              <p className="text-xs text-slate-400 font-medium">Ubicaciones geográficas autorizadas.</p>
            </div>
          </div>

          <div className="p-8 flex-1 space-y-8">
            <form onSubmit={handleAddState} className="relative group">
              <input
                type="text"
                value={newState}
                onChange={(e) => {
                  if (onlyLettersAndSpaces(e.target.value)) setNewState(e.target.value);
                }}
                placeholder="Nombre del estado o sede..."
                // ✅ FIX 4: maxLength en el input
                maxLength={MAX_INPUT_LENGTH}
                className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-400 transition-all"
              />
              {/* ✅ FIX 4: contador de caracteres */}
              {newState.length > 0 && (
                <span className="absolute left-6 -bottom-5 text-[10px] text-slate-400">
                  {newState.length}/{MAX_INPUT_LENGTH}
                </span>
              )}
              <button
                type="submit"
                disabled={!newState.trim()}
                className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                Registros Actuales ({states.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {/* ✅ FIX 1: state tipado como CatalogState */}
                {states.map((state: CatalogState) => (
                  <div
                    key={state.id}
                    className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all"
                  >
                    <span className="text-sm font-semibold text-slate-700">{state.state_headquearters}</span>
                    {/* ✅ FIX 5: botón de confirmación en dos pasos */}
                    <button
                      onClick={() => removeState(state.id)}
                      className={`p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${
                        confirmDeleteState === state.id
                          ? 'bg-rose-500 text-white px-3'
                          : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'
                      }`}
                    >
                      {confirmDeleteState === state.id ? (
                        <>¿Confirmar?</>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL: UNIDADES DE NEGOCIO */}
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm flex flex-col">
          <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-inner">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Unidades de negocio</h3>
              <p className="text-xs text-slate-400 font-medium">Departamentos o centros de costos.</p>
            </div>
          </div>

          <div className="p-8 flex-1 space-y-8">
            <form onSubmit={handleAddBusinessUnit} className="relative group">
              <input
                type="text"
                value={newBusinessUnit}
                onChange={(e) => {
                  if (onlyLettersAndSpaces(e.target.value)) setNewBusinessUnit(e.target.value);
                }}
                placeholder="Nombre de la unidad..."
                // ✅ FIX 4: maxLength en el input
                maxLength={MAX_INPUT_LENGTH}
                className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-400 transition-all"
              />
              {/* ✅ FIX 4: contador de caracteres */}
              {newBusinessUnit.length > 0 && (
                <span className="absolute left-6 -bottom-5 text-[10px] text-slate-400">
                  {newBusinessUnit.length}/{MAX_INPUT_LENGTH}
                </span>
              )}
              <button
                type="submit"
                disabled={!newBusinessUnit.trim()}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 text-white px-4 rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                Registros Actuales ({businessUnits.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {/* ✅ FIX 1: bu tipado como CatalogBusinessUnit */}
                {businessUnits.map((bu: CatalogBusinessUnit) => (
                  <div
                    key={bu.id}
                    className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all"
                  >
                    <span className="text-sm font-semibold text-slate-700">{bu.business_unit}</span>
                    {/* ✅ FIX 5: botón de confirmación en dos pasos */}
                    <button
                      onClick={() => removeBusinessUnit(bu.id)}
                      className={`p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${
                        confirmDeleteBU === bu.id
                          ? 'bg-rose-500 text-white px-3'
                          : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'
                      }`}
                    >
                      {confirmDeleteBU === bu.id ? (
                        <>¿Confirmar?</>
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Info Box */}
      <div className="bg-slate-900 text-white p-8 rounded-[32px] flex items-center gap-6 shadow-xl">
        <div className="p-4 bg-white/10 rounded-2xl text-blue-400">
          <Info size={32} />
        </div>
        <div>
          <h4 className="text-lg font-bold">Impacto en el Frontend</h4>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Los cambios realizados aquí afectan directamente al portal de denuncias público. Asegúrese de que las unidades de negocio coincidan con su estructura organizacional actual para evitar errores en el procesamiento de casos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CatalogManagement;