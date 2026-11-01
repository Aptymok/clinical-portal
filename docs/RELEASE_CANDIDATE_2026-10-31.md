# Candidato de integración operativa — 31 de octubre de 2026

## Estado de entrega

Este documento corresponde al trabajo posterior a la auditoría. No reemplaza sus observaciones históricas de producción. Los cambios se preparan en un único candidato; no se ha actualizado main remoto ni generado un despliegue durante esta ejecución.

## Cambios implementados

- Citas internas: creación, cambio y cancelación guardan la representación canónica y los trabajos de entrega dentro de la misma transacción. Formularios profesionales para registrar pacientes, crear citas y cambiar horarios.
- Reconciliación: se utiliza la función existente dentro de la ingestión real. Se conservan versiones recientes, se detectan contradicciones entre fuentes y versiones iguales con contenido diferente. Las observaciones discrepantes siguen bloqueando sus intervalos.
- Disponibilidad: incluye citas internas, admite consultas consecutivas y exige observaciones completas recientes. Una fuente requerida deshabilitada no desaparece de la comprobación. Se exige vincular explícitamente el profesional interno con su referencia externa. Las cancelaciones todavía pendientes de entrega no certifican un horario libre.
- Propagación: recuperación de trabajos interrumpidos, reclamación atómica, exclusión por evento/destino, descarte de versiones obsoletas y reparación persistida si un envío antiguo termina después de un cambio nuevo. Las llamadas externas tienen tiempos máximos.
- Google: recuperación periódica por lectura, observación de lecturas vacías, cancelaciones sin intervalo usando el mapeo previo, fechas de día completo en la zona correcta, identificador determinista para reintentos y verificación posterior de creación/cambio/cancelación. La cancelación busca el identificador determinista aunque falte el mapeo local.
- Doctoralia: comprobación de disponibilidad mediante el mismo criterio de cobertura; entrega de bloqueos con lectura posterior y recuperación de bloqueos administrados sin mapeo. Nunca se alteran reservas clínicas originales desde estos adaptadores: se administran bloqueos de ocupación.
- Tercer conector: exige firma y un recibo que corresponda al evento solicitado; un HTTP 200 arbitrario no equivale a confirmación.
- Mantenimiento: ya no presenta secretos ausentes como ejecución exitosa. Registra pendientes, omisiones de seguridad y conflictos sin cerrar.
- Seguimiento: portal personal que resuelve al paciente desde su cuenta autenticada, sin aceptar un identificador de paciente proporcionado por el visitante. Recordatorios registrados por personal y visibles en ese portal. No se declara envío por correo/SMS/WhatsApp.
- Seguridad de formularios: comprobación de origen para citas, registro de pacientes y recordatorios; estado OAuth ligado al navegador y uso consistente del secreto de Auth.js.

## Verificación

- Suite unitaria: 27 pruebas en 12 archivos.
- Diagnósticos del calendario: 13 escenarios en base desechable, incluyendo los cinco problemas originales, callback de Doctoralia, igualdad de versiones, ciclo de cita, carrera entre envío y cancelación, recuperación de mapeo Google y adaptadores de Google/Doctoralia.
- Integración HTTP sobre compilación de producción: páginas públicas, rechazo anónimo, acceso profesional, autenticación con credenciales ficticias, persistencia y relectura, aislamiento entre pacientes, recordatorios sin falso envío y registro de pacientes.
- Revisión independiente: cuatro hallazgos importantes, corregidos con comprobaciones de regresión. Revisión de componentes aplicada sin cambiar la identidad pública.

Los diagnósticos locales usan PGlite/PostgreSQL compatible; los proveedores externos se sustituyen por respuestas simuladas. El workflow existente queda ampliado para repetir el diagnóstico sobre PostgreSQL 16 real, pero no se afirma una nueva ejecución remota antes de actualizar main.

## Fronteras abiertas

1. **Configuración de producción:** falta resolver el secreto de autenticación observado por Vercel, base de datos y esquema de la clínica, cifrado, secreto de mantenimiento y profesional vinculado. La comprobación `node scripts/check-release-readiness.mjs` es de sólo lectura y falla mientras estas condiciones no se verifiquen en el entorno donde se ejecuta.
2. **Autoridad sobre almacenamiento:** Vercel ofrece Anlaysis y supabase-celeste-brush para conectar; no se observó una conexión activa del proyecto ni se acreditó cuál contiene los datos de la clínica. No se conectaron ni se modificaron estas bases. El conector Supabase sólo mostró SystemFriction y Neon sólo SFI Continuity; no se reutilizaron por suposición.
3. **Prueba externa real:** falta OAuth/permisos efectivos, identificación del tercer calendario y una agenda desechable autorizada para contrastar creación → movimiento → cancelación en los destinos reales. Los adaptadores probados con simulaciones no cierran esta frontera.
4. **Doctoralia y tercer proveedor:** las notificaciones individuales no acreditan una lectura completa de todo su calendario. Se mantiene la reserva bloqueada si no existe evidencia reciente suficiente. Deben completarse la observación inicial/recuperación y el contrato del proveedor efectivamente elegido antes de habilitar reservas.
5. **Operación ampliada:** recordatorios externos, vinculación autorizada de cuentas de pacientes, agentes autónomos, corrección externa de identidad y atribución de captación no se presentan como funciones cerradas por este candidato.

## Publicación única pendiente

Después de resolver configuración y autoridad: comprobar esquema y cuenta autorizada, ejecutar la prueba externa controlada, verificar nuevamente el candidato, avanzar main una sola vez y observar su despliegue automático. No lanzar un segundo deploy manual ni una publicación intermedia para probar configuración. Verificar al final que sólo queda main y que no hay PRs abiertos.

