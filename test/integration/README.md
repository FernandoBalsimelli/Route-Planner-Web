# Integración local de cuentas y rutas

Se corrigen también los nombres accesibles de los selectores de tipo y flota.
Este directorio prueba la Web actual con sesiones reales emitidas por Auth,
PostgREST, las ocho migraciones de Route Planner y sus políticas RLS en un
stack desechable. Se porta sólo la infraestructura de la antigua rama de pruebas;
no se restaura su versión antigua de la aplicación.

El job `authenticated-integration` de checks.yml fija API f5c3639 y CLI 3.0.0
con su lockfile separado. Al cambiar el contrato de la API o migraciones, revisar
la referencia fijada y actualizarla junto con las pruebas. Corre en un runner
público Ubuntu estándar. No requiere secretos de GitHub ni recursos de pago.

- Cuenta creada desde navegador móvil y sesión validada por la API real.
- Flota, vehículo, medidas HGV, orden de entregas, guardado, favoritos,
  archivo/papelera, recuperación y carga.
- Optimización de reparto y ausencia de medidas HGV en ese perfil.
- Segunda cuenta sin acceso a los datos de la primera, bloqueo de propietario
  falsificado y denegación de un cálculo sin sesión.
- 48 entregas por API/REST: orden, guardado atómico, reintento idempotente,
  rechazo de 49 sin registros parciales y aislamiento de los puntos guardados.

Sólo el proveedor externo de cartografía es sintético. No se simulan los JWT,
Auth, REST, RPC ni RLS. No es una prueba de ORS real ni navegación en carretera.
Los fixtures prohíben conexiones de datos fuera de loopback y los dominios
explícitos de cartografía interceptados. No crean cuentas ni registros alojados.
Las credenciales locales se generan al arrancar y se enmascaran en diagnósticos;
ninguna clave secreta se envía al cliente. La contraseña fija pertenece sólo a
cuentas sintéticas de este stack, que no envía correos.

La configuración usa `[local_smtp]` y comandos locales de CLI v3 según el cambio
oficial del 4 de noviembre de 2026. No hay `link`, `--remote`, `config push` ni
modificación de proyectos alojados. Se revisaron:
https://supabase.com/changelog/supabase-cli-v3
https://supabase.com/docs/guides/local-development/cli/getting-started

Para reproducir se necesita Docker, Node 26 y el CLI instalado por
`npm ci --prefix test/integration`. El runner copia migraciones desde la API,
arranca el stack, configura sólo URL/clave publicable locales, compila la Web y
corre `node --test test/integration/authenticated.e2e.mjs`. El paso de limpieza
siempre intenta detener los contenedores locales. Los resultados funcionales
se registran después de ejecutar CI; no se considera terminado sólo por parsear.
