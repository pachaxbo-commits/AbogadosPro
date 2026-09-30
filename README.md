# AbogadosPro

Sistema demo de gestión jurídica y control de expedientes diseñado para abogados y despachos en Bolivia (con soporte conceptual para NUREJ, CUD y valores en Bolivianos `Bs`).

Esta versión proporciona la **base funcional y visual completa** (frontend), desacoplada y lista para conectar posteriormente un backend real (Firebase / REST API) sin reconstruir componentes ni vistas.

---

## 🛠️ Stack Utilizado

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Estilos**: Tailwind CSS
- **Iconografía**: Lucide React
- **Enrutamiento**: React Router v7 (`react-router-dom`)
- **Persistencia Demo**: Abstracción en repositorio local respaldado por `localStorage`

---

## 📋 Requisitos Previos

- **Node.js**: v18 o superior (probado en Node v24)
- **NPM**: v9 o superior

---

## 🚀 Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/pachaxbo-commits/AbogadosPro.git

# 2. Ingresar a la carpeta del proyecto
cd AbogadosPro

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en: **`http://localhost:5173/`**

---

## 📁 Estructura Principal del Proyecto

```text
src/
├── types/                 # Modelos de dominio puros (Cliente, Caso, Actividad, Evento, Pago, Gasto)
├── data/                  # Datos demo iniciales con fechas relativas dinámicas
├── repositories/          # Capa de Abstracción de Datos
│   ├── types.ts           # Interfaz ILegalRepository (contrato desacoplado)
│   ├── localStorageRepo.ts# Implementación con persistencia y recuperación segura
│   └── index.ts           # Inyección de dependencia singleton del repositorio
├── services/
│   ├── formatters.ts      # Utilidades de moneda (Bs), fechas y cálculo de alertas
│   └── firebaseConfig.ts  # Guía y variables preparadas para conectar Firebase
├── context/
│   └── LegalDataContext.tsx # Estado global reactivo y consultas calculadas
├── components/            # Componentes UI (Navbar, StatusBadge, StatCard, Modales, etc.)
└── pages/                 # Páginas de la aplicación (Dashboard, Clientes, Casos, Agenda, Finanzas)
```

---

## 🔌 Capa ILegalRepository (Preparación para Backend)

El frontend está completamente desacoplado de la fuente de datos mediante la interfaz `ILegalRepository` en `src/repositories/types.ts`:
- Actualmente, la app utiliza `LocalStorageLegalRepository`.
- **Para conectar Firebase o cualquier backend real en el futuro**, únicamente se debe crear un `FirebaseLegalRepository` que implemente dicha interfaz y sustituir la exportación en `src/repositories/index.ts`. Ningún componente o página requiere modificaciones.

> [!NOTE]
> **Estado del Backend**: Actualmente **NO** existe backend real ni base de datos remota conectada. Tampoco existe autenticación ni control de roles en esta fase.

---

## 💾 Datos Demo y LocalStorage

- **Datos iniciales**: Incluye 5 clientes y 8 casos con NUREJ y CUD ficticios (identificadores demo), eventos procesales, actuaciones y estados financieros coherentes.
- **Fechas dinámicas**: Las fechas demo iniciales se calculan en relación a la fecha actual (`hoy`, `mañana`, `en 3 días`), garantizando que las alertas visuales del Dashboard siempre se mantengan vigentes al iniciar o reiniciar.
- **Tolerancia a fallos**: Si los datos en `localStorage` se corrompen o quedan incompletos, el sistema se recupera automáticamente cargando los datos demo sin bloquear la pantalla.
- **Cómo reiniciar los datos demo**: Puedes hacer clic en el botón **"Reiniciar Demo"** ubicado en el Navbar para restablecer la base de datos al estado original en cualquier momento.

---

## 🗺️ Rutas Principales

| Ruta | Descripción |
| :--- | :--- |
| `/` | **Inicio / Dashboard**: Métricas, alertas visuales, próximos eventos y movimientos. |
| `/clientes` | **Clientes**: Cartera con buscador en tiempo real y saldos pendientes. |
| `/clientes/:id` | **Ficha de Cliente**: Contacto, notas y expedientes asociados. |
| `/casos` | **Casos**: Directorio general con filtros por área (*Civil, Penal, Familiar, Laboral*) y estado. |
| `/casos/:id` | **Detalle de Caso**: Expediente completo con pestañas: `?tab=resumen`, `?tab=actividad`, `?tab=agenda`, `?tab=finanzas`. |
| `/agenda` | **Agenda General**: Cronograma consolidado con filtros (*Hoy*, *Próximos*, *Audiencias*, *Plazos*, etc.). |
| `/finanzas` | **Finanzas Generales**: Total acordado, cobrado, saldo pendiente, gastos y tabla de deudores. |

---

## ☁️ Despliegue en Vercel

El proyecto incluye [`vercel.json`](vercel.json) con reescrituras para enrutamiento SPA. Puedes importar el repositorio directamente en Vercel con un solo clic.
