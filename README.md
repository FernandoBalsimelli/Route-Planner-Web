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

## Ubicación actual

El botón del origen solicita permiso de ubicación al pulsarlo. Funciona en HTTPS
y conserva la precisión de las coordenadas recibidas del navegador. Muestra el
margen de error del dispositivo, permite cancelar y conserva las coordenadas si
la búsqueda de una dirección legible no responde. No realiza seguimiento continuo.

## Verificación y prioridades

Con Node 24 o posterior: `npm test`, `npm run typecheck`, `npm run build` y
`npm run test:e2e`. Para E2E instala Chromium con `npx playwright install chromium`
o define `PLAYWRIGHT_CHROMIUM_EXECUTABLE` con la ruta de tu Chromium instalado.
Las posiciones E2E son simuladas y no representan la ubicación real del usuario.

Consulta [docs/ENGINEERING-STATUS.md](docs/ENGINEERING-STATUS.md) para el estado de
la auditoría, pendientes y versiones de recuperación.

## Puntos sobre el mapa y orden de las entregas

Cada campo permite abrir el mapa, tocar un acceso o elegir el centro de la vista,
revisar la etiqueta y confirmar las coordenadas. Cancelar no altera el formulario.
Si no hay dirección disponible, el punto sigue siendo utilizable por coordenadas.

Las paradas incluyen botones Subir y Bajar. El orden manual desactiva la
optimización y requiere calcular de nuevo. Los cálculos pendientes se cancelan
al editar el recorrido para que no aparezcan resultados anteriores.

### Trabajo de reparto

- **Mi perfil y vehículos**: guarda automóviles, unidades de reparto y camiones.
  El selector del planificador carga la unidad y sus medidas; la ruta guardada
  conserva el vínculo y una copia de las restricciones usadas en ese cálculo.
- Establece primero el **origen** (GPS, dirección o mapa). Las búsquedas de
  sucursales priorizan ese punto y muestran distancia en línea recta. Para otra
  ciudad, escribe `Bodega Aurrera Express, Monterrey` o desactiva la prioridad.
  La cobertura depende de los índices públicos; confirma sucursal, calle y acceso.
- **Escanear o pegar manifiesto** admite fotos JPG/PNG/WebP/BMP de hasta 15 MB y
  texto pegado. OCR en español mediante Tesseract.js, cargado al pedirlo y ejecutado
  en el dispositivo. La foto no se envía al servidor; las consultas de direcciones
  sí llegan al geocodificador. Se revisa una entrega a la vez. Solo se importan
  puntos elegidos y confirmados. Hasta 8 paradas y un destino por recorrido.
  PDF y lectura de tablas complejas quedan pendientes; se puede pegar su texto.
- **Eliminar** mueve una ruta guardada a la papelera. **Deshacer** o **Recuperar**
  la devuelve con sus paradas. No se borran físicamente registros existentes.

Prueba opcional del motor OCR con una foto local:
`node test/ocr-smoke.mjs /ruta/a/foto.png`. Requiere conexión para el modelo español
la primera vez; esta prueba Node no sustituye la captura con la cámara de Android.

### Sucursales guardadas y exportación

En cualquier campo, **Recientes y favoritos** permite reutilizar coordenadas ya
confirmadas. Los últimos 12 puntos se conservan en este dispositivo, separados
por cuenta, y se pueden borrar. **Guardar sucursal** permite asignar un nombre
propio al punto confirmado. Los favoritos se sincronizan con Supabase bajo RLS
de dueño; quitar uno lo archiva y volver a guardarlo lo recupera sin duplicarlo.

Después de calcular o recuperar una ruta, **Exportar recorrido** descarga CSV,
GPX 1.1 o GeoJSON. CSV conserva las entregas en orden y sus coordenadas. GPX y
GeoJSON incluyen el trazado real del proveedor cuando existe; no conectan paradas
con una línea inventada. Las restricciones de camión no se transfieren a otras
aplicaciones al importar estos archivos.

El guardado del recorrido y de todas sus entregas utiliza una sola transacción
en Supabase. Si se interrumpe la conexión, reintentar el mismo contenido no crea
otra ruta. Puedes asignar un nombre operativo antes de guardarla.

El mapa principal está disponible desde el inicio. Al enfocar un campo y buscar,
las coincidencias aparecen como S1, S2… en el mismo orden que la lista. Pulsa
un marcador y «Usar como origen/parada/destino» para confirmar sus coordenadas.
En móvil, el mapa aparece primero y el buscador incluye un enlace para regresar
a sus coincidencias. No se dibuja ningún trazado antes de calcular la ruta.

### Comprobaciones automáticas

GitHub Actions ejecuta TypeScript, pruebas de componentes, build y la suite
Chromium con viewport móvil de 390×844. Los mapas y las fuentes externas se
sustituyen solo en esa suite para evitar depender de terceros; los servicios
reales se comprueban por separado en producción. La cámara y el GPS físicos
siguen requiriendo una prueba en el teléfono. El workflow usa permisos de lectura,
acciones fijadas por SHA y un runner estándar Ubuntu en este repositorio público.


### Espacio de trabajo

Planificar reúne el panel de entregas y el mapa principal. Mis rutas y Vehículos
son secciones separadas; cambiar entre ellas conserva el borrador de planificación.
En Android los accesos quedan en la barra inferior. El botón de apariencia
alterna entre tema claro y oscuro y recuerda la preferencia en este dispositivo.

La sección Guía camión explica los límites reales del motor y enlaza las fuentes
oficiales. Véase [alcance de camiones](docs/TRUCK-ROUTING.md). No se certifica el
cumplimiento de normativa federal o municipal a partir de las dimensiones del mapa.
