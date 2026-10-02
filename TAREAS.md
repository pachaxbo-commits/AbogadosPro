# Tareas

Las tareas son independientes de los eventos de Agenda. No generan eventos,
notificaciones ni plazos jurídicos automáticos.

## Modelo y persistencia

`Tarea` (`src/types/index.ts`) contiene `id`, `casoId`, `titulo`,
`descripcion?`, `fechaLimite`, `horaLimite?`, `prioridad`, `estado`,
`createdAt`, `updatedAt` y `completedAt?`. El cliente se obtiene del caso;
no se duplica su identificador ni sus datos en la tarea.

La UI utiliza `LegalDataContext` y el contrato asíncrono `ILegalRepository`.
El adaptador actual `LocalStorageLegalRepository` guarda las tareas en
`abogadospro_tasks_v1`. Primero persiste y después actualiza el estado visible.
Los errores de lectura/escritura son visibles y no sustituyen datos corruptos.
Una lista vacía se conserva. Los cuatro ejemplos demo se crean solo si la clave
no existe o al solicitar Reiniciar Demo.

Completar conserva el registro y guarda `completedAt`. Reabrir lo elimina y
mantiene la fecha límite original. Crear/editar comparten formulario y validación.

## Fechas y presentación

Las fechas se interpretan en `America/La_Paz`. Sin hora, una tarea vence al
cambiar el día local; no se inventa una hora límite. Con hora, se compara el
instante indicado. El vencimiento se calcula, no se persiste como estado.
La pantalla actualiza el reloj cada 30 segundos y al recuperar el foco.

El orden es vencidas, hoy y próximas; luego fecha y prioridad. Inicio muestra
hasta cuatro pendientes relevantes: vencidas, de hoy o de prioridad Alta en los
próximos siete días. El Resumen del caso muestra hasta tres pendientes y enlaza
al listado filtrado. Los filtros de estado, prioridad, caso y búsqueda se combinan.

## Migración futura a Firestore

Firebase no está activo. El punto de sustitución sigue siendo
`src/repositories/index.ts`, implementando los métodos de `ILegalRepository`
sin cambiar los formularios ni las listas.

Para varios estudios, el futuro adaptador debe recibir el estudio autenticado
y autorizado y usar una colección de tareas dentro de ese estudio. Las reglas
de seguridad deberán verificar pertenencia y que el caso esté en el mismo
estudio. La selección del estudio no debe confiar únicamente en una variable
de entorno o un filtro de la UI. El adaptador también traducirá los timestamps
de Firestore al modelo y omitirá campos opcionales `undefined` al escribir.

La persistencia local actual continúa siendo un dataset del navegador, sin
aislamiento multiestudio real. Una futura migración necesita asignar
explícitamente ese dataset a un estudio; no debe subirlo automáticamente ni
considerar esta preparación como seguridad multiusuario implementada.

## Verificación

`npm test` ejecuta pruebas de fechas, orden, CRUD, completar/reabrir, persistencia,
reinicio demo, aislamiento de Agenda/Finanzas y fallos de almacenamiento.
Usa TypeScript y Node ya disponibles, sin dependencias adicionales.
`npm run build` incluye la comprobación TypeScript; `npm run lint` ejecuta oxlint.
