# Route Planner Web

Frontend PWA en Next.js para planificación de rutas de reparto y transporte pesado.

## Variables de entorno
- `NEXT_PUBLIC_API_URL`: URL de Route Planner API.
- `NEXT_PUBLIC_SUPABASE_URL`: proyecto Supabase independiente de Route Planner.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública de Supabase. Nunca colocar service-role en el cliente.

## Desarrollo
`npm install && npm run dev`

La interfaz no calcula rutas localmente: solicita el cálculo a la API. La integración HERE requiere `HERE_API_KEY` configurada únicamente como secreto en el proyecto API de Vercel.


## Activar autenticación por correo en Supabase

En Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `https://route-planner-web-fernandobalsimellis-projects.vercel.app`
- Redirect URLs: agrega `https://route-planner-web-fernandobalsimellis-projects.vercel.app/**`

La aplicación usa Supabase Auth con sesiones persistentes y guarda rutas en `saved_routes` y `route_stops`. Las políticas RLS existentes limitan los registros al usuario autenticado.

## Activar cálculo HERE

En Vercel → proyecto `route-planner-api` → Settings → Environment Variables:
- Key: `HERE_API_KEY`
- Value: tu API key de HERE
- Environments: Preview y Production (y Development si lo necesitas)
- Type: Sensitive o Encrypted

No publiques esa clave en el repositorio ni la incluyas en variables `NEXT_PUBLIC_*`.
