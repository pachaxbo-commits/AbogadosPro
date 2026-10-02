import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LegalDataProvider } from './context/LegalDataContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { AgendaPage } from './pages/AgendaPage';
import { FinancesPage } from './pages/FinancesPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminPage } from './pages/AdminPage';
import { BRAND_CONFIG } from './config/brand';

export function App() {
  return (
    <AuthProvider>
      <LegalDataProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900">
            <Navbar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <Routes>
                {/* Rutas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/registro" element={<RegisterPage />} />

                {/* Rutas Protegidas (Acceso autenticado o Modo Demo) */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clientes"
                  element={
                    <ProtectedRoute>
                      <ClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clientes/:id"
                  element={
                    <ProtectedRoute>
                      <ClientDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/casos"
                  element={
                    <ProtectedRoute>
                      <CasesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/casos/:id"
                  element={
                    <ProtectedRoute>
                      <CaseDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agenda"
                  element={
                    <ProtectedRoute>
                      <AgendaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finanzas"
                  element={
                    <ProtectedRoute>
                      <FinancesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Ruta Exclusiva de Administración */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                {/* Redirección por defecto */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">AbogadosPro</span>
                  <span>— {BRAND_CONFIG.tagline} ({BRAND_CONFIG.jurisdiction})</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>Firebase Auth & Firestore</span>
                  <span>•</span>
                  <a
                    href={BRAND_CONFIG.developer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-slate-600 underline font-medium"
                  >
                    Desarrollo por {BRAND_CONFIG.developer.name}
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </LegalDataProvider>
    </AuthProvider>
  );
}

export default App;
