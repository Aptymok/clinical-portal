# Inmunoclinic — resultado de publicación y pendientes

## Resultado observado

El 1 de noviembre de 2026 se avanzó main una sola vez, desde d13317e89499e47f7156813f39cf13cdd776d2ec hasta 2259f211fd42c35454eb08e962bf6dd54780e27c. Vercel creó el despliegue automático dpl_EnymAcb2VZNVWJaDGutr5oNLuDWK: Production, Current, Ready, 47 segundos, terminado a las 16:13:34 de México. No se ejecutó redeploy manual ni se crearon ramas o PRs.

- Sitio: https://inmunoclinic.com/
- Despliegue: https://vercel.com/systemfrictioninstitute/clinical-portal/EnymAcb2VZNVWJaDGutr5oNLuDWK
- GitHub Verify #133: https://github.com/Aptymok/clinical-portal/actions/runs/41355979791

El registro real de Vercel devolvió productionInitialization PASS, schemaVerified true, privacyVerified true, administrator CREATED y patientsSeeded 0. Consulta posterior de Supabase: una cuenta ADMIN del correo autorizado, contraseña configurada en el formato esperado, cero pacientes. No se leyeron contraseñas ni hashes.

Comprobación HTTP real: inicio, perfil profesional, servicios, contacto, login, robots.txt y manifiesto de identidad responden 200; /api/auth/session responde 200 con null; pacientes y estado del calendario responden 401 sin autenticación; /dashboard redirige 307 al acceso. No se crearon pacientes de prueba en producción.

## Acceso todavía no confirmado

La entrada mediante el formulario seguro terminó con rechazo de credenciales. La auditoría persistió tres AUTH_LOGIN_FAILURE/REJECTED con el correo esperado. El servidor encontró la cuenta y no aceptó la contraseña introducida. No se afirmó ingreso exitoso ni se cambiaron credenciales. Próxima acción: el titular prueba personalmente la contraseña exacta elegida para el portal; si necesita restablecerla, debe autorizarse y ejecutarse un flujo específico, sin leer secretos guardados.

## Fallo de GitHub y corrección preparada

Vercel publicó correctamente, pero GitHub Verify #133 falló en typecheck antes de ejecutar su suite. Seis errores TS2345: la inferencia JavaScript exigía ProcessEnv completo, incluyendo NODE_ENV, a los objetos parciales de la prueba de conexión. El fallo se reprodujo con npm run typecheck.

Corrección: anotar el parámetro env de databaseUrl como Record<string, string | undefined>. No modifica el algoritmo ni desactiva comprobaciones. Se verificó que TypeScript emite JavaScript idéntico al del archivo publicado al retirar comentarios; typecheck, las 31 pruebas unitarias y una compilación de producción completa pasan localmente tras la corrección. El resultado remoto de Verify #133 sigue siendo FAILURE; no se confunde con las pruebas locales ni con Vercel Ready.

La corrección queda pendiente de integrar: otro avance de main dispara otro despliegue. El límite explícito de Juan permite sólo uno, ya utilizado. No se altera ni desactiva la integración Git/Vercel para eludir ese límite. Se requiere una excepción concreta antes de publicar nuevamente.

## Calendarios y operación ampliada

Google necesita autorización efectiva y lectura inicial; Doctoralia necesita credenciales y observación completa; el tercer proveedor sigue sin identificar. El mantenimiento programado aún necesita sus secretos de GitHub. Los ensayos externos previos fueron simulados y no prueban sincronización de agendas reales. Tampoco se declaran cerrados los recordatorios externos, agentes autónomos ni correcciones de identidad en plataformas ajenas.
