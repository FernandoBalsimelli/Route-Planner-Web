# Aislamiento del planificador al cambiar de cuenta

Revisión: 16-11-2026. Sólo Route Planner Web; sin cambios de esquema o RLS.

## Problema y alcance

El estado del planificador pertenece al componente principal y sobrevivía al
cierre de sesión. Una respuesta tardía de paradas podía restaurar un recorrido
después del cambio de cuenta. Comparar sólo el identificador tampoco distingue
una sesión A de otra sesión A tras cerrar y volver a entrar. La consulta inicial
getUser podía llegar después de un evento de sesión más reciente. Un editor de
vehículos desmontado conservaba callbacks capaces de seleccionar su unidad.

Las reproducciones usan datos sintéticos. No se observó acceso entre cuentas en
la base de producción ni se afirma un fallo de RLS. El problema es la aplicación
tardía de datos que una sesión anterior ya estaba autorizada a leer en el cliente.

## Comportamiento corregido

- Al salir de una cuenta identificada se limpian origen, destino, entregas,
  resultado, alternativas, nombre del recorrido, vehículo, preferencias,
  referencias de búsqueda/mapa, revisión de manifiesto y mensajes del planificador.
  Se detiene navegación/GPS al retirarse el resultado y se cancela el cálculo.
- Una versión de contexto cambia con la identidad, incluso A → fuera → A. Cálculos,
  restauraciones y guardados anteriores no pueden actualizar el nuevo contexto.
  Un cambio del borrador también invalida una restauración pendiente.
- El borrador de invitado se conserva al iniciar sesión por primera vez. Refrescar
  un token de la misma cuenta conserva el recorrido y no lo trata como otra cuenta.
- AccountPanel da prioridad a eventos de sesión más recientes frente al getUser
  inicial y descarta respuestas/eventos después de desmontarse.
- Los paneles de rutas y vehículos descartan resultados, errores y finalizaciones
  tardías de su instancia anterior. Se limpian sus formularios al cambiar de dueño.
- La consulta de paradas añade owner_id explícito a route_id; las políticas RLS
  y la validación de sesión del backend siguen siendo la autorización efectiva.

No se borran rutas, vehículos, favoritos o recientes persistidos. No se vacía todo
localStorage ni se alteran credenciales. Una escritura ya enviada y autorizada
puede terminar en la cuenta original; se descarta su efecto en la interfaz nueva,
sin simular una cancelación/reversión de servidor que no se ha producido.

## Verificación

Ocho regresiones de componentes fallan sobre el código anterior y pasan con la
corrección: borrador y cierre de sesión, cálculo tardío, restauración A/fuera/A,
error tardío de guardado, éxito de guardado A/fuera/A, getUser inicial retrasado,
panel de rutas desmontado y guardado de vehículo de la cuenta anterior.

La prueba de navegador móvil comprueba que cerrar sesión retira el recorrido y
cierra el watch de GPS; el sensor y el proveedor de ese caso son controlados.
La integración con Supabase Auth/REST/Postgres local añade una respuesta auténtica
de route_stops de la cuenta uno retenida hasta entrar en la segunda cuenta: no
puede sobrescribir su borrador. Se comprueba también que cerrar sesión deja los
puntos/resultados vacíos. Los datos son desechables; RLS se mantiene activa.

La autenticación local es real, pero ORS usa un fixture y no es navegación física
Android ni una comprobación autenticada de cuentas alojadas en producción. Las
sondas públicas, los commits, CI, despliegue, rollback y límites concretos constan
en el último cierre de ENGINEERING-STATUS.md. No se cambia normativa municipal,
geometría, límites del proveedor, orden de entregas ni enlaces Google.

Referencias técnicas primarias consultadas el 16-11-2026:
https://supabase.com/docs/reference/javascript/auth-onauthstatechange
https://supabase.com/docs/reference/javascript/auth-getuser
https://supabase.com/changelog.md
