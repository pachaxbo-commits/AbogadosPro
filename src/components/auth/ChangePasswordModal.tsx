import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ChangePasswordModal: React.FC = () => {
  const { userProfile, changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!userProfile?.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await changePassword(newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4">
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-brand-900 px-4 py-5 text-white flex items-center gap-3 sm:px-6">
          <div className="w-10 h-10 rounded-lg bg-brand-800 border border-brand-700 flex items-center justify-center text-amber-300">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white leading-tight">Cambio de Contraseña Obligatorio</h2>
            <p className="text-xs text-brand-200 mt-0.5">Establezca su contraseña personal de acceso</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Su cuenta fue creada por un administrador con una clave provisional. Por seguridad jurídica y confidencialidad de sus expedientes, debe definir una contraseña personal antes de continuar.
            </span>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <p className="font-semibold text-slate-800 text-sm">Contraseña actualizada con éxito</p>
              <p className="text-xs text-slate-500">Accediendo a su panel de gestión...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-brand-900 hover:bg-brand-950 text-white font-medium text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Guardando contraseña...' : 'Actualizar contraseña y acceder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
