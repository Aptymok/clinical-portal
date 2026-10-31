# Inmunoclinic · integración y límites operativos

## Trabajo conservado

La aplicación está en `Aptymok/clinical-portal`. El repositorio `Aptymok/inmunoclinic` contiene sólo descripción y dominio. Se recupera la propuesta #11 (`feat/inmunoclinic-four-public-pages`) sin sustituir la identidad visual ni el logo. La rama `delivery/calendar-discovery-governance` ya estaba integrada por contenido: antes de los cambios, `src/lib`, `src/app/api` y `prisma` eran idénticos entre esa rama y main. Se preserva también su historial antes de eliminar referencias de ramas.

## Comportamiento entregado

- Páginas públicas de inicio, médico, servicios y contacto, con referencia oficial, sitemap y ficha legible por máquinas. No se habilita una reserva pública automática.
- Acceso profesional compatible con NextAuth v5, salida de sesión y protección en servidor para páginas y API clínicas. Next.js actualizado a 15.5.28.
- Centro de operación con citas, pacientes, resultados de atención, pendientes de conectores y actividad registrada. No se presenta como un sistema autónomo de agentes.
- Agenda maestra e integraciones conservadas. Ningún calendario vacío demuestra disponibilidad. Las credenciales externas siguen siendo necesarias.
- Discovery Mesh permite al equipo registrar una fuente pública y contrastar nombre, dirección, teléfono u horario. Observaciones inmutables en DomainEvent; última observación visible por fuente y campo. Una diferencia de formato requiere revisión, no denuncia automática.
- Resultado de cita interna modificable y persistido desde su ficha. No se declara propagación a calendarios externos.
- Mantenimiento existente de calendarios persiste un comprobante local de su resultado. Fallos parciales devuelven error; ausencia de fuentes queda como no observada. El comprobante no certifica una operación médica ni autonomía general.
- Se retiran del índice Git únicamente artefactos generados de Next.js y TypeScript. El código fuente y su historial permanecen.

## Verificación

- Esquema Prisma válido; TypeScript sin errores; 14 pruebas unitarias aprobadas.
- Compilación de producción completa con Next.js 15.5.28.
- Verificación HTTP de 12 rutas públicas, siete redirecciones de áreas privadas, seis denegaciones de API y handlers de sesión/CSRF.
- Prueba con base sintética desechable: acceso DOCTOR, seis páginas profesionales, escritura y lectura de observación, bloqueo de origen ajeno, actualización y lectura de resultado de cita; comprobante de mantenimiento sin fuentes y denegación de datos profesionales al rol PATIENT.
- Las verificaciones se incorporan al workflow de main con PostgreSQL desechable. Los ensayos locales usan PGlite con protocolo PostgreSQL; no equivalen a validar la base real de producción ni proveedores externos.

## Pendiente real de publicación y activación

La conexión Vercel disponible devuelve 403 al listar despliegues de clinical-portal y su contexto Git sólo muestra system-friction como proyecto enlazado. No se modificó ese proyecto ni se creó un despliegue alternativo. Integración GitHub no implica despliegue observado.

Faltan: acceso al proyecto de publicación correcto; confirmar configuración productiva y cuenta profesional real; completar aviso integral y revisión de captura clínica; verificar conexiones de calendario; instrumentar atribución de contactos a citas; incorporar ejecución de agentes sólo donde exista autoridad, runtime y evidencia. Sin solicitudes externas de corrección ni promesas de desindexación.
