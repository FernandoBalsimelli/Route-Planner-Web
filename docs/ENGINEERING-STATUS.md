# Route Planner — estado de ingeniería

Fecha de revisión: 2026-11-08. Alcance: exclusivamente Route Planner.

## Recursos verificados

| Recurso | Identificador |
| --- | --- |
| Web | FernandoBalsimelli/Route-Planner-Web; Next.js 15 / React 19 |
| API REST | FernandoBalsimelli/Route-Planner-API; Fastify 5 / Zod |
| Vercel Web | prj_sbuLeCkEuxAwxr9N8kHTy6HkxO67 |
| Vercel API | prj_FhoaKKMQcPJCNad826fBz9BlXF09 |
| Supabase | pakhlscjbjvwnheeyjxd; Route Planner; us-west-1; ACTIVE_HEALTHY |
| Producción | https://route-planner-web-sand.vercel.app |
| API | https://route-planner-api.vercel.app |

No se hicieron operaciones sobre otros proyectos ni se contrataron servicios.

## Auditoría inicial

- Frontend → proxy Next.js del mismo origen → API → HeiGIT/Photon. La clave del
  proveedor permanece en el backend. El proxy conserva autorización, errores JSON,
  Retry-After y un presupuesto mayor para los cálculos de múltiples etapas.
- Se comprobaron los recursos y despliegues de producción. La búsqueda y el cálculo
  ya funcionaron con la cuenta del propietario según su confirmación. Las pruebas
  nuevas de ruteo automatizado usan autenticación y proveedores simulados.
- CORS comprobado: el dominio de Route Planner obtiene su cabecera de autorización;
  un origen ajeno no la obtiene. El navegador usa el proxy del mismo origen.
- Las cinco tablas públicas tienen RLS. Se inspeccionaron las políticas de dueño
  y las comprobaciones de pertenencia de vehículos, flotas, rutas y paradas.
  No se ejecutó todavía una prueba de aislamiento con dos cuentas reales.
- Supabase no reportó avisos de RLS. Reportó protección de contraseñas filtradas
  desactivada; queda pendiente evaluar disponibilidad/costo sin habilitar servicios
  de pago: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- No hubo errores de ejecución agregados por Vercel en los 15 minutos consultados.
  Esto no equivale a monitoreo permanente ni garantiza ausencia de errores futuros.
- La auditoría npm detectó avisos en Fastify, Zod y PostCSS. Se actualizaron Fastify
  a 5.12.8 y Zod a 4.6.7, y se fijó PostCSS 8.5.32 mediante override compatible.
  Ambas auditorías npm posteriores devolvieron cero vulnerabilidades conocidas.

## Ciclo: origen con ubicación actual

- Solo se solicita ubicación tras pulsar el botón en el origen.
- Se usa getCurrentPosition, alta precisión, sin posición cacheada y con límite
  de espera de 15 segundos. No se activa seguimiento continuo.
- Se conservan las coordenadas originales; la geocodificación inversa solo añade
  una etiqueta. La precisión aproximada del dispositivo se muestra en metros.
- Hay mensajes específicos para permiso denegado, señal no disponible y timeout.
- Es posible cancelar. Editar manualmente invalida cualquier respuesta tardía.
- Si fallan los proveedores de dirección inversa, sigue disponible el punto GPS.
- Las consultas de ubicación se omiten de los mensajes de solicitud de la API.
  El proveedor sigue recibiendo las coordenadas necesarias para buscar o enrutar.

## Verificación

- Web: pruebas unitarias de precisión y errores de geolocalización, integración
  de componentes React, TypeScript y compilación de producción.
- Resultado acumulado: veinte pruebas Web y doce pruebas API aprobadas. Ambas
  auditorías npm devuelven cero vulnerabilidades conocidas.
- Integración de interfaz: GPS y dirección inversa simulados, denegación de
  permiso, caída de geocodificación, cancelación y edición durante una lectura
  pendiente. No se utilizan ubicaciones privadas de usuarios como fixtures.
- E2E móvil: suite escrita para la compilación de producción; ejecución bloqueada
  en este entorno porque Chromium no puede crear su socket de proceso. No se
  considera aprobada. Debe ejecutarse en un host/CI compatible con Chromium.
- API: validación, concurrencia, autenticación, Plus Codes, selección de ciudad,
  fallback, errores específicos, restricciones de camión y dirección inversa.
- Producción: la dirección inversa respondió HTTP 200 preservando las coordenadas
  decimales completas de un punto público de prueba; coordenadas vacías dieron 400.
- Pendiente: probar sensores y permisos del Android físico del propietario.
  No se presenta la precisión simulada como una medición de su teléfono.
- Los resultados y commits exactos del despliegue deben constar en el informe
  del ciclo y en la descripción de los PR existentes.

