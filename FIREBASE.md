# Preparación de Firebase

La aplicación continúa utilizando `LocalStorageLegalRepository`. Los datos locales
no se envían a Firebase al completar las variables de entorno.

## Configuración web

1. Crear o seleccionar un proyecto en Firebase y registrar una aplicación web.
2. Copiar `.env.example` a `.env.local` y completar los valores de la configuración
   web proporcionada por Firebase. No colocar credenciales de una cuenta de servicio.
3. Reiniciar el servidor de desarrollo después de modificar las variables.

`getFirebaseServices()` en `src/services/firebaseConfig.ts` inicializa una sola
instancia con Firebase Authentication y Cloud Firestore, únicamente cuando se llama.
Rechaza configuraciones incompletas. `isFirebaseConfigured()` permite comprobar
la configuración sin abrir una conexión.

## Pendiente antes de activar la persistencia remota

- Confirmar si se administrará un estudio o varios estudios aislados.
- Definir el acceso de los abogados y los miembros autorizados del estudio.
- Implementar el adaptador de Firestore de `ILegalRepository`, conservando sus
  validaciones financieras y protegiendo las escrituras concurrentes.
- Configurar Authentication y reglas de Firestore acordes al acceso elegido;
  validar esas reglas y el adaptador con el emulador antes de activar datos reales.
- Decidir por separado si se deben importar datos existentes del navegador.

No activar reglas públicas de lectura o escritura para conectar esta aplicación.
No se ha desplegado configuración ni se ha creado o modificado un proyecto remoto.

Documentación oficial:
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore/security/overview
- https://firebase.google.com/docs/firestore/manage-data/transactions
