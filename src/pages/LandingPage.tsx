import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Briefcase, CalendarDays, Files, ListTodo, Scale, Users, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const features = [
  { title: 'Casos', description: 'Centraliza la información de tus expedientes.', icon: Briefcase },
  { title: 'Clientes', description: 'Consulta clientes y sus casos desde un mismo lugar.', icon: Users },
  { title: 'Agenda', description: 'Organiza audiencias, reuniones y vencimientos.', icon: CalendarDays },
  { title: 'Tareas', description: 'Controla pendientes y fechas importantes.', icon: ListTodo },
  { title: 'Documentos', description: 'Mantén los archivos de cada caso organizados.', icon: Files },
  { title: 'Finanzas', description: 'Controla honorarios, cobros y gastos.', icon: Wallet },
];

const highlights = [
  { title: 'Casos', detail: 'Expedientes organizados', icon: Briefcase, position: 'left-[48%] top-[14%]' },
  { title: 'Agenda', detail: 'Próximos eventos', icon: CalendarDays, position: 'left-[49%] bottom-[18%]' },
  { title: 'Tareas', detail: 'Pendientes a la vista', icon: ListTodo, position: 'right-[4%] top-[22%]' },
  { title: 'Documentos', detail: 'Archivos de cada caso', icon: Files, position: 'right-[3%] bottom-[19%]' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { enterDemoMode } = useAuth();
  const startDemo = () => {
    enterDemoMode();
    navigate('/');
  };

  return <div className="min-h-screen bg-white text-slate-900">
    <header className="bg-brand-900 text-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="AbogadosPro, inicio">
          <Scale className="h-9 w-9 text-amber-300" aria-hidden="true" />
          <span className="flex flex-col"><span className="font-serif text-2xl font-bold leading-none tracking-tight">Abogados<span className="font-sans font-semibold text-amber-300">Pro</span></span><span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-300">Gestión Jurídica</span></span>
        </Link>
        <nav aria-label="Navegación pública" className="grid w-full grid-cols-2 gap-1 text-center text-sm sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end sm:gap-4">
          <a href="#funciones" className="rounded-md px-2 py-2.5 font-medium text-slate-200 transition-colors hover:text-white">Funciones</a>
          <button type="button" onClick={startDemo} className="rounded-md px-2 py-2.5 font-medium text-slate-200 transition-colors hover:text-white">Probar demo</button>
          <Link to="/login" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-400 px-4 font-bold text-brand-950 transition-colors hover:bg-amber-300">Iniciar sesión</Link>
          <Link to="/registro" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-400 px-4 font-semibold text-white transition-colors hover:border-white hover:bg-brand-800">Crear cuenta gratis</Link>
        </nav>
      </div>
    </header>

    <main>
      <section className="relative isolate overflow-hidden bg-brand-950">
        <img src="/abogados-equipo.png" alt="Equipo de profesionales jurídicos en su estudio" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0c2138] via-[#0c2138]/90 to-transparent lg:via-[#0c2138]/45" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex min-h-[570px] max-w-[1500px] items-center px-5 py-14 sm:px-8 lg:px-12">
          <div className="max-w-[510px] text-white">
            <span className="mb-5 block h-0.5 w-10 bg-amber-400" aria-hidden="true" />
            <h1 className="font-serif text-4xl font-bold leading-[1.07] tracking-tight sm:text-5xl lg:text-[3.65rem]">Tu estudio jurídico, <span className="text-amber-400">organizado</span> en un solo lugar</h1>
            <p className="mt-5 max-w-[430px] text-base leading-relaxed text-slate-100 sm:text-lg">Gestiona clientes, expedientes, audiencias, tareas, documentos y finanzas desde una sola plataforma.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3"><Link to="/login" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-amber-400 px-7 text-sm font-bold text-brand-950 transition-colors hover:bg-amber-300">Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/registro" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/70 bg-brand-950/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Crear cuenta gratis</Link></div>
            <button type="button" onClick={startDemo} className="mt-4 min-h-10 text-sm font-medium text-slate-200 underline decoration-slate-400 underline-offset-4 transition-colors hover:text-white">Probar demo</button>
            <p className="mt-3 text-xs text-slate-200">Cuenta gratuita con hasta 5 clientes y 3 casos</p>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 hidden xl:block">{highlights.map(({ title, detail, icon: Icon, position }) => <div key={title} className={`absolute flex min-w-[182px] items-center gap-3 rounded-xl border border-white/60 bg-white/90 px-4 py-3 text-brand-900 shadow-sm backdrop-blur-sm ${position}`}><span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-900 text-amber-300"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm">{title}</strong><span className="block text-xs text-slate-600">{detail}</span></span></div>)}</div>
      </section>

      <section id="funciones" className="scroll-mt-6 border-t border-slate-200 bg-slate-50 py-11 sm:py-14">
        <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
          <div className="text-center"><span className="mx-auto mb-4 block h-0.5 w-8 bg-amber-400" aria-hidden="true" /><h2 className="font-serif text-3xl font-bold text-brand-900">Todo tu estudio en un solo lugar</h2><p className="mt-2 text-sm text-slate-600">Herramientas claras para gestionar tu práctica jurídica.</p></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{features.map(({ title, description, icon: Icon }) => <div key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-amber-300"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-brand-900">{title}</h3><p className="mt-1 text-xs leading-snug text-slate-600">{description}</p></div></div>)}</div>
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8"><div className="mx-auto max-w-3xl border-t border-slate-200 pt-8 text-center"><h2 className="font-serif text-2xl font-bold text-brand-900 sm:text-3xl">Empieza a organizar tu estudio con AbogadosPro</h2><div className="mt-6 flex flex-wrap items-center justify-center gap-3"><Link to="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-900 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-800">Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/registro" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50">Crear cuenta gratis</Link><button type="button" onClick={startDemo} className="min-h-11 px-3 text-sm font-medium text-brand-900 underline underline-offset-4 hover:text-brand-700">Probar demo</button></div><p className="mt-3 text-xs text-slate-500">Cuenta gratuita con hasta 5 clientes y 3 casos</p></div></section>
    </main>
  </div>;
}