## Reobservación posterior a la creación reportada por Juan

Juan reportó haber creado el recurso faltante. Se consultó de nuevo el estado real, sin publicar ni desplegar:

- GitHub conserva main en d13317e; el candidato a475f6c permanece guardado sin avanzar la referencia.
- clinical-portal en Vercel muestra únicamente GOOGLE_CLIENT_SECRET, GOOGLE_CLIENT_ID y GOOGLE_CALENDAR_ID, actualizadas el 24 de septiembre. No hay variables compartidas del equipo.
- La vista de almacenamiento del equipo identifica Anlaysis y supabase-celeste-brush como **Uninstalled**, sin proyectos conectados. La propuesta anterior de conectar Anlaysis queda retirada hasta acreditar un recurso operativo y su pertenencia a la clínica.
- Los conectores disponibles siguen mostrando únicamente los proyectos SystemFriction (Supabase) y SFI Continuity (Neon), y no localizan clinical-portal desde Vercel. No se reutilizaron credenciales ni almacenamiento de esos proyectos.

Pendiente mínimo: obtener el enlace del recurso recién creado o su identificador visible para resolver la diferencia entre el recurso declarado y el inventario observable. No se requiere que Juan lo recree ni que comparta secretos por el chat. Después procede el enlace/mapeo del recurso correcto, comprobación de esquema, configuración y pruebas reales antes de la única publicación final.

## Configuración observada después de guardar las variables

Se actualizaron los datos desde la página del proyecto en Vercel. DATABASE_URL, NEXT_PUBLIC_SITE_URL, AUTH_SECRET, ENCRYPTION_KEY y CALENDAR_SYNC_SECRET aparecen guardadas para Production. No se revelaron sus valores; presencia no equivale a formato válido ni conexión comprobada.

El proyecto clínico comunicado por Juan es ojhhjwnwqegepuzhqcqd. El conector Supabase deniega tanto sus metadatos como la lista de tablas: `You do not have permission to perform this action`. No se intentó usar una base de SFI como sustituto. Queda pendiente habilitar acceso al proyecto clínico mediante una conexión autorizada o su panel web.

Se añadió una migración de privacidad limitada a las tablas propias del portal: activa RLS y revoca acceso público/anon/authenticated, conservando el acceso del servidor propietario. La prueba falló antes de añadir la migración y pasó después en la base desechable, con roles públicos equivalentes creados para el ensayo. No se ha aplicado a producción. La suite conserva 27 pruebas unitarias y el diagnóstico de calendario/privacidad tiene ahora 14 escenarios locales. Las respuestas de proveedores siguen siendo simuladas.

## Base clínica inicializada — 1 de noviembre de 2026

Esta observación sustituye el bloqueo de esquema descrito arriba. Con autorización de Juan se accedió al panel del proyecto clínico `ojhhjwnwqegepuzhqcqd`, organización Inmunoclinic, enlazado a Aptymok/clinical-portal. El servidor PostgreSQL existía; el esquema public tenía cero tablas. No se utilizó la base de SFI.

- Se aplicaron en una sola transacción las cuatro migraciones exactas del repositorio, conservando sus checksums SHA256 y el historial compatible con Prisma. El generador `scripts/build-supabase-initialization.mjs` rechaza esquemas public que ya contienen tablas.
- Consulta posterior en el servidor real: **32 tablas, 32 con RLS, 4 migraciones terminadas, 0 tablas con permisos SELECT/INSERT/UPDATE/DELETE para anon/authenticated, 0 pacientes, 0 cuentas, 1 profesional**.
- Profesional registrado: Jesús Guillermo Espinoza Contreras, Inmunología clínica y Alergología. Provider id `f2d5e3f7-f087-41e0-82af-8a04842b4d2d`.
- Vercel Production: guardados `CALENDAR_INTERNAL_PROVIDER_ID`, `CALENDAR_PROVIDER_REF=dr-guillermo`, `CLINIC_ADMIN_EMAIL`, `SUPABASE_PROJECT_REF` y `DATABASE_POOLER_HOST`. La conexión de sesión IPv4 fue observada en el panel: aws-1-us-west-2.pooler.supabase.com:5432. El servidor conserva la contraseña privada guardada en DATABASE_URL; no se reveló ni cambió.
- El candidato adapta la conexión directa del mismo proyecto al pooler observado, mantiene las credenciales codificadas y exige TLS. Rechaza referencias de otro proyecto y errores sin imprimir secretos.
- La compilación de producción comprueba formatos de secretos, checksums del esquema, privacidad y profesional antes de crear la primera cuenta ADMIN. Usa `CLINIC_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (mínimo 16 caracteres), registra una auditoría y no cambia contraseñas ni roles existentes. No ejecuta el seed de demostración ni carga pacientes. Fuera de Vercel Production omite este alta.

Pendiente: Juan debe introducir personalmente la contraseña inicial en Vercel como Secret de Production. Todavía no se ha creado una cuenta en la base real ni verificado la conexión privada desde el runtime de Vercel. No se avanzó main ni se lanzó un deployment. Las pruebas externas de calendarios y la configuración del mantenimiento siguen pendientes; la creación del esquema no acredita sincronización real.

Validación de este incremento: 31 pruebas unitarias en 13 archivos; compilación Next.js de producción terminada; 14 escenarios de calendario/privacidad repetidos correctamente en PGlite; alta administrativa y comprobación de compilación ejecutadas en una base desechable. Se verificó conservación de contraseña, rechazo de elevación de paciente a ADMIN, ausencia de pacientes de seed y bloqueo efectivo si se desactiva RLS. El generador SQL también se contrastó con los checksums del repositorio y rechazó una segunda inicialización. Esto no sustituye la conexión aún pendiente desde Vercel a la base real.
