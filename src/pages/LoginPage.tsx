import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  Lock,
  Mail,
  ArrowRight,
  ExternalLink,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND_CONFIG } from '../config/brand';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, enterDemoMode, sendResetPassword, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) return;

    try {
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch {
      // El error ya es gestionado y traducido en AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleStartDemo = () => {
    clearError();
    enterDemoMode();
    navigate('/');
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail) return;

    try {
      setResetLoading(true);
      await sendResetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Error al enviar correo de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-6 px-0 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Columna Izquierda: Información de Marca e Identidad Editorial */}
        <div className="order-2 rounded-2xl bg-brand-900 p-5 text-white shadow-xl relative flex flex-col justify-between overflow-hidden sm:p-8 lg:order-1 lg:col-span-5">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-800/40 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-800 border border-brand-700/80 flex items-center justify-center text-amber-300 shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold tracking-tight text-white leading-tight whitespace-nowrap sm:text-2xl">
                  Abogados<span className="text-amber-300 font-sans font-semibold">Pro</span>
                </h1>
                <p className="text-[11px] uppercase tracking-wider text-brand-200 font-medium">
                  {BRAND_CONFIG.tagline} • {BRAND_CONFIG.jurisdiction}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-brand-800/80">
              <h2 className="font-serif text-lg font-semibold text-slate-100 leading-snug">
                Plataforma de Control Jurídico, Causas y Finanzas
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Centralice expedientes judiciales (NUREJ / CUD), agenda de audiencias procesales, registro de actuaciones y liquidación de honorarios y gastos con estricto aislamiento de datos.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Cloud Firestore con aislamiento por Workspace</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Autenticación cifrada mediante Firebase Auth</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Cuenta gratuita con hasta 5 clientes y 3 casos</span>
              </div>
            </div>
          </div>

          {/* Bloque PACHAX - Desarrollo a Medida */}
          <div className="relative z-10 pt-6 mt-8 border-t border-brand-800/80 text-xs">
            <p className="text-[11px] uppercase tracking-wider text-amber-300/90 font-semibold mb-1">
              Desarrollo de Software
            </p>
            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              {BRAND_CONFIG.developer.customDevDescription}
            </p>
            <a
              href={BRAND_CONFIG.developer.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition-colors"
            >
              <span>{BRAND_CONFIG.developer.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Acceso y Acciones */}
        <div className="order-1 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8 lg:order-2 lg:col-span-7">
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-serif font-bold text-slate-900">
                Acceso al Sistema
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingrese sus credenciales registradas para gestionar su despacho
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* VÍA 1: Formulario Principal de Autenticación */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="abogado@estudio.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSuccess(false);
                      setResetError(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-brand-800 hover:text-brand-950 font-medium hover:underline"
                  >
                    ¿Olvidó su contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-brand-900 hover:bg-brand-950 text-white font-medium text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Verificando credenciales...' : 'Iniciar Sesión'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* VÍA 2: Registro Público Gratuito */}
            <div className="flex flex-col items-start gap-2 border-t border-slate-100 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-600">¿Aún no tiene cuenta en AbogadosPro?</span>
              <Link
                to="/registro"
                className="font-semibold text-brand-900 hover:text-brand-700 hover:underline"
              >
                Crear cuenta gratuita
              </Link>
            </div>
          </div>

          {/* VÍA 3: Demo Interactivo Sin Registro */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                    Modo Demostración Interactivo
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Explore la aplicación con causas y clientes ficticios de Bolivia sin registrarse.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartDemo}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs whitespace-nowrap"
              >
                Probar Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-2 sm:p-4">
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-brand-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-serif font-bold text-white">Recuperar Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-300 hover:text-white text-xs font-medium"
              >
                Cerrar
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingrese el correo electrónico asociado a su cuenta. Le enviaremos un enlace oficial de Firebase para restablecer su clave de acceso.
              </p>

              {resetError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs">
                  {resetError}
                </div>
              )}

              {resetSuccess ? (
                <div className="text-center py-4 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-slate-800 text-sm">Correo de recuperación enviado</p>
                  <p className="text-xs text-slate-500">
                    Por favor revise su bandeja de entrada (y la carpeta de spam si es necesario).
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Correo Electrónico Registrado
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="abogado@estudio.com"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-700 focus:border-brand-700 outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-3 py-2 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-900 hover:bg-brand-950 text-white transition-colors disabled:opacity-50"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