## Ciclo: puntos sobre el mapa y orden manual

- Origen, paradas y destino ofrecen un selector cargado solo al abrirlo. Puede
  tocarse el mapa o desplazarse con teclado y elegir el centro. El punto requiere
  confirmación explícita; cancelar conserva el valor previo del formulario.
- La dirección inversa se consulta con debounce y cancelación de respuestas
  anteriores. Las coordenadas elegidas nunca se reemplazan por las de un edificio
  cercano; si falla el proveedor, se pueden confirmar las coordenadas.
- El mapa conserva atribución visible de OpenStreetMap y utiliza su URL HTTPS
  recomendada. Solo carga las teselas de la vista interactiva; no ofrece descarga
  masiva ni mapas offline. Política: https://operations.osmfoundation.org/policies/tiles/
- Las paradas se pueden subir o bajar con controles de teclado y táctiles. Se
  conservan sus identificadores y puntos confirmados. Los extremos se deshabilitan.
- Reordenar desactiva la optimización automática e invalida el resultado anterior.
  Editar los puntos, vehículo o preferencias cancela cualquier cálculo pendiente;
  una respuesta tardía ya no puede sustituir el recorrido actualizado.
- Pruebas: selector real React/Leaflet en DOM simulado, confirmación explícita,
  respaldo por coordenadas, controles de orden y un flujo del planificador que
  comprueba el payload y descarta una respuesta tardía. Autenticación/proveedor de
  ese flujo son fixtures; no equivalen a una cuenta ni a una ruta reales.
- Archivos principales: MapLocationPicker.tsx, RouteStops.tsx, LocationInput.tsx,
  RouteMap.tsx, page.tsx, locations.ts, route-stops.ts y map-config.ts.
- Se corrigieron los enlaces de navegación para usar coordenadas confirmadas y
  la sintaxis documentada de Maps URLs. Los recorridos largos se dividen en tramos
  consecutivos con hasta tres paradas intermedias para navegador móvil, sin omitir
  puntos. Los enlaces no transmiten dimensiones o pesos de camiones y la interfaz
  lo indica. Referencia: https://developers.google.com/maps/documentation/urls/get-started

## Prioridades siguientes

| Prioridad | Trabajo | Estado |
| --- | --- | --- |
| P0 | Arranque/API, errores de conexión y búsqueda | Reparados; conservar regresiones |
| P1 | Ubicación actual como origen | Implementada; pendiente validación en Android físico |
| P1 | Elegir origen, paradas y destino directamente en el mapa | Implementado; prueba de producción en este ciclo |
| P1 | Reordenar paradas manualmente | Implementado y probado |
| P1 | Exportar recorridos | Pendiente |
| P1 | Historial reciente y favoritos con controles de privacidad | Pendiente |
| P1 | Pruebas autenticadas completas de cuenta, rutas, flotas y aislamiento RLS | Parcial; falta fixture de cuenta de prueba |
| P1 | Rate limiting por cliente detrás del proxy | Revisar separación entre usuarios sin confiar en cabeceras falsificables |
| P2 | Caché acotada, deduplicación de búsquedas y estados accesibles de teclado | Pendiente |
| P2 | Mapa como elemento principal, tema claro/oscuro y revisión Android | Pendiente |
| P2 | Evitar peajes/autopistas, alternativas y preferencias verificadas del proveedor | Pendiente |
| P3 | Compartir enlaces con autorización y caducidad | Pendiente |
| P3 | Ejes, tipos de carga, restricciones locales y navegación avanzada | Pendiente |

La optimización actual solo se ofrece para reparto. Para camiones se mantiene el
orden indicado y se envían dimensiones y pesos al perfil HGV. No hay garantía de
cobertura legal o de restricciones completas en México; no se anunciará una ruta
como segura/legal sin datos suficientes. Distancia, tiempo y restricciones son
objetivos distintos y no se ofrecerán como equivalentes.

## Recuperación

Antes del ciclo del selector, la Web estable era d776d811, deployment
dpl_CpW77X96bYdf1x5FgtmyNYjLc2mR. La API sigue en af3d346, deployment
dpl_5DpVxmL7RP4wL3j896aSyonCVNVS; este ciclo modifica únicamente la Web.

Antes del ciclo GPS, la versión Web estable era el commit d9f0089, deployment
dpl_3M7ibEJNRc3Qc4JKDuTNeFemChAU. La API estable era d1af364, deployment
dpl_33hVvwq58edHnvTwvYav6G3kUCCV. Se conservan ambos despliegues y el historial Git.
Puede restaurarse cada despliegue por separado dentro de su proyecto de Vercel.
Este ciclo no modifica tablas ni datos de usuarios, por lo que no necesita una
reversión de datos. Restaurar una versión con dependencias antiguas también
restauraría sus avisos de seguridad; se prefiere corregir hacia adelante.

