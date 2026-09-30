import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useLegalData } from '../../context/LegalDataContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resetDemoData } = useLegalData();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (window.confirm('¿Deseas restablecer los datos del demo al estado original?')) {
      setResetting(true);
      await resetDemoData();
      setResetting(false);
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
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

            <span className="hidden md:inline-flex items-center ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-800/80 text-brand-200 border border-brand-700">
              Demo Bolivia
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
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
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-3">
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
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-brand-800 focus:outline-hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-brand-800 bg-brand-900 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((item) => {
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
          <div className="pt-3 border-t border-brand-800 flex items-center justify-between">
            <span className="text-xs text-slate-300">AbogadosPro Demo • Bolivia</span>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleReset();
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar Demo</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
