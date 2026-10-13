# Usuarios internos (implementación local, sin publicar)

La cuenta de Firebase Auth existente continúa siendo la cuenta principal del estudio y conserva su UID y workspace. Cada perfil interno usa otra cuenta de Firebase Auth en el mismo proyecto. Su contraseña se almacena y verifica exclusivamente en Firebase Auth; la aplicación no guarda contraseñas ni hashes en Firestore o localStorage. El cliente usa una segunda instancia de Firebase Auth con persistencia en memoria para el perfil interno.

`/api/internal` exige el ID token de la cuenta principal, confirma que esta sea titular del workspace y, para operaciones posteriores a la creación del Jefe, exige además el ID token interno. Los claims internos contienen `workspaceId`, `internalUserId`, `officeRole`, `isOfficeAdmin` y `sessionVersion`. El documento `workspaces/{workspaceId}/internalUsers/{internalUserId}` mantiene rol, estado y versión vigentes. Revocar o desactivar invalida sesiones mediante Firebase Auth y la versión de sesión en las reglas.

La activación requiere, en este orden:
1. Probar y publicar las reglas e índices revisados de Firestore en un entorno de prueba. No se han publicado desde esta tarea.
2. Configurar Firebase Admin SDK para la función serverless y `INTERNAL_AUTH_RULES_READY=true` solo después de verificar las reglas. Sin esa variable, el endpoint rechaza la creación inicial del Jefe.
3. Activar `VITE_INTERNAL_AUTH_ENABLED=true` en una compilación de prueba. El valor predeterminado es `false`.
4. Iniciar sesión con una cuenta de estudio de prueba y crear el perfil del Jefe. La cuenta y el workspace existentes no se reemplazan.

No se activó ningún workspace real. Los registros anteriores a esta estructura no reciben automáticamente `ownerUserId` ni separación de honorarios. Deben clasificarse y migrarse antes de habilitar perfiles de abogado/asistente en un estudio con datos existentes. Los documentos y algunas configuraciones actuales siguen en almacenamiento local del navegador; antes de prometer aislamiento de esos datos entre perfiles se requiere trasladarlos a un almacenamiento protegido por usuario o restringirlos. No usar la cuenta real de Juan Carlos para esta migración o pruebas sin un procedimiento aprobado.
