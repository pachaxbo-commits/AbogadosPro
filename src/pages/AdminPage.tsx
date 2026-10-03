import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Gift,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  User as UserIcon,
  Building,
} from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

export const AdminPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating trial account
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formStudioName, setFormStudioName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      if (!db) {
  return;
}
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as UserProfile);
      setUsers(list);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!currentUser) {
      setActionError('Sesión no disponible.');
      return;
    }

    try {
      setCreating(true);
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: formDisplayName,
          studioName: formStudioName,
          email: formEmail,
          password: formPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear cuenta de cortesía.');
      }

      setActionSuccess(`Cuenta de cortesía creada exitosamente para ${formEmail}`);
      setFormDisplayName('');
      setFormStudioName('');
      setFormEmail('');
      setFormPassword('');
      setShowCreateModal(false);
      await fetchUsers();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error al crear la cuenta.');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.studioName?.toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const freeUsers = users.filter((u) => u.accountType === 'free').length;
  const trialUsers = users.filter((u) => u.accountType === 'trial').length;
  const adminUsers = users.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-brand-900 rounded-xl p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-brand-800 border border-brand-700 flex items-center justify-center text-amber-300">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-white leading-tight">
                Panel de Administración
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-amber-400 text-brand-950">
                Superadmin
              </span>
            </div>
            <p className="text-xs text-brand-200 mt-0.5">
              Gestión de cuentas, planes y emisión de accesos de cortesía (Trial)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-800 hover:bg-brand-700 text-xs font-medium text-slate-200 hover:text-white border border-brand-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setActionSuccess(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-brand-950 text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Cuenta de Cortesía (Trial)</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tarjetas Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Cuentas
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-serif font-bold text-slate-900 mt-2">{totalUsers}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Plan Gratuito
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          </div>
          <p className="text-2xl font-serif font-bold text-slate-800 mt-2">{freeUsers}</p>
          <p className="text-[10px] text-slate-400 mt-1">Límite 5 clientes / 3 casos</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Cortesía (Trial)
            </span>
            <Gift className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-serif font-bold text-amber-900 mt-2">{trialUsers}</p>
          <p className="text-[10px] text-amber-600/80 mt-1">Exentos de facturación</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">
              Administradores
            </span>
            <Shield className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-brand-900 mt-2">{adminUsers}</p>
          <p className="text-[10px] text-brand-600/80 mt-1">Acceso total al sistema</p>
        </div>
      </div>

      {/* Barra de Filtro */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por abogado, estudio o correo..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
          />
        </div>
        <div className="text-xs text-slate-500">
          Mostrando <span className="font-semibold text-slate-800">{filteredUsers.length}</span> cuentas
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Abogado / Estudio</th>
                <th className="px-4 py-3">Correo Electrónico</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Tipo de Cuenta</th>
                <th className="px-4 py-3">Facturación</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Cargando cuentas registradas...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.uid === userProfile?.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {u.displayName || 'Sin nombre'}
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-200 text-slate-700 font-bold">
                              Tú
                            </span>
                          )}
                        </div>
                        {u.studioName && (
                          <div className="text-[11px] text-slate-500">{u.studioName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-100 text-brand-900 border border-brand-200">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.accountType === 'trial' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200">
                            <Gift className="w-3 h-3 text-amber-600" />
                            Trial (Cortesía)
                          </span>
                        ) : u.accountType === 'admin' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800">
                            Gratuito (Free)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.billingExempt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Exento de cobro
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Estándar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                        {u.workspaceId?.slice(0, 10)}...
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {u.createdAt ? u.createdAt.split('T')[0] : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación de Cuenta Trial / Cortesía */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-brand-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-serif font-bold text-white">
                  Crear Cuenta de Cortesía (Trial)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                Esta cuenta se generará como <strong>Trial de Cortesía</strong>, con exención de cobros y facturación (<code className="font-mono text-[10px] bg-amber-100 px-1 py-0.5 rounded">billingExempt: true</code>). En su primer inicio de sesión se le exigirá de forma obligatoria cambiar la contraseña provisional que defina a continuación.
              </div>

              {actionError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTrial} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre del Abogado / Titular <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      placeholder="Ej. Dra. Carmen Velasco"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Despacho Jurídico <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formStudioName}
                      onChange={(e) => setFormStudioName(e.target.value)}
                      placeholder="Ej. Estudio Jurídico Velasco & Asociados"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="abogado@despacho.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Contraseña Provisional <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-900 hover:bg-brand-950 text-white transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creando cuenta...' : 'Emitir Cuenta de Cortesía'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
