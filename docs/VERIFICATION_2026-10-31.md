# Verificación de clinical-portal — 31 de octubre de 2026

Versión examinada: `main`, commit `d13317e89499e47f7156813f39cf13cdd776d2ec`.

## Dictamen

La web pública está publicada y responde. El hub profesional y la integración completa del calendario todavía no están listos para operar. No se modificaron pacientes ni calendarios de producción durante esta revisión.

## Evidencia de producción

| Comprobación | Resultado observado |
| --- | --- |
| Vercel | Deployment `dpl_9PeRunzzUgGVbHLzVsaFUsAfRr6k`, Production / Current / Ready; fuente main d13317e |
| Sitio | https://inmunoclinic.com/ muestra la nueva portada, identidad y datos de contacto |
| HTTP público | Las 12 rutas públicas de scripts/verify-http.mjs respondieron 200 |
| Acceso privado | Siete páginas redirigen al login y seis API privadas responden 401 sin sesión |
| Sesión | /api/auth/session responde 500; el smoke test se detiene en esa frontera |
| Registros Vercel | `MissingSecret: Please define a secret` en peticiones a /api/auth/session |
| Variables visibles del proyecto | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_CALENDAR_ID, en Production; no variables compartidas enlazadas. No se revelaron valores |
| Mantenimiento programado | Run 41203704044 / job 124544417765: success, pero no ejecutó mantenimiento |

La línea del job de mantenimiento dice: `2026-10-31T13:01:52.9646223Z Calendar maintenance secrets are not configured; skipping.` Por tanto, el indicador verde no acredita sincronización.

No se observaron DATABASE_URL, AUTH_SECRET/NEXTAUTH_SECRET, ENCRYPTION_KEY, NEXT_PUBLIC_SITE_URL ni CALENDAR_SYNC_SECRET en la configuración visible de Vercel. Esto no prueba que no exista una base de datos externa; sí deja pendiente verificar su conexión efectiva con esta aplicación. Tener tres variables de Google no demuestra que OAuth, permisos, webhooks o lectura/escritura estén operativos.

## Verificación local y pruebas adversas

`npm test`: 14 pruebas aprobadas en siete archivos. `npm run typecheck`: aprobado. Estas comprobaciones no acreditan funcionamiento en producción ni cubren todos los caminos reales de sincronización.

Se ejecutaron cinco diagnósticos adicionales contra PostgreSQL compatible mediante PGlite, aislado y desechable, aplicando las tres migraciones existentes y usando datos ficticios. Se llamaron funciones reales de ingestión y disponibilidad, la ruta real de disponibilidad y el predicado Prisma utilizado por las API de citas. No se hicieron llamadas a proveedores externos. Los cinco diagnósticos reprodujeron problemas:

| Escenario | Esperado | Observado |
| --- | --- | --- |
| Dos fuentes contradicen el horario del mismo evento | Marcar conflicto | La última llegada reemplaza el horario sin marcar conflicto |
| Llega una notificación anterior después de una nueva | Conservar versión nueva | El horario antiguo reemplaza al nuevo |
| Hay una cita interna y se consulta disponibilidad canónica | Ocupación integrada | La disponibilidad canónica devuelve libre; falta la conexión/mapeo entre Appointment y la agenda externa |
| Las fuentes tienen lastSyncAt de 2020 | No garantizar disponibilidad | La ruta devuelve 204, indicando disponibilidad |
| Una cita comienza cuando termina la anterior de 30 minutos | Permitir continuidad | El predicado local indica colisión |

Son fallos reproducidos en un entorno sintético; no se observaron incidentes sobre pacientes reales. El diagnóstico de citas contiguas ejercita el predicado de consulta, no una reserva HTTP completa. El de citas internas evidencia la separación entre los modelos; no valida un mapeo de doctor externo que todavía no existe.

## Hallazgos del código

- `src/lib/calendar/reconcile.ts` contempla contradicciones, pero no tiene llamadas desde el flujo de ejecución: sus consumidores son pruebas. La ingestión real usa `orchestrator.ts`.
- Las API de creación, modificación y cancelación de Appointment no alimentan la agenda canónica ni generan trabajos de propagación externa. La cancelación devuelve explícitamente `externalPropagation: NOT_VERIFIED`.
- Las comprobaciones de cobertura verifican la existencia de lastSyncAt, sin exigir vigencia de la observación.
- El mantenimiento renueva suscripciones de Google, pero no realiza una lectura periódica que recupere cambios si se perdió un webhook.
- Un trabajo marcado SENT antes de una llamada externa puede quedar sin recuperación tras una interrupción. La confirmación HTTP tampoco acredita por sí misma una lectura posterior en el calendario destino.
- La conexión Docplanner no habilita automáticamente autoridad de escritura ni validación de reservas. La tercera fuente necesita identificación y validación concretas.

## Orden de ejecución propuesto

1. **Restaurar el hub en producción.** Configurar el secreto de autenticación, verificar DATABASE_URL y migraciones, cuenta/rol del doctor, cifrado, URL canónica y secretos del mantenimiento. Repetir el smoke test hasta que la sesión responda correctamente y comprobar acceso autorizado al dashboard.
2. **Corregir el calendario real.** Conectar Appointment con el modelo canónico y la cola de propagación; controlar versiones y contradicciones en el orquestador; exigir observaciones recientes; corregir límites de solapamiento y recuperación de trabajos interrumpidos. Convertir los cinco diagnósticos en regresiones automatizadas.
3. **Verificar cada proveedor.** Identificar calendarios y doctor, comprobar permisos y conexiones. En un calendario de pruebas autorizado: crear un bloqueo ficticio, observarlo en destinos, moverlo, cancelarlo y confirmar la liberación. Cubrir duplicados, orden invertido, pérdida de webhook y reinicio. Guardar recibos de ejecución efectivos, sin confundir omisión con éxito.
4. **Completar operación clínica.** Portal del paciente, recordatorios, seguimiento, agentes con ejecución y supervisión verificables. Los modelos de datos existentes no acreditan estos flujos completos.
5. **Completar identidad y captación.** Discovery Mesh actualmente sirve para observación manual y comparación; faltan los procesos de corrección externa. Instrumentar el recorrido visita → contacto → cita → asistencia; Vercel Analytics y Speed Insights figuran desactivados. La captación pública actual conduce al teléfono/contacto, no a una reserva integrada validada.

No debe declararse integración completa hasta observar el ciclo de creación, cambio y cancelación en los proveedores reales, con disponibilidad consistente y evidencia persistida.
