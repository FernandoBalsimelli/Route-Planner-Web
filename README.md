# Route Planner Web

Frontend PWA en Next.js para planificación de rutas de reparto y transporte pesado.

## Variables de entorno
- `NEXT_PUBLIC_API_URL`: URL de Route Planner API.
- `NEXT_PUBLIC_SUPABASE_URL`: proyecto Supabase independiente de Route Planner.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública de Supabase. Nunca colocar service-role en el cliente.

## Desarrollo
`npm install && npm run dev`

La interfaz no calcula rutas localmente: solicita el cálculo a la API. La integración HERE requiere `HERE_API_KEY` configurada únicamente como secreto en el proyecto API de Vercel.
