import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LegalDataProvider } from './context/LegalDataContext';
import { Navbar } from './components/common/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { AgendaPage } from './pages/AgendaPage';
import { FinancesPage } from './pages/FinancesPage';

export function App() {
  return (
    <LegalDataProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
          <Navbar />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clientes" element={<ClientsPage />} />
              <Route path="/clientes/:id" element={<ClientDetailPage />} />
              <Route path="/casos" element={<CasesPage />} />
              <Route path="/casos/:id" element={<CaseDetailPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/finanzas" element={<FinancesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">AbogadosPro</span>
                <span>— Base funcional y visual de gestión jurídica</span>
              </div>
              <div className="text-slate-400">
                Preparado para Backend en Firebase • Listo para Vercel y GitHub
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </LegalDataProvider>
  );
}

export default App;