## Ciclo: operación de reparto, vehículos y manifiesto

- Causa de resultados lejanos: el cliente no enviaba punto de referencia y la
  API no usaba focus de Pelias/Photon. Se propaga el origen, se ordenan resultados
  por distancia geodésica y se distingue esa distancia del recorrido por carretera.
  Si el texto nombra la ciudad de una sucursal, su localidad prevalece sobre la
  cercanía al origen. Una ciudad tras coma o «en» desactiva el sesgo del origen.
- Sucursales: se mantienen sus coordenadas y Plus Codes; el mapa muestra el punto
  de referencia y permite corroborar el acceso. No se inventan tiendas ausentes
  del índice. Si no hay coincidencias dentro de 50 km se informa expresamente.
- La API conserva resultados hasta 60 segundos en memoria, con un máximo de
  200 entradas, sin persistir búsquedas privadas ni registrarlas en las URL del log.
- Mi perfil permite guardar el nombre del operador. Iniciar sesión ya no
  sobrescribe ese nombre con la parte inicial del correo.
- Mis vehículos admite reparto, automóvil y camión, edición, flotas opcionales
  y selección directa en el planificador. Las dimensiones del camión se validan.
  Se corrige la omisión de vehicle_id al guardar una ruta. Los parámetros usados
  se conservan también en route_metadata para no alterar el cálculo histórico
  al editar después el vehículo.
- Eliminar rutas es una operación recuperable con status=archived. La papelera
  conserva los hijos route_stops y ofrece recuperación. Las consultas filtran
  dueño y estado; la lista carga más páginas cuando hay más de 20 recorridos.
- El manifiesto admite foto y texto. Tesseract.js 7.0.0 realiza OCR local en español
  con un worker y descargas públicas bajo demanda. Se limita tamaño y tiempo de
  lectura, hay cancelación y no se conserva la imagen. No se automatiza una
  confirmación geográfica a partir de OCR: cada entrega exige selección explícita.
  La revisión secuencial evita disparar 30 geocodificaciones simultáneas.
- Verificación: 30 pruebas Web y 18 API, TypeScript, compilación de producción y
  auditoría de dependencias. Pruebas de componentes ejercitan alta/edición de
  unidad, papelera/recuperación, sesgo geográfico y rechazo de entregas sin confirmar.
- OCR real: una imagen sintética con dos entregas fue leída con el modelo español;
  reconoció Calle Cedro 312 y Avenida Universidad 100, con confianza global 95.
  Esta cifra pertenece a la imagen sintética; no garantiza exactitud en fotos reales.
- Supabase: prueba transaccional real con rol authenticated, inserción de unidad,
  vínculo a ruta, archivo, conservación de paradas, recuperación y rechazo de
  lectura/escritura desde otro uid. La transacción completa terminó en ROLLBACK.
  No se migró el esquema ni se modificaron datos existentes.
- Límites pendientes: prueba con cámara y fotos reales de manifiestos de Android,
  PDF, tablas complejas y flujo de cuenta autenticada completo desde navegador.
  Las pruebas DOM y SQL no se presentan como E2E con una sesión real.
- Recuperación previa a este ciclo: Web eb4b26c / dpl_4ZZ9VtWEQvgBtwJfzZJGjyeUnNTu;
  API af3d346 / dpl_5DpVxmL7RP4wL3j896aSyonCVNVS. El despliegue de API incorpora
  4012769, con prioridad por ciudad explícita y 18 pruebas aprobadas.

### Verificación de producción del ciclo

- Navegador real: foto sintética seleccionada mediante el control de archivos,
  OCR en español ejecutado en Web Worker y texto extraído visible. Se prepararon
  dos entregas, se corrigió el texto de prueba para consultar una sucursal real,
  se eligió una Bodega Aurrera Express de Monterrey y se importó como destino.
  El mapa mostró su marcador en 25.721274, -100.325989, con Plus Code preservado.
- Búsqueda real con origen Monterrey: sucursales ordenadas por distancia, desde
  aproximadamente 4.2 km. La consulta «Bodega Aurrera Chihuahua» devolvió una
  sucursal de la ciudad Chihuahua y desactivó la prioridad del origen Monterrey.
- Se redujo la descarga de rutas guardadas: el listado obtiene resúmenes; la
  geometría, instrucciones y restricciones completas se solicitan al cargar una
  ruta concreta. La consulta PostgREST usa el alias mode:route_metadata->>mode.
- Logs consultados del nuevo despliegue API: sin registros de nivel error/fatal
  en la ventana revisada. La validación de cámara Android sigue pendiente.
