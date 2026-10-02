import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Wallet,
  Menu,
  X,
  RotateCcw,
  LogOut,
  Shield,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resetDemoData } = useLegalData();
  const { currentUser, userProfile, isDemo, logout, exitDemoMode } = useAuth();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (window.confirm('¿Deseas restablecer los datos del demo al estado original?')) {
      setResetting(true);
      await resetDemoData();
      setResetting(false);
    }
  };

  const handleExitDemo = () => {
    exitDemoMode();
    navigate('/login');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Inicio', icon: LayoutDashboard },
    { to: '/clientes', label: 'Clientes', icon: Users },
    { to: '/casos', label: 'Casos', icon: Briefcase },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  ];

  return (
    <header className="bg-brand-900 border-b border-brand-950 text-white sticky top-0 z-40 shadow-sm">
      {/* Banner discreto si está activo el Modo Demostración */}
      {isDemo && (
        <div className="bg-amber-400 text-brand-950 px-4 py-1 text-xs font-medium flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                <strong>Modo Demostración Activo:</strong> Datos ficticios en memoria local. Ninguna acción afecta la base de datos real.
              </span>
            </div>
            <button
              type="button"
              onClick={handleExitDemo}
              className="text-[11px] font-bold underline hover:text-brand-800 transition-colors"
            >
              Salir de la demo
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-brand-800 border border-brand-700/60 flex items-center justify-center text-slate-100 group-hover:bg-brand-700 transition-colors">
                <Scale className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-tight text-white leading-none">
                  Abogados<span className="text-amber-300 font-sans font-semibold">Pro</span>
                </span>
                <span className="text-[10px] text-slate-300 tracking-wider uppercase font-medium mt-0.5">
                  Gestión Jurídica
                </span>
              </div>
            </Link>

            {isDemo ? (
              <span className="hidden md:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/40">
                Demo Bolivia
              </span>
            ) : userProfile?.role === 'admin' ? (
              <span className="hidden md:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                Admin
              </span>
            ) : userProfile?.accountType === 'trial' ? (
              <span className="hidden md:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                Cortesía (Trial)
              </span>
            ) : currentUser ? (
              <span className="hidden md:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-800 text-slate-300 border border-brand-700">
                Plan Gratuito
              </span>
            ) : null}
          </div>

          {/* Enlaces de Navegación de Escritorio */}
          {(currentUser || isDemo) && (
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-800 text-white shadow-xs'
                          : 'text-slate-200 hover:text-white hover:bg-brand-800/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 opacity-80" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              {userProfile?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-400 text-brand-950 shadow-xs'
                        : 'text-amber-300 hover:text-amber-200 hover:bg-brand-800/50'
                    }`
                  }
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </NavLink>
              )}
            </nav>
          )}

          {/* Acciones de la Derecha (Escritorio) */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Si está en Modo Demo, permitir Reiniciar Demo y Salir */}
            {isDemo && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                  title="Restablecer datos demo originales"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-brand-800/70 border border-brand-700/50 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
                  <span>{resetting ? 'Restableciendo...' : 'Reiniciar Demo'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExitDemo}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-amber-200 hover:text-white hover:bg-brand-800/70 border border-amber-400/40 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir de Demo</span>
                </button>
              </>
            )}

            {/* Si está autenticado en producción */}
            {currentUser && (
              <div className="flex items-center gap-3 pl-2 border-l border-brand-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">
                    {userProfile?.displayName || currentUser.email}
                  </span>
                  {userProfile?.studioName && (
                    <span className="text-[10px] text-slate-300 leading-tight">
                      {userProfile.studioName}
                    </span>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-brand-800 border border-brand-700 flex items-center justify-center text-amber-300 text-xs font-bold uppercase">
                  {userProfile?.displayName?.slice(0, 2) || <UserIcon className="w-4 h-4" />}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-brand-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {!currentUser && !isDemo && (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-brand-950 transition-colors"
              >
                Acceder
              </Link>
            )}
          </div>

          {/* Botón de Menú Móvil */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="lg:hidden border-t border-brand-800 bg-brand-900 px-4 pt-2 pb-4 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto">
          {(currentUser || isDemo) &&
            navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-brand-800 text-white'
                        : 'text-slate-200 hover:bg-brand-800/50 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

          {userProfile?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium ${
                  isActive
                    ? 'bg-amber-400 text-brand-950 font-bold'
                    : 'text-amber-300 hover:bg-brand-800/50'
                }`
              }
            >
              <Shield className="w-5 h-5" />
              <span>Panel de Administración</span>
            </NavLink>
          )}

          <div className="pt-3 border-t border-brand-800 space-y-2">
            {isDemo && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleReset();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleExitDemo();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir de la demo</span>
                </button>
              </div>
            )}

            {currentUser && (
              <div className="pt-2 flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-semibold text-white">{userProfile?.displayName}</div>
                  <div className="text-slate-400 text-[10px]">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-brand-800 text-xs text-rose-300 hover:text-white hover:bg-rose-900"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}

            {!currentUser && !isDemo && (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2 rounded-lg bg-amber-400 text-brand-950 font-semibold text-sm"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
