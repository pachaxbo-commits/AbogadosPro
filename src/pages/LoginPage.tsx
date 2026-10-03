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
    <div className="min-h-screen bg-white text-slate-900">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="AbogadosPro, inicio">
            <Scale className="h-9 w-9 text-amber-300" aria-hidden="true" />
            <span className="flex flex-col"><span className="font-serif text-2xl font-bold leading-none tracking-tight">Abogados<span className="font-sans font-semibold text-amber-300">Pro</span></span><span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-300">Gestión Jurídica</span></span>
          </Link>
          <nav aria-label="Acceso público" className="flex flex-wrap items-center gap-3 text-sm">
            <Link to="/" className="rounded-md px-2 py-2 font-medium text-slate-200 hover:text-white">Volver al inicio</Link>
            <Link to="/registro" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/60 px-4 font-semibold text-white hover:bg-brand-800">Crear cuenta gratis</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden bg-brand-950">
          <img src="/abogados-equipo.png" alt="Equipo de profesionales jurídicos en su estudio" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c2138] via-[#0c2138]/90 to-[#0c2138]/20 lg:via-[#0c2138]/55 lg:to-transparent" aria-hidden="true" />
          <div className="mx-auto grid min-h-[640px] max-w-[1500px] items-center gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,460px)_1fr] lg:px-12">
            <div className="flex min-w-0 flex-col gap-7">
              <div className="order-2 max-w-[460px] text-white lg:order-1">
                <span className="mb-4 block h-0.5 w-9 bg-amber-400" aria-hidden="true" />
                <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Tu estudio jurídico, <span className="text-amber-400">organizado</span> en un solo lugar</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-100">Gestiona clientes, expedientes, audiencias, tareas, documentos y finanzas desde una sola plataforma.</p>
              </div>

              <div className="order-1 rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6 lg:order-2">
                <h2 className="font-serif text-2xl font-bold text-brand-900">Iniciar sesión</h2>
                <p className="mt-1 text-sm text-slate-500">Accede a tu cuenta de AbogadosPro</p>

                {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{error}</span></div>}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold text-slate-700">Correo electrónico</label>
                    <div className="relative"><Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" /><input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" /></div>
                  </div>
                  <div>
                    <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-slate-700">Contraseña</label>
                    <div className="relative"><Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" /><input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" /></div>
                  </div>
                  <div className="text-right"><button type="button" onClick={() => { setResetEmail(email); setResetSuccess(false); setResetError(null); setShowForgotModal(true); }} className="min-h-10 text-xs font-medium text-brand-800 hover:underline">¿Olvidaste tu contraseña?</button></div>
                  <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-brand-950 transition-colors hover:bg-amber-300 disabled:opacity-50">{loading ? 'Verificando credenciales...' : 'Iniciar sesión'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                </form>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs"><span className="text-slate-600">¿Aún no tienes una cuenta?</span><Link to="/registro" className="font-semibold text-brand-900 hover:underline">Crear cuenta gratis</Link></div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="text-slate-600">Modo demostración interactivo</span><button type="button" onClick={handleStartDemo} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand-900 hover:underline"><Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />Probar Demo</button></div>
                <p className="mt-3 text-center text-xs text-slate-500">Cuenta gratuita con hasta 5 clientes y 3 casos</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white px-5 py-6 text-xs text-slate-600 sm:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2"><span>Cloud Firestore con aislamiento por Workspace</span><span>Autenticación cifrada mediante Firebase Auth</span></div>
            <div className="max-w-lg"><span className="font-semibold text-brand-900">Desarrollo de Software · PACHAX</span><p className="mt-1">{BRAND_CONFIG.developer.customDevDescription}</p><a href={BRAND_CONFIG.developer.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-brand-900 hover:underline">{BRAND_CONFIG.developer.ctaText}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></div>
          </div>
        </section>
      </main>

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
