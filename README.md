# Route Planner Web

Frontend web/PWA en Next.js para planificación de rutas de reparto y transporte pesado.

## Variables de entorno

- `API_URL`: URL del backend para el proxy del servidor (opcional).
- `NEXT_PUBLIC_API_URL`: URL de Route Planner API, compatible con la configuración existente.
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase independiente de Route Planner.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable de Supabase. Nunca colocar una service-role o secret key en el cliente.

## Desarrollo

`npm ci` y `npm run dev`. Verifica con `npm run typecheck` y `npm run build`.

La interfaz solicita los cálculos a Route Planner API. La API utiliza OpenRouteService (HeiGIT); la clave `ORS_API_KEY` debe existir únicamente como secreto del proyecto API de Vercel. No se necesita ni debe configurarse una clave ORS en el frontend.

## Aplicación instalable

La aplicación publica un manifiesto web en `/manifest.webmanifest` y un icono SVG en `/icon.svg`. En navegadores compatibles puede instalarse desde el menú del navegador. La instalación no implica todavía funcionamiento offline completo: el cálculo de rutas y la autenticación requieren conexión.

## Autenticación y persistencia

En Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://route-planner-web-fernandobalsimellis-projects.vercel.app`
- Redirect URLs: agrega el dominio de la aplicación y sus previews autorizados.

La aplicación usa Supabase Auth. Las flotas personales se guardan en `fleets` y agrupan perfiles de vehículo; los perfiles de camión se guardan en `vehicles`; las rutas en `saved_routes`, sus datos de cálculo (perfil, vehículo, métricas, indicaciones y geometría) en `saved_routes.route_metadata`, y las paradas en `route_stops`. Las tablas mantienen RLS con políticas de propietario. La agrupación de flotas es individual por ahora; todavía no incluye invitaciones ni acceso compartido para conductores.

## Proveedor de rutas

El frontend consume `POST /v1/routes/plan` en Route Planner API. Los perfiles y las credenciales del proveedor se administran en el backend. No publiques secretos en el repositorio ni los incluyas en variables `NEXT_PUBLIC_*`.

## Limitaciones

Las restricciones para vehículos pesados dependen de los atributos presentes en OpenStreetMap. La cobertura puede ser incompleta y el resultado no garantiza autorización legal ni transitabilidad física. Verifica señalización y normativa local antes de circular.


## Búsqueda de direcciones

Los campos de origen, paradas y destino utilizan `components/LocationInput.tsx` para sugerir lugares mientras se escribe. El usuario elige un resultado y confirma el punto; la web conserva sus coordenadas exactas y Plus Code para enviar el punto al motor de rutas.

La web utiliza el proxy same-origin `/api/route-planner/[...path]` para comunicarse con la API. Esto evita que el navegador dependa de CORS entre dominios y convierte los fallos de conexión con el backend en un mensaje controlado.

El proxy admite hasta 75 segundos para el cálculo (geocodificación, optimización y
ruteo), y 25 segundos para otras solicitudes. Los fallos de conexión, las
respuestas de infraestructura sin JSON y los tiempos de espera se devuelven como
errores JSON legibles; los límites del proveedor conservan `Retry-After`.
