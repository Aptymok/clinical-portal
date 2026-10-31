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
