# AbogadosPro

Sistema integral de gestión jurídica, expedientes judiciales y control financiero diseñado para abogados y despachos legales en Bolivia (con soporte para identificadores NUREJ, CUD y valores en Bolivianos `Bs`).

Alojado en **Vercel** y conectado de forma nativa a **Firebase Authentication** y **Cloud Firestore** con estricto aislamiento de datos por *Workspace*.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + TypeScript
- **Bundler**: Vite
- **Estilos**: Tailwind CSS (Identidad sobria, navy `#0f2744` y acentos ámbar)
- **Iconografía**: Lucide React
- **Enrutamiento**: React Router v7 (`react-router-dom`)
- **Backend & Autenticación**:
  - Firebase Authentication (Email y Contraseña, verificación y recuperación)
  - Cloud Firestore (Persistencia en tiempo real estructurada por workspaces)
  - Firebase Admin SDK (Vercel Serverless Functions para emisión segura de cuentas por administradores)
- **Hosting**: Vercel (Producción y Preview)

---

## 🏛️ Arquitectura de Datos y Aislamiento por Workspace

Para garantizar confidencialidad jurídica absoluta entre diferentes despachos y abogados, el sistema implementa una arquitectura modular desacoplada:

```text
users/{userId}                         -> Perfil de usuario (rol, plan, workspaceId, billingExempt)
workspaces/{workspaceId}               -> Documento de metadatos del despacho
  ├── clientes/{clienteId}             -> Cartera de clientes del workspace
  ├── casos/{casoId}                   -> Expedientes del workspace
  ├── actividades/{actividadId}        -> Actuaciones procesales y memoriales
  ├── eventos/{eventoId}               -> Audiencias y plazos en agenda
  ├── pagos/{pagoId}                   -> Cobro de honorarios profesionales
  ├── gastos/{gastoId}                 -> Gastos y costas judiciales
  └── reembolsos/{reembolsoId}         -> Liquidación de gastos devueltos por clientes
```

### Reglas de Seguridad (`firestore.rules`)
- Ningún usuario puede consultar ni alterar datos pertenecientes a un `workspaceId` diferente al suyo.
- Los usuarios con rol `user` no pueden auto-ascender a `admin` ni modificar campos de facturación (`billingExempt`, `plan`, `accountType`).
- Los administradores (`role: 'admin'`) poseen supervisión de la colección de usuarios y pueden emitir cuentas especiales.

---

## 👥 Modalidades de Acceso y Planes

1. **Modo Demostración Interactivo (Demo)**:
   - Acceso sin registro desde la pantalla de login.
   - Operación 100% aislada en `localStorage` mediante `DemoLegalRepository`.
   - **Cero lecturas y cero escrituras en Cloud Firestore**.
   - Incluye botón visible para restablecer los datos demo iniciales en cualquier momento.

2. **Cuenta Gratuita (Free)**:
   - Registro público y abierto desde `/registro`.
   - Permite hasta **5 clientes** y **3 casos activos** para siempre sin costo.
   - Enlace directo a contacto con PACHAX para escalamiento o desarrollo a medida.

3. **Cuenta de Cortesía (Trial)**:
   - Creada exclusivamente por un administrador desde `/admin`.
   - Exenta de facturación (`billingExempt: true`).
   - Sin restricciones del plan gratuito.
   - **Cambio obligatorio de contraseña** (`mustChangePassword: true`) requerido en el primer inicio de sesión mediante un modal de seguridad.

4. **Administrador (Superadmin)**:
   - Acceso exclusivo al panel `/admin`.
   - Métricas globales de usuarios (Free, Trial, Admin).
   - Generación de cuentas de cortesía vía endpoint serverless seguro `/api/admin/users`.

---

## 🔑 Variables de Entorno

Crear un archivo `.env.local` en la raíz del proyecto para desarrollo local:

```env
# Frontend (Firebase Web SDK)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=abogadospro-fa495.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=abogadospro-fa495
VITE_FIREBASE_STORAGE_BUCKET=abogadospro-fa495.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=844186423462
VITE_FIREBASE_APP_ID=1:844186423462:web:e4dc53f053a8e41450e467

# Backend Serverless (Vercel Functions - Firebase Admin SDK)
FIREBASE_PROJECT_ID=abogadospro-fa495
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@abogadospro-fa495.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> [!NOTE]
> Las variables de entorno de cliente (`VITE_FIREBASE_*`) ya han sido configuradas en el proyecto Vercel para los entornos de **Producción** y **Preview**.

---

## 👨‍💻 Creación del Primer Usuario Administrador

Dado que el registro público genera automáticamente cuentas con rol `user` y plan `free`, el primer administrador debe promoverse manualmente en la consola de Firebase:

1. Ingrese a la [Consola de Firebase](https://console.firebase.google.com/) -> Proyecto **abogadospro-fa495**.
2. Vaya a **Authentication** -> Cree el usuario o localice su UID.
3. Vaya a **Firestore Database** -> Colección `users` -> Documento `{su_uid}`.
4. Actualice los siguientes campos:
   - `role`: `"admin"`
   - `accountType`: `"admin"`
   - `billingExempt`: `true`
5. Inicie sesión en la aplicación; el enlace **Admin** aparecerá automáticamente en la barra superior.

---

## 🚀 Despliegue de Reglas e Índices de Firestore

Para desplegar las reglas de seguridad e índices mediante Firebase CLI con su cuenta autorizada:

```bash
# Iniciar sesión con la cuenta propietaria del proyecto Firebase
firebase login

# Desplegar reglas de Firestore e índices
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 💼 Desarrollo a Medida y Personalizaciones

**AbogadosPro** cuenta con el respaldo y desarrollo de **PACHAX**. Si su bufete, firma legal o institución requiere módulos especializados, flujos procesales específicos o integraciones locales a medida:
- Sitio web: [https://pachax.net](https://pachax.net)
- Contacto directo disponible en la pantalla de acceso del sistema.
