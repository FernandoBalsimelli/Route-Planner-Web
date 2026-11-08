# Route Planner Web

Frontend web/PWA en Next.js para planificación de rutas de reparto y transporte pesado.

## Variables de entorno

- `NEXT_PUBLIC_API_URL`: URL de Route Planner API.
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase independiente de Route Planner.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública/publishable de Supabase. Nunca colocar una service-role o secret key en el cliente.

## Desarrollo

`npm install && npm run dev`

La interfaz solicita los cálculos a Route Planner API. La API utiliza OpenRouteService (HeiGIT); la clave `ORS_API_KEY` debe existir únicamente como secreto del proyecto API de Vercel. No se necesita ni debe configurarse una clave ORS en el frontend.

## Aplicación instalable

La aplicación publica un manifiesto web en `/manifest.webmanifest` y un icono SVG en `/icon.svg`. En navegadores compatibles puede instalarse desde el menú del navegador. La instalación no implica todavía funcionamiento offline completo: el cálculo de rutas y la autenticación requieren conexión.

## Autenticación y persistencia

En Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://route-planner-web-fernandobalsimellis-projects.vercel.app`
- Redirect URLs: agrega el dominio de la aplicación y sus previews autorizados.

La aplicación usa Supabase Auth. Las rutas guardadas se almacenan en `saved_routes`, sus datos de cálculo (perfil, vehículo, métricas, indicaciones y geometría) en `saved_routes.route_metadata`, y las paradas en `route_stops`. Las tablas mantienen RLS con políticas de propietario.

## Proveedor de rutas

El frontend consume `POST /v1/routes/plan` en Route Planner API. Los perfiles y las credenciales del proveedor se administran en el backend. No publiques secretos en el repositorio ni los incluyas en variables `NEXT_PUBLIC_*`.

## Limitaciones

Las restricciones para vehículos pesados dependen de los atributos presentes en OpenStreetMap. La cobertura puede ser incompleta y el resultado no garantiza autorización legal ni transitabilidad física. Verifica señalización y normativa local antes de circular.
