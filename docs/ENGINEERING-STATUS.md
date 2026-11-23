# Route Planner — estado de ingeniería

Fecha de revisión: 2026-11-23. Alcance: exclusivamente Route Planner.

Estado vigente: Web 8de78c1 permite pegar enlaces de búsqueda compatibles de
Google Maps como propuestas de ubicación en origen, destino y paradas. Conserva
precisión y confirmación explícita; enlaces cortos, vistas/rutas o Place IDs
ambiguos no sustituyen el borrador. Sin descargar URLs ni nuevas dependencias.
Local build/typecheck, 207 pruebas, auditoría cero vulnerabilidades; CI pasó
40 casos de navegador y 11 flujos Auth locales con ORS sintético. Pegado y
preservación de punto comprobados en el navegador real de producción.

API runtime permanece en 6cb81f3. Main 17c9e01 sólo actualiza el reporte técnico;
API, proxy y GitHub sirven 2026-11-23T07:59:29.933Z, stale=false/overdue=false al
consultar, sin redespliegue o alteración de evidencia. La recuperación íntegra
CDMX/Puebla sigue bloqueada por 503 directo y 502 al abrir por buscador. No se
incorporaron reglas por inferencia: 15 municipios parciales y cero completos.
Cobertura Express incompleta; pendientes ORS autenticado alojado y Android físico.
Se mantienen mapa principal, GPS, perfiles, OCR, todas las entregas y enlaces
Google consecutivos. Google no recibe HGV ni fija trazado. Programa general abierto;
publicación, límites y rollback en el último cierre.

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
| P1 | Exportar recorridos | CSV, GPX y GeoJSON implementados; GPX validado con esquema oficial |
| P1 | Historial reciente y favoritos con controles de privacidad | 12 recientes por cuenta/dispositivo; favoritos privados en Supabase |
| P1 | Pruebas autenticadas completas de cuenta, rutas, flotas y aislamiento RLS | Parcial; falta fixture de cuenta de prueba |
| P1 | Rate limiting por cliente detrás del proxy | Revisar separación entre usuarios sin confiar en cabeceras falsificables |
| P2 | Caché acotada, deduplicación de búsquedas y estados accesibles de teclado | Pendiente |
| P2 | Mapa como elemento principal, tema claro/oscuro y revisión Android | Mapa principal y temas implementados; Android físico pendiente |
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

## Ciclo: sucursales reutilizables y exportación

- Se agregan recientes locales por cuenta, limitados a 12 puntos confirmados, con
  eliminación desde la interfaz. No se guardan imágenes del manifiesto, precisión
  GPS ni historial de consultas escritas sin confirmar.
- Los favoritos permiten un nombre operativo, coordenadas exactas y Plus Code.
  Se sincronizan mediante favorite_locations, con índices por dueño y políticas
  RLS USING/WITH CHECK. Los permisos públicos se restringen a SELECT/INSERT/UPDATE
  de authenticated; anon no accede y el cliente no puede borrar físicamente.
- Eliminar de favoritos archiva el registro. Un upsert del mismo punto recupera
  la sucursal sin duplicarla. Las listas de favoritos se cargan por páginas.
- Las ubicaciones guardadas se reutilizan sin volver a geocodificar. Abrir el
  selector local pausa la búsqueda externa hasta cerrarlo o elegir un punto.
- Exportaciones locales: CSV ordenado con protección contra fórmulas de hoja de
  cálculo, GPX 1.1 con nombres escapados y GeoJSON con coordenadas longitud/latitud.
  El trazado se añade únicamente si hay polilínea válida del proveedor. Los
  archivos advierten que no transfieren restricciones de camión a otro navegador.
- Verificación: 38 pruebas Web aprobadas más las 18 API conservadas; TypeScript
  y compilación de producción correctos. El GPX generado pasó el XSD oficial de
  Topografix. Se verificaron botones de descarga, favoritos/archivo/recuperación,
  reutilización sin solicitudes externas y limpieza de recientes.
- Supabase real: creación, archivo, upsert/restauración, aislamiento entre uid y
  ausencia de permiso DELETE comprobados en transacción terminada en ROLLBACK.
  Las migraciones son aditivas; no se eliminaron tablas ni datos existentes.
- Advisories: sin avisos nuevos de RLS. Sigue el aviso de protección de claves
  filtradas deshabilitada; no se activaron opciones de pago. Índices aún sin uso
  se conservan por ser nuevas rutas de acceso y claves foráneas.
- Pendiente: validar los favoritos con dos sesiones reales de navegador y probar
  sensores/cámara del Android físico. El test SQL no se presenta como ese E2E.

- Accesibilidad del buscador: semántica combobox/listbox, opción activa enlazada
  con aria-activedescendant y selección por flechas/Enter. Escape cierra la lista.
  El primer Enter elige una propuesta; el segundo confirma el punto, manteniendo
  la misma comprobación explícita disponible con ratón o pantalla táctil.

## Ciclo: guardado transaccional y reintentos

- Causa del riesgo: se guardaba primero saved_routes y después route_stops. Un
  fallo entre ambas llamadas podía dejar un recorrido sin todas sus entregas.
- save_route_with_stops crea la ruta y sus paradas en una sola transacción.
  Valida nombre, coordenadas, hasta ocho paradas, pertenencia del vehículo y
  límites de tamaño. Se ejecuta como SECURITY INVOKER y respeta las políticas RLS.
- El cliente conserva una clave de solicitud mientras el contenido no cambie.
  Un índice único por dueño/solicitud y la huella del contenido impiden duplicar
  recorridos al reintentar; reutilizar la clave con otro contenido da error.
- La interfaz ofrece nombre de recorrido y muestra errores de guardado completo.
  Se reemplazan las dos inserciones y la compensación por DELETE por una RPC.
- Se corrigieron claves React idénticas de los paneles perfil/rutas para una
  cuenta activa; el test de planificación autenticada ahora exige cero avisos
  de reconciliación al guardar y reintentar.
- Verificación: 42 pruebas Web y 18 API, TypeScript y build. La prueba de interfaz
  simula una conexión interrumpida y comprueba que el segundo intento conserva
  la clave y todas las paradas. La transacción real de Supabase comprobó orden,
  reintento sin duplicados, rechazo de contenido diferente, ausencia de datos
  parciales con un punto inválido y aislamiento entre uid; terminó en ROLLBACK.
- Las nuevas columnas permiten NULL para conservar compatibilidad con rutas
  anteriores. Revertir el frontend no requiere eliminar columnas ni registros.
- Navegador de producción del ciclo anterior: selección por flechas/Enter y
  reutilización de un reciente confirmadas, con coordenadas y Plus Code intactos.

## Ciclo: mapa principal de sucursales

- El mapa aparece antes del cálculo y muestra los puntos confirmados. La vista
  móvil lo coloca primero, y la cabecera se reduce para dar prioridad al trabajo.
- Solo el campo enfocado publica sus coincidencias al mapa. Los marcadores
  S1…S8 corresponden al orden del buscador. Su popup permite confirmar el punto
  como origen, parada concreta o destino sin volver a geocodificarlo.
- Un enlace desde los resultados lleva al mapa en móvil. Elegir un marcador
  devuelve el foco al campo y conserva coordenadas y Plus Code. Al calcular se
  desplaza la vista al resultado; antes no se dibujan líneas de carretera.
- La vista inicial prioriza el entorno del primer resultado para evitar que un
  homónimo de otro país aleje todas las sucursales. La lista conserva todas las
  propuestas y el usuario puede desplazar/acercar/alejar el mapa.
- No se reajusta la vista cuando llegan arrays nuevos con las mismas coordenadas.
  Una selección externa cancela una lectura GPS pendiente para que no la sustituya.
- Verificación: 48 pruebas Web, incluidas confirmación real del popup Leaflet,
  asignación al campo activo, coordenadas exactas en el enlace de navegación,
  exclusión de resultados lejanos de la vista inicial y cancelación del GPS.
  Se actualizan los selectores de la suite E2E al rol combobox; su ejecución móvil
  completa sigue pendiente en un host que pueda iniciar Chromium.

## Ciclo: verificación continua y trazabilidad

- Las dos PR de la base comprobada se integraron en main. Se verificó que los
  árboles resultantes son idénticos a los commits probados antes de publicarlos.
- Base Web en main: 226e94f / dpl_4CCnYX8VvjKKm5vxQYk2728oyvvJ (READY).
  Base API en main: 56b73a3 / dpl_F3fPH36gNgdAYMY2S9EXb5gNgRNZ (READY).
- Se añade CI con Node 26, permisos contents:read y acciones fijadas por SHA.
  Web incluye viewport móvil Chromium, GPS simulado y selección desde el mapa.
  API aplica las siete migraciones a Postgres 17 desechable y comprueba RLS,
  guardado completo, reintentos, favoritos y papelera con dos uid sintéticos.
- Se recuperan del historial alojado las cuatro migraciones iniciales para que
  el esquema completo quede en Git. No se vuelven a ejecutar en producción.
- Se elimina la animación de reajuste del mapa para estabilizar la selección
  inmediata de marcadores. Mapas/fuentes externos se aíslan solo en las pruebas.
- Primera ejecución de CI aprobada: Web run 42551716541 (48 pruebas y cinco
  E2E móviles); API run 42551690160 (18 pruebas y las siete migraciones con
  RLS en Postgres 17 desechable). Todos los pasos terminaron en success.
- Alcance de costo: runners estándar en repositorios públicos; sin runners
  grandes, artefactos de pago ni credenciales de producción en los jobs.


## Ciclo: interfaz de trabajo y cobertura para camiones

- Se sustituye la portada informativa por un espacio de trabajo: mapa principal,
  panel de entregas, navegación Planificar/Mis rutas/Vehículos/Guía camión y
  navegación inferior en móvil. Se conserva el borrador al cambiar de sección.
- Sistema visual coherente con colores, tipografía del dispositivo, tarjetas,
  estados de confirmación y controles táctiles. Sin fuentes remotas ni imágenes
  decorativas. Tema claro/oscuro con preferencia local y foco visible.
- El mapa conserva su selección y ajusta su tamaño al volver de otra sección.
  Los enlaces desde cuenta, buscador y vehículos llevan al espacio correcto.
- Guía dentro de la app: parámetros realmente enviados, límites de la cobertura
  OSM/ORS, norma federal vigente y comprobaciones municipales no implementadas.
  No se inventa una lista de calles evitadas ni una certificación de legalidad.
- Corrección de texto: el optimizador de reparto busca tiempo de viaje; no se
  presenta como optimización por distancia. El motor no cambia en este ciclo.
- Base de recuperación de producción antes de este ciclo: Web 226e94f y
  deployment dpl_4CCnYX8VvjKKm5vxQYk2728oyvvJ; API 56b73a3.
- Validación local: 48 pruebas Web aprobadas y TypeScript sin errores. Se añaden
  dos E2E para navegación móvil/tema persistente y mapa principal de escritorio.
  Build de producción aprobado. CI del rediseño ca6c746 aprobado: run 42553186583, 48 pruebas y siete E2E
  móviles/escritorio. Sin vulnerabilidades de producción reportadas por npm.
  Se unifica también el icono PWA y el color de la barra del navegador.
  Verificación visual de producción: pendiente de publicar.
- Pendiente del programa general: prueba autenticada completa en navegador,
  lectura de PDF, preferencias/alternativas, compartir enlaces y validación de
  normativa municipal. No se declara completo el prompt maestro.

## Ciclo: lectura local de manifiestos PDF

- Base comprobada: main 32f816d; producción Web dpl_3kiPnsKRZiVGWQSNpa5uE639AoxT.
  Se revisó el avance de la otra conversación; el rediseño, exportaciones y
  favoritos ya estaban implementados y no se volvieron a introducir.
- Se añade PDF.js 6.5.438 fijado y cargado solo al elegir un PDF. El worker,
  fuentes y decodificadores se publican desde la misma Web mediante prebuild /
  predev, con versión coincidente y licencia. No hay servicio OCR de pago.
- Extrae texto respetando páginas, líneas y fragmentos contiguos de números.
  Las páginas sin texto se renderizan localmente y pasan por el OCR español
  existente; también se puede forzar OCR para PDFs con capas de texto incompletas.
- Hasta 20 MB, diez páginas seleccionadas y 30.000 caracteres por lectura.
  No se omiten silenciosamente páginas ni texto excedente; se pide dividir el
  rango. Límite global de tres minutos, cancelación y limpieza de worker/canvas.
- Se conservan controles separados para foto/cámara y PDF, para no mezclar
  filtros de archivo que pueden ocultar la opción de cámara en Android.
- El archivo no se sube ni se guarda. Las direcciones solo llegan al proveedor
  al revisarlas en el buscador; cada sucursal aún exige confirmación explícita.
  Leer otro archivo o editar el texto invalida candidatos preparados anteriores.
- Pruebas añadidas: PDF sintético real de dos páginas, rango elegido, límites,
  cancelación, archivo dañado, detección de página escaneada y conservación de
  números. E2E móvil adicional para el worker real, ausencia de cargas del
  documento, direcciones propuestas y confirmación obligatoria.
- CI final 42572681513 aprobado sobre 0c474912: 55 pruebas y nueve E2E
  móvil/escritorio, TypeScript, build y auditoría de producción sin avisos.
  Incluye PDF de dos páginas y PDF escaneado con OCR español real; este último
  reconoció Cedro 312 y Universidad 100 en 2,65 segundos de prueba sintética.
  Ese resultado no garantiza exactitud en fotos o manifiestos reales.
- PR #3 integrada en main ec3c939. Su árbol c3f2f874 coincide con el probado.
  Producción READY: dpl_HjKKP66A1Hw17Cf3GBzfYNdUUF2P, servido en el dominio
  estable https://route-planner-web-sand.vercel.app. Se conservaron las versiones
  anteriores. El registro posterior a la publicación solo modifica esta documentación.
- La comprobación manual del selector de archivos agotó la espera del navegador;
  no se presenta esa prueba manual como aprobada.
  Preview local no disponible: el lanzador añade opciones Vite incompatibles
  con Next.js (--host/--strictPort). No se modifica la app para compensarlo.
- Recuperación: restaurar el deployment anterior; no se cambia API ni base de
  datos, no se toca Gestión y no se contratan recursos.
- Siguen pendientes del programa general: preferencias/alternativas, enlaces
  compartidos autorizados, verificación municipal y validación de sensores,
  cámara y manifiestos reales de Android. El prompt completo original no fue
  recuperable en las búsquedas; no se declara terminado ni se desactiva la tarea.

### Siguiente punto de reanudación

Revisar primero los cambios no publicados de integración autenticada que siguen
en la copia anterior de trabajo (test/integration y .github/workflows/checks.yml);
este ciclo no los alteró ni los presenta como aprobados. Después continuar con
preferencias/alternativas del proveedor y el resto del programa. No repetir el
rediseño, favoritos, exportación ni lector PDF, que ya tienen implementación.

## Ciclo: dirección numerada y límites de navegación externa

- Se reprodujo una consulta numerada en Monterrey en producción: el índice devolvía calles, colonia y otros lugares, sin acreditar
  el número 202. Sus Plus Codes correspondían a esos puntos aproximados.
- La API usa búsqueda completa para direcciones con número, conserva el número
  reportado por el proveedor, consulta el índice alternativo si falta y prioriza
  coincidencias numéricas antes de deduplicar puntos cercanos. No inventa portales.
- La interfaz distingue número reportado, otro número y propuesta aproximada.
  Ofrece corregir en el mapa y buscar el texto original en Google Maps. El cálculo
  con una dirección escrita no confirmada devuelve 422 si no se encontró su
  número, en vez de elegir automáticamente el centro de una calle.
- Google Maps recibe puntos y recalcula; no recibe el trazado ORS, las dimensiones
  HGV ni permisos. Se refuerza el aviso en la interfaz. No se vende como transferencia
  exacta agregar puntos intermedios ni exportar GPX.
- Guía camión enlaza el reglamento oficial de Monterrey, arts. 37–45 y anexos 1–3.
  La aplicación no verifica automáticamente esos anexos, itinerarios y permisos.
  No se crea un supuesto mapa de calles legales a partir de nombres sin geometría.
- Se mantienen los puntos y Plus Codes confirmados, GPS y selector de acceso.
  No se modifican datos, políticas, credenciales ni proyectos de Gestión.
- Verificación: API CI 42574876174 aprobado (23 pruebas y migraciones/RLS
  en Postgres desechable); Web CI 42575333319 aprobado (56 pruebas y diez E2E
  móvil/escritorio, TypeScript, build y auditoría). El primer E2E seleccionaba
  una opción del vehículo; se acotó al listbox de direcciones y aprobó.
- Publicación: API main e2ce88c / dpl_C9o2TsjTV31oFvuF2nCWGgvuRddz;
  Web main f154164 / dpl_CCdQMKi2ofGCJSmPxXGeuoRqgEEv. Los árboles integrados
  coinciden con los probados. Se mantienen los despliegues de recuperación.
- Recuperación previa: Web ec3c939 / dpl_HjKKP66A1Hw17Cf3GBzfYNdUUF2P;
  API bdd9b8f / dpl_G4cdPmeFmqtgMToTE9tNeN6vC8Ao.

- Las nuevas fixtures usan una dirección ficticia, sin conservar el domicilio
  reportado. La comparación real con Photon/Komoot quedó bloqueada por revisión
  automática de permisos; no se reintenta ese envío por otra vía.

## Ciclo: navegación del trazado y directorio municipal de México

Fecha: 2026-11-09. Base Web 5637925, API e2ce88c. Se usan ramas y copias de trabajo
separadas; no se alteró el trabajo de integración autenticada de la copia anterior.

- Navegación GPS interna, guía por índices reales de geometría, voz opcional,
  aviso de desvío sin recálculo, pausa en segundo plano y limpieza de sensores al
  detener/cambiar sección/cuenta/ruta. No equivale a ensayo con Android físico.
- Catálogo oficial INEGI: 32 entidades, 2,478 municipios/demarcaciones; consulta
  de cobertura y fuentes dentro de Guía camión. Monterrey: 38 tramos de red
  troncal y 19 registros de horarios conservados de anexos oficiales. No se
  aplican como exclusiones sin geometría y validación de interpretación/vigencia.
- Cada ruta declara que aún no tiene verificación municipal completa. No se
  confunde catálogo nacional con cobertura legal. Falta la mayor parte del
  programa municipal nacional y no se desactiva la tarea de continuidad.
- Alcance, reproducción de fuentes, contratos y siguiente trabajo documentados
  en MEXICO-COVERAGE.md. No se reintenta la consulta privada bloqueada a Photon.
- Verificación aprobada: API CI 42579427363 (28 pruebas, migraciones y RLS en
  Postgres desechable, auditoría sin avisos); Web CI 42579430457 (64 pruebas,
  TypeScript, build, 13 E2E sin omisiones y auditoría sin avisos). Los E2E nuevos
  prueban seguimiento/desvío sin recálculo, salida de sección y consulta municipal.
  El navegador local no pudo crear sockets; los E2E sí se ejecutaron en CI.
- Integradas API PR #4, main dfd0ba97 y Web PR #5, main a2e9f3b4. Los árboles
  integrados coinciden exactamente con los probados.
- Producción READY API dpl_2JuLhYpEBh6eAw6dP4pYaNZvmvuT y Web
  dpl_33io4jAbSRksQdeufrZEvEni35kw, con sus dominios estables asignados.
  HTTP 200 en Web, salud API directa y por proxy, catálogo 32/2478, Monterrey
  38/19 y municipio sin reglas con estado not_loaded. No se ejecutó un cálculo
  autenticado real ni ensayo de navegación física; sus pruebas usan fixtures.
- Rollback conservado: API dpl_C9o2TsjTV31oFvuF2nCWGgvuRddz (e2ce88c)
  y Web dpl_CCdQMKi2ofGCJSmPxXGeuoRqgEEv (f154164).
- La tarea existente «Completar Route Planner» se encontró pausada. Se reactivó
  conservando su intervalo de cinco horas y añadiendo estas solicitudes posteriores;
  no se creó otra tarea ni se declaró finalizado el programa.
- No hay migraciones de producción, cambios a Gestión ni contrataciones.
  Este registro posterior a publicación solo actualiza documentación.

### Punto de reanudación vigente

Leer primero MEXICO-COVERAGE.md y este último ciclo; verificar ramas principales,
despliegues y tarea activa antes de editar. No repetir navegación, directorio,
lector PDF, rediseño, favoritos ni exportaciones ya publicados. Siguiente trabajo:
validar vigencia/interpretación y georreferenciar restricciones de Monterrey por
sentido; identificar municipios cruzados y luego aplicar reglas comprobadas al
motor. El catálogo de 2,478 municipios todavía no equivale a reglas incorporadas.
Seguir con fuentes oficiales del resto de México y posteriormente otros países;
nunca prometer ausencia de inconvenientes de vialidad ni transferencia exacta a
Google Maps. Pendientes generales: Android físico, pruebas autenticadas reales de
aislamiento, preferencias/alternativas y enlaces autorizados. La tarea periódica
sigue siendo necesaria; no declarar completo ni desactivar por cerrar este ciclo.

## Ciclo: municipios cruzados por cada trazado

Fecha: 2026-11-09. Base Web ec41d6b, API dfd0ba97. Se comprobaron primero
`main`, ramas remotas y despliegues READY; no había un avance concurrente nuevo.

- Se incorporan límites de las 2,478 áreas geoestadísticas municipales desde el
  servicio vectorial oficial de INEGI. El metadato reporta Marco Geoestadístico
  de diciembre de 2025. El generador verifica correspondencia exacta con el
  catálogo y produce un índice local compacto; no consulta INEGI al calcular.
- Cada polilínea se intersecta con municipios y devuelve orden aproximado, clave,
  entidad y estado de cobertura. La simplificación usa tolerancia de 0.0005°
  (aproximadamente 56 m), se muestra al usuario y puede ser incierta en límites.
  El benchmark sintético de 1,001 puntos tardó cerca de 32 ms en esta ejecución.
- El resultado de camión muestra «Referencia cargada» o «Reglas pendientes» por
  municipio. Sigue declarando `not_verified` y `municipalGeometryEnforced=false`;
  no convierte límites administrativos ni nombres de vialidades en permisos.
- Se revisó la fuente consolidada de Monterrey: contiene la reforma publicada el
  24 de abril de 2026 y mantiene artículos 37–43 y anexos 1–3. La contradicción
  entre artículo 39 (lunes a viernes) y filas de fin de semana de los anexos se
  conserva como revisión pendiente; no se aplica automáticamente.
- Validación final: API CI 42602482170 aprobó 30 pruebas, build, migraciones/RLS
  en Postgres desechable y auditoría; Web CI 42602416228 aprobó 67 pruebas,
  TypeScript, build, 13 E2E sin omisiones y auditoría. Cero vulnerabilidades.
- Integradas API PR #5, main 32e8a497, árbol 839542ab; Web PR #6, main
  48b585c8, árbol 7ae2e76d. Los árboles integrados coinciden con los probados.
- Producción READY: API dpl_AeaEHucyAEh4icPdHU8MQt4NsG8B y Web
  dpl_A1eWvcovWY94jV4nAjrdW6S9vNs7. Salud, catálogo 2,478 y referencia Monterrey
  38/19 respondieron 200 por el proxy; el metadato consolidado muestra 2026-04-24.
  No hubo errores de runtime agregados en la hora revisada. No se ejecutó un
  cálculo con una cuenta real ni una prueba física de camión/Android.
- Rollback conservado: API dpl_2JuLhYpEBh6eAw6dP4pYaNZvmvuT y Web
  dpl_33io4jAbSRksQdeufrZEvEni35kw. Sin migraciones de producción ni cambios a Gestión.

### Siguiente punto de reanudación de este ciclo

Georreferenciar por sentido los 38 tramos de
Monterrey y determinar qué artículos pueden convertirse en restricciones del
motor sin interpretar indebidamente excepciones, permisos o señalización.


## Ciclo: ampliar entregas y conservar el orden en Google Maps

Solicitud posterior del propietario, 2026-11-09. Se verificaron primero main y
producción vigentes (Web c16c3ac, API 32e8a497); se conservan todos los avances
municipales, navegación GPS y PDF. El borrador de pruebas Auth previo queda en
la rama test/authenticated-flow, sin incorporarlo ni sobrescribir CI vigente.

- Se elimina el límite artificial de ocho: 48 paradas intermedias más ambos
  extremos, en línea con los 50 puntos de Directions. Se ajustan formulario,
  importación, API y RPC atómica de guardado con una migración reversible.
- El manifiesto conserva todas las propuestas del texto acotado, sin truncar
  silenciosamente a treinta. Solo se importan puntos confirmados y con cupo.
- Google Maps ofrece máximo de nueve intermedias y compatibilidad de tres para
  navegador móvil. Los tramos comparten el extremo y mantienen todo el orden,
  incluidos recorridos de cincuenta puntos y direcciones largas por URL.
- Se conserva el aviso de que Google recalcula y no transmite restricciones
  del camión. No se promete transferencia del trazado ni paradas ilimitadas.
- Pruebas nuevas: API de cincuenta puntos/rechazo de cincuenta y uno; SQL de
  48 paradas, reintento, orden y rechazo sin escritura parcial; enlaces en
  ambos modos, longitud URL, guardado y manifiesto extenso; móvil con doce
  entregas y cambio de capacidad de Google.
- Validación local: API 32 pruebas y build; Web 73 pruebas, TypeScript y build
  aprobados. Migración 20261109171027 aplicada en Route Planner conservando
  privilegios. CI API 42662271514 y Web 42662895443 aprobados: 32 y 73 pruebas,
  ocho migraciones/RLS en Postgres desechable, TypeScript, build, 14 E2E sin
  omisiones y auditorías sin vulnerabilidades conocidas.
- Recuperación anterior: Web dpl_A1eWvcovWY94jV4nAjrdW6S9vNs7 y API
  dpl_AeaEHucyAEh4icPdHU8MQt4NsG8B. La migración solo cambia el máximo de la
  función invoker existente, sin eliminar datos ni ampliar privilegios.


### Cierre de publicación de más entregas

- Web PR #7 integrada, main b0b6949d, árbol 78c9b696; API PR #6 integrada,
  main 967cef4c, árbol 1e923988. Ambos árboles coinciden con los comprobados.
- Producción READY: Web dpl_8MqVo364dxPMbc6aixeap9Npa42f y API
  dpl_AyMGxz2xbFXzS93aUJP3eoBfvZgJ. Alias y SHA de cada despliegue verificados.
- Navegador real en producción: doce paradas añadidas; el modo de nueve conserva
  los catorce puntos en dos enlaces y el modo de tres en cuatro enlaces, con
  continuidad exacta hasta el destino. Google Maps Web cargó un enlace real
  con origen, nueve intermedias y destino (once puntos, máximo reconocido).
- API de producción a través del proxy: validate de 48 paradas responde 200;
  49 responde 400 antes de consultar cartografía. La transacción real de
  Supabase comprobó 48 puntos intermedios, orden, reintento sin duplicado,
  rechazo de 49 y RLS; terminó en ROLLBACK sin dejar registros de prueba.
- En el primer E2E falló la selección por nombre accesible del nuevo control.
  Se corrigió su aria-label y la segunda ejecución aprobó los catorce E2E,
  incluida la reconstrucción de doce entregas en ambos modos. No se omitió
  ni debilitó la prueba.
- No se ejecutó un cálculo autenticado de 48 paradas con ORS real ni la app
  nativa Android; esos puntos permanecen pendientes. No se afirma ruteo
  ilimitado ni transferencia de restricciones de camión a Google Maps.
- No se registraron errores/fatal de funciones en las ventanas revisadas de
  ambos despliegues después de la comprobación de producción.
- Solo se modificaron recursos identificados de Route Planner; Gestión no se
  tocó. No se habilitaron gastos. Las rutas previas y sus datos se conservan.

### Próxima reanudación

Esta solicitud está completada. Retomar las reglas de Monterrey por sentido y
las pruebas autenticadas completas de cuentas, vehículos y rutas sin usar
credenciales del propietario ni datos de producción. La rama antigua
`test/authenticated-flow` es solo un borrador: portar/revisar sus pruebas sobre
main actual; no fusionarla en bloque ni restaurar su versión antigua del producto.
Continúan pendientes Android físico, preferencias/alternativas y enlaces
autorizados del programa general. No desactivar la tarea periódica todavía.
Este cierre solo actualiza documentación después de los despliegues citados.


### Publicación: directorio nacional y puntos guía · 9 de noviembre de 2026

**Estado:** avance desplegado y comprobado. El requisito de Google exacto/legal
para camión en México y la incorporación completa de las normas de todos los
municipios siguen pendientes. No se declara terminado el prompt maestro.

Problemas y causas: el recuadro de Monterrey estaba escrito directamente en
TruckGuide y el directorio iniciaba con estado 19/municipio 19039. Se retiró el
recuadro y la preselección; el orden por clave INEGI se reemplazó por orden
alfabético antes de paginar. Google Maps URLs no recibe la polilínea ORS ni
atributos HGV: añadir puntos no bloquea su motor. El producto Large Vehicle
Routing de Google declara cobertura en EE. UU. continental/Japón y requiere
provisionamiento; no resuelve México ni la app de Google Maps del conductor.

Cambios publicados:

- Directorio de 32 entidades/2,478 municipios, sin favorito geográfico.
- Referencias parciales para 13 municipios: Monterrey, nueve del AMG, Juárez,
  Guachochi y Cuauhtémoc (sólo perímetro A). Ámbitos, clases de vehículo,
  horarios, fuentes y dudas de vigencia explícitos. Cero municipios cuentan
  con validación legal automática completa. No se inventaron geometrías.
- Puntos guía sobre la polilínea de ORS, 25 m tras maniobras y cada 1.5 km;
  entregas exactas y orden conservados, también en bucles/repeticiones.
  Validación del mapeo de cada entrega antes de habilitar guías. Enlaces
  Google de 9/3 intermedias, límite de longitud y tramos con extremos comunes.
  Opción para quitar guías y aviso de que Google puede escoger otras calles.
- Monitor de cinco fuentes oficiales programado cada seis horas, con hashes,
  última descarga correcta, cambios y fallos. No modifica reglas legales.
  Primera ejecución en main: 791f16fec55da7b38aba53c803480c05d12fdd6a,
  comprobada 2026-11-09T19:04:47Z. El reporte se lee con caché de 15 min y
  fallback local, sin otro despliegue. GitHub puede retrasar el horario.
  La ejecución alojada marcó CDMX y Juárez no disponibles; mantiene evidencia
  previa de Juárez. No oculta fallos como vigencia verificada.

Archivos modificados, Web: app/page.tsx y globals.css; components/TruckGuide,
MunicipalCoverage, NavigationLinks y OfficialSourceMonitor; lib/navigation,
routes y google-route-guides; test/geolocation.e2e, fixtures/route-navigation,
google-route-guides y official-source-monitor; docs/ENGINEERING-STATUS y
MEXICO-COVERAGE. API: index.js; lib/municipal-regulations y source-monitor;
data/mx/national-references y source-status; scripts/check-official-sources;
.github/workflows/official-sources; pruebas municipal-regulations, routing y
source-monitor; docs/MEXICO-COVERAGE. Extensiones originales se conservan.

Validación: 39 pruebas API y 78 pruebas Web; TypeScript, build y auditorías sin
vulnerabilidades conocidas. CI API 42679587996 aprobó las ocho migraciones y
RLS en Postgres 17 desechable. CI Web 42679730901 aprobó los 15 E2E móviles,
incluidos orden del directorio, guías y cambio a sólo entregas. No se desactivó
el límite de solicitudes para probar; un caso de prueba nuevo usa una IP de
fixture distinta para no consumir el presupuesto de otros casos.

API PR #7 y Web PR #8 integradas. Producción READY y alias comprobados:

| Servicio | Commit desplegado | Despliegue |
| --- | --- | --- |
| API | dae18342d45d5a8538e405e4c1f41b9e20282b1a | dpl_5hchiEtfQuAtHYu16ue6Rrw9F67L |
| Web | b500f3695c9561a2d27eb487199833476a8bfd33 | dpl_ABriiPZmhs6qdnPqqcgBqzUvzVHg |

https://route-planner-web-sand.vercel.app/
https://route-planner-api.vercel.app/

En producción, a través del proxy del mismo origen, se comprobaron catálogo,
coordenadas decimales y Plus Code completo (200, una ubicación en cada caso).
La búsqueda Bodega Aurrera Express con foco público de prueba en Chihuahua
respondió 200 con ocho sugerencias, pero fuera de 50 km: devolvió
NO_NEARBY_MATCHES. No se afirma que existan coincidencias locales precisas;
queda P1 revisar cobertura de POI/proveedores y confirmación en mapa.

También se comprobaron endpoints de catálogo, orden/paginación,
Guadalajara, Guachochi, Cuauhtémoc y reporte actualizado. Navegador real:
recuadro retirado, selector inicial vacío, estados alfabéticos, municipios de
Jalisco ordenados, fuente y cuatro reglas específicas de Guadalajara con su
ámbito. El seguimiento muestra fechas y fallos actuales. No se encontraron
clusters de errores runtime ni logs error/fatal en ambos despliegues durante
la ventana revisada. No se ejecutó cálculo autenticado con ORS real ni prueba
de navegación en carretera con la app nativa Android; los E2E usan fixtures.

Recuperación: Web dpl_8MqVo364dxPMbc6aixeap9Npa42f (b0b6949d), API
 dpl_AyMGxz2xbFXzS93aUJP3eoBfvZgJ (967cef4c). No hay migración nueva de base
de datos ni cambio de privilegios, planes, dominios o credenciales. Sólo se
mutaron recursos de Route Planner; Gestión y demás proyectos no se tocaron.
El historial git conserva reglamentos y reportes. Este cierre documental no
cambia el código que ya se verificó en producción.

Próxima prioridad: obtener vigencia y geometrías/sentidos legales de las
jurisdicciones con entregas reales, modelar sus excepciones y permisos y probar
exclusiones antes de activarlas. Completar el resto nacional y nuevas
publicaciones sigue abierto; el monitor no encuentra todos los acuerdos ni
asegura ausencia de multas. Conservar pruebas autenticadas y Android físico
como pendientes. La rama antigua test/authenticated-flow es un borrador;
portar/revisar sus pruebas sobre main actual, nunca fusionar su producto viejo.

### Ciclo de búsqueda cercana · 10 de noviembre de 2026

Solicitud: iniciar ahora y retomar después sin perder avances verificados.
Automatización habilitada con siguiente inicio a las 06:57 de America/Chihuahua
el 10 de noviembre, seguida de intervalos de cinco horas. El horario no reinicia
cuotas ni garantiza cinco horas continuas de ejecución.

Se diagnosticó que una coincidencia cercana de Pelias impedía consultar otras
sucursales de Photon. Las pruebas públicas con Monterrey muestran candidatos
adicionales con calle al buscar en una zona acotada. También se detectó mezcla
de ciudades lejanas cuando sólo había unas pocas coincidencias cercanas.
Cambios en preparación: consulta local paralela, respeto al formato Express,
deduplicación por dirección, caché compartida de consultas en curso, validación
de coordenadas y confirmación de acceso. Alcance y límites en
API/docs/GEOCODING.md. La cobertura municipal nacional y Google exacto/legal
siguen pendientes; este ciclo no altera sus estados ni cambia reglas legales.
Validación cerrada: API 48 pruebas y CI 42780756573 con ocho migraciones/RLS
en Postgres desechable; Web 79 pruebas, TypeScript, build y 16 E2E móviles
en CI 42780760990. Auditorías sin vulnerabilidades conocidas.

Producción READY comprobada: API PR #8, f5c36390dbeffa34d8cc8a01a1c05b9121005a1a,
dpl_KFWWLr4B8t7oThu5pDeVxyfk5FGH; Web PR #9,
261c8c7428b2f054b69d06f56577f6713dedd4f5,
dpl_7yofWu6n5oWzKT64Jdr6NECq2biW. Los alias conservan las URLs públicas
anteriores. Sin cambios en Supabase, privilegios, claves, planes o Gestión.
Rollback: API dpl_5hchiEtfQuAtHYu16ue6Rrw9F67L, Web
dpl_ABriiPZmhs6qdnPqqcgBqzUvzVHg.

Comprobación real por el proxy: Express en Monterrey devolvió ocho puntos,
todos con calle, a 4.9–8.8 km del origen público de prueba; antes devolvía
cinco sin esas calles. La búsqueda genérica en Chihuahua devolvió cuatro
puntos a 3.4–11.8 km, sin rellenar con otras ciudades. Express en Chihuahua
sigue sin coincidencias locales del índice y muestra NO_NEARBY_MATCHES;
no se afirma ausencia real de sucursales ni cobertura exhaustiva.

Navegador real de producción: origen por coordenadas, ocho sugerencias de
Express ordenadas y representadas en el mapa, aviso de acceso antes de confirmar,
etiqueta y Plus Code conservados. El enlace Google usa las coordenadas exactas
de la sucursal elegida. No se ejecutó navegación en carretera ni cálculo
autenticado contra ORS real. La normativa nacional y la transferencia exacta
a Google continúan sin resolver. Próxima labor: portar sobre main actual las
pruebas locales de Auth/REST y aislamiento de cuentas; no fusionar el producto
antiguo de test/authenticated-flow. Este cierre sólo modifica documentación.


### Integración real de cuentas y rutas · 10 de noviembre de 2026

**Completado y publicado este ciclo:** pruebas con Auth, PostgREST, RPC y RLS
reales en un stack local desechable, además de nombres accesibles explícitos
para tipo y flota de vehículo. No hay cuentas nuevas ni migraciones aplicadas
en Supabase alojado; Gestión y los demás proyectos permanecen sin modificaciones.

Se portaron solamente los archivos revisados de test/authenticated-flow sobre
main actual, sin fusionar su aplicación antigua. La API de CI está fijada en
f5c36390dbeffa34d8cc8a01a1c05b9121005a1a. El CLI 3.0.0 se instala con un
package/lockfile separado. Se revisó el cambio oficial de CLI v3 del 4 de
noviembre: configuración local_smtp y comandos sólo locales. El bootstrap
rechaza URL fuera de loopback y claves que no sean publicables/anon. Las
credenciales locales se enmascaran; no se usa service_role en el navegador.

Resultados: CI 42783891544 aprobado, 79 pruebas Web, 16 E2E móviles y dos
integraciones genuinas con cuentas locales. Se comprobaron creación de cuenta
y perfil persistente, flota, vehículo y medidas HGV, cálculo por navegador →
proxy → API con bearer real, favoritos, guardado, archivo/papelera, recuperación
y carga, optimización de reparto y separación de cuentas. La otra integración
registra sus propios usuarios y comprueba 48 entregas por API/REST, orden de
puntos, guardado atómico, reintento sin duplicados, rechazo de 49 sin escritura
parcial y bloqueo de cambio de propietario. Los contenedores se detuvieron
correctamente después de la prueba. Auditorías de la Web y del lockfile del
CLI de integración: cero vulnerabilidades conocidas. No se encontraron errores
runtime en la ventana de producción revisada después de publicar ambos ciclos.

Las primeras ejecuciones detectaron una espera heredada por un aviso transitorio
y un selector cuyo nombre accesible incluía todas sus opciones. Se sustituyó
la espera por respuesta Auth y perfil persistente; se corrigió el selector
real del producto y se separaron las cuentas de la prueba de persistencia para
no confundir un fallo de interfaz con un fallo de credenciales. No se omitieron
pruebas ni se cambiaron resultados esperados para permitir errores de negocio.

Archivos: .github/workflows/checks.yml, .gitignore, components/VehicleManager.tsx,
test/integration/{authenticated.e2e,ors-fixture,prepare-env,start-stack}.mjs,
README.md, package.json, package-lock.json y supabase/config.toml. Reproducción
y límites se documentan en test/integration/README.md. El entorno actual no
tiene Docker; la ejecución funcional se realizó en GitHub Actions. La
cartografía externa permanece sintética en estas dos integraciones: no se
confunde Auth/REST reales con ORS real o una prueba de carretera Android.

Web PR #10 integrada. Producción READY y alias route-planner-web-sand.vercel.app
comprobados: commit c1634cabf391bcab3fecf35163fe9768895d3a8f, despliegue
dpl_3Rbb7unX1Gp1NS4DX5Jd76KRXG7e. La API permanece en f5c3639 y
dpl_KFWWLr4B8t7oThu5pDeVxyfk5FGH. Rollback de este segundo ciclo: Web
dpl_7yofWu6n5oWzKT64Jdr6NECq2biW. Los cambios de prueba no alteran datos ni
configuración alojada. La infraestructura CI nueva usa runners públicos
estándar, sin servicios contratados ni secretos de producción.

Pendientes del programa: datos municipales, vigencia y geometrías legales;
Google Maps exacto/legal para camión en México; establecimientos ausentes de los
índices; cuentas/cálculos autenticados de producción y navegación Android en
carretera. No se declara terminado el prompt maestro. Actualizar la referencia
API fijada al cambiar sus contratos/migraciones. La automatización sigue activa
con próximo inicio a las 06:57 de America/Chihuahua del 10 de noviembre y
recurrencia de cinco horas; antes de continuar, consultar main y este informe
para no sobrescribir avances publicados.


## Preferencias de carretera publicadas · 10 de noviembre de 2026

Se consultaron main y los alias vigentes antes de editar. Bases: Web f63d0fb
(documentación; código c1634ca) y API f5c3639. No había avances concurrentes nuevos.

Problema: no existían preferencias aplicables para peajes/autopistas. El
optimizador VROOM actual no recibe esas exclusiones; ofrecerlas simultáneamente
como optimización compatible habría sido incorrecto. Se incorporan controles
accesibles, booleanos estrictos en API, options.avoid_features para ambos perfiles
combinados con medidas HGV y una instantánea route.preferences. Se guarda y se
recupera con la RPC existente; rutas antiguas no reciben exclusiones inferidas.
Editar preferencias cancela respuestas pendientes. Se conserva el orden cuando
se solicitan exclusiones; la API rechaza la optimización incompatible antes de
consultar proveedores y nunca reintenta una ruta fallida quitando preferencias.

Todos los enlaces Google consecutivos reciben avoid=tolls,highways cuando
corresponde, incluyendo su longitud en el máximo real de URL. Es una solicitud
al motor de Google, no una polilínea bloqueada ni transmisión de atributos HGV.
Las exclusiones no verifican normas ni precios de casetas. Evitar autopistas
puede llevar a calles urbanas con más restricciones; la interfaz lo explica.

Verificación aprobada: API CI 42820915743, 52 pruebas, build, ocho migraciones/RLS
en Postgres desechable y auditoría sin vulnerabilidades. Web CI 42821186167,
84 pruebas, TypeScript/build, 17 E2E móviles y dos integraciones de Auth/REST/RPC
locales reales. Incluyen preferencias combinadas con dimensiones, guardado,
papelera/restauración, 48 entregas y rechazo de 49. ORS sigue siendo sintético
en CI; no se presenta como cálculo autenticado de producción ni Android real.

Producción READY y alias comprobados: API PR #9, commit
5db4df5f9ffc120a40318e19d693599a3b2cb8a1, dpl_CkiG1JpvUt5q3t55ood9LrLkDYrA;
Web PR #11, commit b5c43bde560bb8aa68a0b6ad3a0edd712b96a94a,
dpl_5KUwGbLm4ZqwroiWyDrNgJDKjzHx. Sus árboles coinciden con los probados.
Producción por proxy: preferencias válidas 200; tipos inválidos y combinación
incompatible 400; coordenadas y Plus Code completo 200. Navegador real público:
casillas activadas, aviso visible y enlace con avoid=tolls,highways, manteniendo
los dos puntos públicos exactos. No se usaron cuentas o ubicaciones privadas.

Archivos API: index.js, test/routing.test.js, test/runtime.test.js y
ROAD-PREFERENCES.md. Web: page.tsx, globals.css, RoutePreferences, NavigationLinks,
TruckGuide, lib/routes, navigation y route-preferences, pruebas planner,
navigation, route-save, geolocation.e2e y authenticated.e2e, workflow y documentación.
No hubo migraciones alojadas, cambios de planes/credenciales ni modificaciones a
Gestión u otros proyectos. Rollback: Web dpl_3Rbb7unX1Gp1NS4DX5Jd76KRXG7e;
API dpl_KFWWLr4B8t7oThu5pDeVxyfk5FGH. Sin errores runtime API en la ventana revisada.

## Puebla y revisión municipal desde el recorrido · publicado y comprobado

La búsqueda de fuentes oficiales encontró RES. 2021/49 que deroga parte de los
horarios de los lineamientos de 2020 de Puebla. Se agrega referencia parcial
INEGI 21114, condiciones por capacidad de carga (diferente de peso bruto), zonas
históricas, autorizaciones y comparadores sin inventar días o geometrías. La
vigencia actual, el caso exacto 3.5 t, excepciones y acuerdos posteriores siguen
pendientes; no se activa ninguna exclusión municipal. Son 14 referencias parciales,
seis fuentes vigiladas y cero municipios con validación automática completa.

API PR #10 integrada en cd6f2d3; CI 42822440606 aprobó 53 pruebas, build,
migraciones/RLS y auditoría. El HTML oficial pudo descargarse y conserva hash;
el PDF OJP dio 503. La comprobación técnica detectó cambio en Juárez, e
indisponibilidad de CDMX/Puebla en parte de sus documentos. Un hash cambiado
no prueba una reforma jurídica: obliga a revisar. No se ocultan esos fallos.
Detalle y pendientes reproducibles en MEXICO-COVERAGE.md y national-references.

La Web incorpora acceso «Revisar» por municipio del recorrido, apertura directa
sin preselección regional general, cancelación de referencias anteriores y aviso
de cambio/antigüedad/indisponibilidad visible sin expandir detalles. El ciclo se
publicó y comprobó con los resultados siguientes. No se declara terminado el
prompt maestro ni se desactiva la continuidad del trabajo.


### Cierre comprobado de ambos ciclos · 10 de noviembre de 2026

| Servicio | Commit de código servido | Despliegue de producción READY |
| --- | --- | --- |
| Web | 5b2de706fc663a62cd6bc555d3f62db1518d2f40 | dpl_2gZJ3tTX26emaAh3xUQeQaNpdgLa |
| API | cd6f2d31049c52a353c84f5f2d8247a8e61c9203 | dpl_FtzuVDJMQM4XQoUtuKAMJsYxAN2Y |

URLs verificadas: https://route-planner-web-sand.vercel.app/ y
https://route-planner-api.vercel.app/. Web PR #12 y API PR #10 integradas; los
árboles de cada merge coinciden exactamente con los comprobados en sus ramas.
API/main avanzó después con 09118ad, únicamente con el reporte técnico de fuentes;
la API lee ese reporte público con caché de 15 minutos. Este cierre documental
posterior no cambia el código de producción ni requiere otro despliegue.

CI final Web 42824045152: 88 pruebas, TypeScript, build, 18 E2E móviles y dos
integraciones locales genuinas de Auth/REST/RPC. Sin pruebas omitidas ni
vulnerabilidades conocidas en la auditoría ejecutada. API CI 42822440606:
53 pruebas, build, ocho migraciones y RLS en Postgres 17 desechable, auditoría
aprobada. La primera ejecución Web 42823366746 detectó que el selector municipal
no podía localizarse por su nombre accesible exacto; se añadieron aria-label
explícitos en ambos selectores y se repitió todo CI sin debilitar el test.

Comprobaciones públicas después de publicar:
- Bodega Aurrera Express con foco público de Monterrey: ocho coincidencias con
  calle; todas cercanas, máxima distancia geodésica aproximada 8,768 m.
- Coordenadas y Plus Codes completos/compuestos: 200; el código corto se recuperó
  como 75QXPMCF+GJ. Validación de 48 entregas con preferencia: 200; de 49: 400.
- Referencia Puebla por proxy: 200, cinco registros de referencia, sin aplicación
  al motor. Seguimiento: seis fuentes y reporte reciente, con cambios o fallos
  visibles según la última comprobación, sin convertirlos en vigencia jurídica.
- Navegador real de producción: selector general empieza sin favorito geográfico,
  lista alfabética, selección de Puebla, ámbitos y condiciones consultables;
  aviso de cambio técnico visible sin desplegar detalles. El salto desde la
  ruta a su municipio y la conservación del borrador se verificaron en CI con
  sesión/ruta sintéticas; no se presenta ese salto como cálculo ORS real.
- Google Maps Web real abrió el enlace generado por la app y mostró activadas
  ambas casillas Avoid highways y Avoid tolls. Esto acredita la recepción de las
  preferencias, no navegación HGV, legalidad ni conservación de la polilínea.
- Vercel no reportó errores runtime agregados en la ventana de 30 minutos
  consultada para ambos proyectos. No equivale a monitoreo permanente.
- Supabase Route Planner pakhlscjbjvwnheeyjxd: ACTIVE_HEALTHY, Postgres
  17.11.0.018. Sin avisos de RLS en el reporte de seguridad consultado; persiste
  el aviso conocido de protección contra contraseñas filtradas desactivada.
  No se activaron servicios ni se cambiaron datos/configuración alojada.

Archivos del segundo ciclo: API data/mx/national-references.json, source-status.json,
test/municipal-regulations.test.js y docs/MEXICO-COVERAGE.md. Web page.tsx,
globals.css, MunicipalCoverage, OfficialSourceMonitor, RouteCoverageReport,
TruckGuide, pruebas municipal-review, official-source-monitor,
route-coverage-report y geolocation.e2e, workflow y ambos informes. La API fijada
en el job de integración ahora es cd6f2d3. Actualizarla al cambiar contratos.

Rollback del segundo ciclo: Web dpl_5KUwGbLm4ZqwroiWyDrNgJDKjzHx (b5c43bd),
API dpl_CkiG1JpvUt5q3t55ood9LrLkDYrA (5db4df5). Se conserva también el rollback
anterior a ambos ciclos indicado arriba. No hubo migración alojada nueva ni
borrado de datos. Gestión y demás proyectos no se consultaron ni modificaron;
solo se operaron los IDs autorizados de Route Planner, sin activar gastos.

### Punto de reanudación vigente

Primero consultar main, este cierre, MEXICO-COVERAGE y los alias actuales.
Completados: preferencias, conservación/guardado y enlaces Google; acceso directo
municipal y alertas visibles; referencia parcial de Puebla. Parcial: cobertura
nacional, seguimiento de documentos y navegación con restricciones cartográficas.
Pendientes: geometrías y sentidos legales, vigencia/excepciones/permisos por
jurisdicción, configuración de ejes/carga, alternativas y enlaces compartidos
con autorización. ORS autenticado de producción y Android físico/en carretera
siguen sin verificación nueva; requieren evidencia propia, no fixtures.

Prioridad siguiente: revisar documentos vinculados y geometrías de los municipios
cruzados, incluida la interpretación de Monterrey. En el chequeo local, el cambio
de Juárez provenía de su página de Gaceta relacionada; el hash del documento
principal seguía igual. No se interpretó como reforma del reglamento. Los portales
HTML pueden variar por formularios u otros contenidos: separar esas variaciones
del texto normativo antes de elevar un cambio técnico a revisión jurídica; la
comparación de dos descargas de Puebla no acreditó que sólo cambiara el token
del formulario. El monitor no descubre todos los acuerdos ni certifica vigencia.
No declarar finalizado el programa ni eliminar su continuidad por estos avances.


## Seguimiento por documento y fallos parciales · 10 de noviembre de 2026

Bases consultadas: Web main b999dca (código servido 5b2de70), API main 09118ad
(código servido cd6f2d3). Alias READY coincidentes; sin avances concurrentes nuevos.
No se modifican reglas legales ni ruteo en este ciclo.

Causa raíz: checkSource agrupaba principal y vínculos en un único try/catch.
Cuando fallaba un vínculo descartaba el resultado nuevo del principal; la UI
además elegía entre cambio o indisponibilidad y ocultaba el otro estado. Ahora
cada documento conserva tipo, URL, hash, intento, última descarga y error. El
resumen separa disponibilidad parcial, cambios del principal/vínculos/bundle y
cambio del conjunto de enlaces. Un bundle no identificado se marca pendiente.
Los fallos posteriores conservan evidencia previa, incluidos cambios pendientes.

El endpoint público conserva compatibilidad con checkpoints anteriores, añade
antigüedad individual y limita enlaces a los declarados o al bundle de la fuente.
Los mensajes de error se redactan. Una respuesta CDN atrasada no reemplaza el
reporte incorporado más reciente; solicitudes simultáneas comparten la descarga.
La UI muestra cambio y fallo simultáneamente, con el enlace y fecha de cada
recurso; los reportes viejos indican que aún no tienen desglose. No se eliminan
los cambios técnicos de HTML ni se transforman en reformas jurídicas.

Contraste real: en la comprobación de las seis fuentes oficiales del ciclo,
Puebla respondió en principal y COREMUN y falló en la ficha OJP con 503.
Juárez tuvo cambio en la Gaceta vinculada; el hash del principal siguió igual.
Monterrey y Guachochi no mostraron cambios del documento consultado. Jalisco
quedó sin revisión completa de vigencia y CDMX no disponible. Son resultados
de esa ventana, no garantías de disponibilidad ni validación legal actual.

Validación local: API 59 pruebas y build; Web 90 pruebas, TypeScript y build;
auditorías sin vulnerabilidades conocidas. API CI 42827802403 aprobó sobre
dab3d133, incluidas migraciones/RLS en Postgres 17 desechable. API PR #11
integrada en 13e5858a2781e13cd2450ea88b85b87b374eeed7. La publicación Web y su
comprobación móvil integral quedaron cerradas con los resultados siguientes.

Archivos API: scripts/check-official-sources.mjs, lib/source-evidence.js,
lib/source-monitor.js, test/source-monitor.test.js, data/mx/source-status.json
y MEXICO-COVERAGE.md. Web: OfficialSourceMonitor.tsx, globals.css, pruebas de
monitor y geolocation.e2e, workflow e informes. El job de integración usa la
API 13e5858a. No se cambian migraciones ni configuración alojada de Supabase,
credenciales o planes; Gestión y otros proyectos no se consultan ni modifican.
La cobertura continúa en 14 referencias parciales y cero municipios con
validación automática completa. Pendiente verificar despliegue final, trazados
legales por sentido/horario/permisos y Android físico. El programa sigue abierto.


### Cierre publicado del seguimiento por documento

| Servicio | Commit de producción | Despliegue READY |
| --- | --- | --- |
| Web | 7956052346d393e96a5d3d89cd6ec31abe7380fb | dpl_G1LeAq5TtpHy5UWY5RQMRMBtX2YY |
| API | 13e5858a2781e13cd2450ea88b85b87b374eeed7 | dpl_6Yj1gDrC6dbWHixWg4DHJNAv3nt7 |

Alias y SHA comprobados en ambos proyectos. URLs:
https://route-planner-web-sand.vercel.app/ y https://route-planner-api.vercel.app/.
Web PR #13 y API PR #11 integradas; los árboles de merge coinciden exactamente
con los comprobados. API/main añadió después 2e069e1, sólo el reporte técnico de
fuentes. Este cierre posterior modifica únicamente documentación, sin recompilar
ni cambiar el código publicado.

CI API 42827802403: 59 pruebas, build, ocho migraciones y RLS en Postgres 17
local desechable, auditoría sin vulnerabilidades conocidas. CI Web 42828095602:
90 pruebas, TypeScript, build, 19 E2E móviles sin omisiones y dos integraciones
con Auth/REST/RPC locales reales. Sus proveedores externos de ruteo son sintéticos:
no equivalen a ORS autenticado de producción ni navegación Android en carretera.
Las regresiones conservan guardado, recuperación, aislamiento de cuentas,
preferencias y 48 entregas; no se reintroduce el límite artificial de ocho.

Producción, comprobación funcional:
- El proxy devolvió 200 en salud, coordenadas, Plus Code compuesto y búsqueda
  cercana Express; ocho sugerencias cercanas en el punto público de Monterrey.
- Validate con dos extremos y con 48 intermedias: 200; con 49: 400. Es validación
  pública de entradas, no un cálculo autenticado de ORS real.
- Source-status por proxy: 200, seis fuentes, once documentos desglosados,
  reporte reciente y legalRulesAutomaticallyUpdated=false. En esa consulta
  Juárez devolvió 403 en sus dos enlaces y conservó el cambio previo de Gaceta;
  Puebla había recuperado sus enlaces. Los resultados pueden cambiar después.
- Navegador real en el alias público: ambos avisos visibles y detalle de
  seguimiento con once filas con enlace, fecha de intento y última descarga.
  Juárez mostró el 403 actual y la evidencia anterior pendiente de revisión.
- Vercel no encontró errores runtime agregados en los 30 minutos revisados de
  Web y API. Las indisponibilidades de fuentes sí se informan en el monitor.

Recuperación: Web dpl_2gZJ3tTX26emaAh3xUQeQaNpdgLa (5b2de70); API
 dpl_FtzuVDJMQM4XQoUtuKAMJsYxAN2Y (cd6f2d3). Restaurar ambos revierte el producto
anterior; el reporte nuevo es compatible y se conserva el historial Git. No hay
migración alojada ni eliminación de registros. Sólo se modificaron repositorios
y proyectos autorizados de Route Planner; Gestión y demás proyectos no se
consultaron ni tocaron. No se activaron servicios o planes de pago ni se expusieron
credenciales. Los tests de cuentas se ejecutan en contenedores desechables de CI.

### Próxima reanudación

Consultar main, los alias y este último cierre antes de cambiar código. Completado:
evidencia por documento, fallos parciales, conservación ante CDN atrasada y avisos
simultáneos comprobados. Parcial: monitor técnico de seis fuentes; no extrae ni
certifica normas. Permanecen 14 municipios con referencias parciales y cero con
validación legal automática completa.

Priorizar vigencia, excepciones, permisos y geometrías/sentidos de las referencias
municipales; contrastar primero la interpretación de Monterrey y las publicaciones
vinculadas, sin convertir hashes de HTML en reformas ni nombres en geometrías
legales. Continúan pendientes configuración de ejes/carga, alternativas de rutas,
enlaces compartidos autorizados, cálculo autenticado de producción y ensayo
Android físico/en carretera. Google no recibe atributos HGV ni una polilínea
bloqueada; las guías no garantizan trazado exacto o legalidad. No se declara
terminado el prompt maestro ni se elimina la continuidad por cerrar este ciclo.


## Ciclo cerrado · 10-11-2026 · Perfil operativo de camión

### Diagnóstico y alcance

Se retomó main de Web 8d327395 y API 2e069e13; se leyeron este informe y
MEXICO-COVERAGE antes de editar. Los alias aún correspondían a Web 79560523 y
API 13e5858a, ambos READY. No se encontraron cambios nuevos de otras ejecuciones.
Los perfiles sólo guardaban las cinco medidas/pesos: faltaban configuración,
ejes y capacidad nominal, necesarios para revisar referencias que distinguen
unidades o capacidad de carga. No se detectó una nueva caída de búsqueda/red.

Completado en este ciclo:
- Perfiles de camión con configuración, ejes y capacidad nominal opcionales.
  Seleccionar configuración completa sus ejes; «Sin identificar / otra
  configuración» permite indicar ejes manuales sin inventar un código.
- Los perfiles anteriores conservan campos desconocidos. No se infieren ejes,
  capacidad o carga por eje a partir del peso bruto. Capacidad nominal y peso
  bruto cargado se muestran y guardan por separado.
- El plan usa los nuevos datos, cancela cálculos obsoletos al cambiarlos y
  conserva la instantánea histórica en una ruta guardada. Editar el vehículo
  después no altera aquel perfil al recuperar el recorrido.
- Validación de configuración/ejes y precisión de capacidad (hasta tres
  decimales sin redondeo silencioso de umbrales). La validación local ocurre
  antes del fetch: un dato inválido no se convierte en un falso fallo de red.
- API compatible con clientes anteriores; devuelve vehicleContext en camión.
  ORS sigue recibiendo exclusivamente sus cinco parámetros soportados. Estos
  campos nuevos no se envían como restricciones inexistentes.

### Fuentes y normativa

Catálogo de 23 códigos con su número total de ejes, contrastado con Tabla B-2 de
NOM-012-SCT-2-2017 en SIDOF, consultada 10-11-2026. Sólo nomenclatura/ejes: no se
han convertido pesos por configuración, neumáticos, clase de carretera,
excepciones o permisos en reglas. Fuente y contrato se documentan en
VEHICLE-OPERATING-PROFILE.md. Ambos repositorios conservan el catálogo idéntico y
CI compara sus bytes. La Web de integración fija API b3341ea; el commit posterior
d7ebfd5 sólo alinea el nombre de la migración y su documento, con SQL idéntico.

Permanecen 14 municipios con referencias parciales y cero con validación legal
automática completa. No se incorporan calles, geometrías/sentidos ni municipios
nuevos. El registro de la unidad no demuestra permiso de circulación. Google
Maps no recibe atributos HGV ni una polilínea bloqueada; los puntos guía siguen
sin garantizar trazado exacto o cumplimiento de normas.

### Archivos

Web: app/page.tsx y globals.css; VehicleManager, VehicleOperatingFields,
SavedRoutesPanel y TruckGuide; lib/vehicle-operating, vehicles, route-save y
routes; data/vehicle-configurations.json; cinco archivos de pruebas, la
integración autenticada, el workflow de checks y la documentación. API:
index.js, catálogo compartido, migración vehicle_operating_profile, routing.test,
verify.sql, workflow transaccional de migraciones y documentación del contrato.
Los cambios completos se consultan en los PR enlazados, sin afectar otros repos.

### Pruebas y resultados

- Local: TypeScript, compilación Web, sintaxis/build API, Web 95/95, API 60/60.
  Auditorías de dependencias de producción: cero vulnerabilidades conocidas.
- Chromium local no pudo arrancar: socket/ptrace Operation not permitted.
  No se presenta ese intento como prueba de navegador aprobada.
- CI API 42871675232 y 42872696082 aprobados: 60 pruebas, compilación, nueve
  migraciones en Postgres 17 aislado, constraints, propiedad/RLS, rollback de
  fixtures y auditoría. La segunda ejecución verificó el nombre definitivo.
- CI Web 42872052848 aprobado: TypeScript, build, 95 pruebas, 20 casos de
  navegador móvil/escritorio y dos flujos con Auth/REST reales de Supabase local.
  ORS y las teselas de los casos automatizados son fixtures controlados.
- Integración autenticada: crear/editar vehículo, configuración T3-S2/5 ejes,
  capacidad 30.125 t, rechazar contradicciones y precisión adicional desde REST,
  calcular/guardar/cargar con instantánea anterior a editar el vehículo, papelera,
  favoritos, preferencias, optimización de reparto y aislamiento de dos cuentas.
  El segundo caso conserva 48 entregas, reintentos idempotentes y rechazo de 49.
- Navegador público real: campos nuevos visibles, T3-S2 completa cinco ejes,
  capacidad independiente y registro manual de tres ejes sin código identificado.
  Las teselas públicas se cargaron. No se creó una cuenta alojada ni se modificó
  el vehículo del usuario para probar.
- Producción vía proxy: salud 200; coordenadas, Plus Code completo y compuesto
  200; ocho coincidencias Express priorizadas cerca de Monterrey. Validación de
  dos puntos y 48 intermedias 200; 49, ejes inconsistentes, configuración
  desconocida y capacidad con precisión adicional 400; cliente anterior 200;
  cálculo sin sesión 401 y CORS de la Web correcto. Son validaciones públicas,
  no un cálculo autenticado real de ORS en producción.
- Vercel: sin errores/fatales runtime agregados en los 30 minutos revisados en
  ambos proyectos. No equivale a ausencia permanente de errores ni cobertura
  completa de observabilidad. Prueba Android física/en carretera pendiente.

### Migración, publicación y recuperación

Migración aditiva aplicada en Supabase Route Planner: 20261110181032,
vehicle_operating_profile. Añade tres columnas anulables y tres CHECK a vehicles.
Conservó la fila existente con sus nuevos campos vacíos, RLS habilitado y su
política de propiedad. Sin cuentas, tablas o registros eliminados. El archivo
inicial de CI 20261110175839 fue renombrado al número asignado por Supabase;
SQL comprobado idéntico, sin reejecutar ni editar el historial remoto.
Advisors conserva sólo el aviso conocido de protección de contraseñas filtradas
deshabilitada; no aparecieron nuevos avisos RLS. Referencia:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Cambios integrados:
- Web PR #14, https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/14,
  commit de implementación 2fa2dc6ccd375e9a114887a669563b27b612baca;
  merge/código publicado 2ca303c002c77dc79e11b72da271c078404fde33.
- API PR #12, https://github.com/FernandoBalsimelli/Route-Planner-API/pull/12,
  implementación 197827706c2641721a6d7ee844e5e8466218cbc0 y merge b3341ea.
  PR #13, https://github.com/FernandoBalsimelli/Route-Planner-API/pull/13,
  alinea la migración: merge publicado d7ebfd5dd1db2eb113c3ea5ff1761cfc191aac9c.

Alias comprobados READY y correspondientes a esos commits:
- Web dpl_37przBY8daiJuu8AjufZgFStqtJ9:
  https://route-planner-web-sand.vercel.app/
- API dpl_EBZeeib4sbBYxN5rm9TqM7KqwRYx:
  https://route-planner-api.vercel.app/

Rollback del producto: Web dpl_G1LeAq5TtpHy5UWY5RQMRMBtX2YY (79560523), API
 dpl_6Yj1gDrC6dbWHixWg4DHJNAv3nt7 (13e5858a). Conservar las columnas y los datos
nuevos al revertir aplicaciones; nunca DROP para deshacer la interfaz. Historial
y ramas de implementación permanecen. El cierre documental de main puede ser
posterior al commit publicado: no cambia el código que ya se probó y desplegó.

Sólo se modificaron los repositorios, despliegues y Supabase autorizados de Route
Planner. Gestión y los demás proyectos no se consultaron ni se modificaron.
Sin planes/servicios de pago, secretos expuestos ni operaciones destructivas.

### Punto de reanudación

Este ciclo termina los nuevos campos operativos y su persistencia; no termina el
programa maestro. Parcial: revisión municipal y monitor técnico de seis fuentes,
sin conversión de documentación a exclusiones legales. Pendientes: contrastar
vigencia/excepciones/permisos y geometrías/sentidos; incorporar validaciones por
configuración sin usar capacidad nominal como peso real; alternativas de rutas,
enlaces compartidos autorizados y pruebas autenticadas reales de producción y
en carretera. Los próximos cambios deben volver a consultar main y los alias.
No restaurar el límite de ocho entregas ni eliminar la continuidad programada.

## Ciclo cerrado · 10-11-2026 · Datos del camión en la consulta municipal

### Diagnóstico, causa y cambios

Se consultó main más reciente: Web f46e3fd, API 0550ad5. Se leyeron este informe
y MEXICO-COVERAGE antes de editar. Producción seguía READY en Web 2ca303c y
API d7ebfd5. La diferencia de main de API era exclusivamente el reporte periódico
de fuentes; se conservó. No hubo avances ajenos de código que sobrescribir.

La consulta municipal mostraba referencias pero no las contrastaba con la unidad
actual del planificador. Ahora recibe configuración/ejes, capacidad nominal,
peso bruto y medidas. Compara únicamente los campos estructurados de la fuente:
Puebla (capacidad, cuadro de configuración y longitud) y criterio de ejes del
artículo 39 de Monterrey. Presenta coincidencias/diferencias de datos, sin
clasificar una operación o ruta como autorizada. No oculta las disposiciones
cuando un dato no coincide ni evalúa si la ruta cruza una zona o calle.

Se distinguen capacidad nominal, peso bruto cargado y ancho de la carga. Este
último queda pendiente; no se sustituye por ancho del vehículo. El cuadro de una
configuración no se traslada a otra. Configuraciones/ejes contradictorios y datos
inválidos permanecen desconocidos. El caso exacto de 3.5 t no recibe ventana.
Al cambiar a Reparto se retira el contexto del camión, sin conservar exenciones.

Se encontró además un caso límite en la validación previa de capacidad: la
tolerancia de coma flotante podía aceptar precisión adicional extremadamente
próxima a un umbral. Se valida ahora que el número ya sea representable con tres
decimales; se rechaza precisión extra sin redondear el valor para decidir un lado.
También se evita reiniciar la consulta municipal por cambios de identidad del
objeto solicitado: el efecto depende de ID y número de solicitud, conservando
la cancelación de respuestas obsoletas al cambiar jurisdicción.

### Fuentes y alcance

Se contrastaron fuentes oficiales el 10-11-2026. Gaceta de Puebla respondió 200,
HTML SHA-256 1a67a805c0445f99285181b27afadb12dac2d69a5ab3d8b815fa18b695c24aa6.
La descarga directa del PDF de Monterrey respondió 403 en este entorno; el
servicio de consulta documental recuperó su texto de 177 páginas. No se inventa
un hash nuevo ni se modifica su fecha de comprobación en la API. La diferencia
de hash HTML no acredita reforma. Siguen pendientes publicación/entrada en vigor,
actos posteriores, permisos, días, excepciones, sentidos y geometrías.

Documentación: MUNICIPAL-VEHICLE-REVIEW.md, MEXICO-COVERAGE.md. La investigación
complementaria TRUCK-PROVIDER-OPTIONS.md contrasta ORS alojado/autohospedado,
Valhalla (truck, número de ejes y licencia MIT) y límites de Maps URLs con fuentes
primarias actuales. Es evaluación técnica, no un respaldo integrado o capacidad
municipal completa. No se aprovisionó infraestructura ni se contrató un servicio.

Permanecen 14 municipios con referencias parciales y cero con validación legal
automática completa. No se agregan municipios, calles ni geometrías de exclusión
al cálculo. Directions y los enlaces consecutivos de Google no cambian; los
puntos guía siguen sin fijar la polilínea ni transmitir restricciones HGV.

### Archivos y verificación

Archivos de producto: app/page.tsx y globals.css; MunicipalCoverage, TruckGuide y
VehicleReferenceComparison; lib/municipal-vehicle-review.ts y vehicle-operating.ts.
Pruebas: municipal-vehicle-review, municipal-review, vehicle-operating,
geolocation.e2e e integración autenticada. Workflow fija API 0550ad5, incluida la
versión definitiva de sus nueve migraciones. El diff completo está en PR #15.

- Local: typecheck y build Web aprobados, 101 pruebas aprobadas, auditoría de
  dependencias de producción sin vulnerabilidades conocidas. API sin cambios:
  comprobación de sintaxis/build y sus 60 pruebas aprobadas.
- Chromium local no arrancó (socket/ptrace Operation not permitted). Este intento
  no se cuenta como navegador aprobado ni se eludieron permisos del entorno.
- CI Web 42920574227 aprobado en head 23a1679: TypeScript, compilación, 101 pruebas,
  22 casos de navegador móvil/escritorio, dos flujos autenticados y auditorías.
  La ejecución anterior se sustituyó al reforzar la precisión, sin publicar
  código antes de comprobar el head final.
- Nuevos casos: fronteras de capacidad y precisión adicional próxima al umbral;
  datos desconocidos/contradictorios; configuración y ancho de carga; consulta por
  jurisdicción sin reinicio al cambiar datos; móvil 360/390 px sin desbordamiento,
  capacidad independiente del peso, cambio a Reparto y criterio de ejes 4/5.
- Integración con Auth/REST de Supabase local reales: una ruta recuperada usa su
  perfil histórico en la guía de Puebla, después de editar el vehículo guardado.
  Conserva los otros flujos de cuenta, RLS, papelera, preferencias y 48 entregas.
  ORS es un fixture determinista y el monitor se aísla en ese caso; no es un
  cálculo autenticado de producción ni una prueba Android física/en carretera.
- Producción vía proxy: salud, coordenadas, Plus Codes completo/compuesto y ocho
  coincidencias cercanas de Aurrera Express respondieron 200. Validate aceptó dos
  extremos y 48 intermedias; rechazó 49. Puebla devolvió cinco reglas y Monterrey
  19 filas de horarios. Son verificaciones públicas de entrada/referencia, no
  rutas calculadas con una sesión real en el proveedor externo.
- Navegador real en el alias público: C2/3.5 t dejó ambas condiciones sin ventana;
  peso bruto 12 t se comparó por separado y ancho de carga siguió desconocido.
  Cambiar a Reparto retiró esos datos; T3-S2/5 ejes en Monterrey mostró que no
  coincide sólo el criterio de ejes y conservó las advertencias de ámbito.
  No se crearon cuentas alojadas ni se modificaron vehículos del usuario.
- Vercel: sin errores/fatales runtime agregados en los 30 minutos revisados de
  Web y API. Es evidencia de esa ventana, no garantía permanente de ausencia.

### Publicación y recuperación

Web PR #15: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/15.
Commits 42e1cd8 y 23a1679; merge y código publicado:
2dfa34a72844fb9e7e22042645d5b94c67cc332b.
Despliegue dpl_5Cc571NruusJTef3Td1egdxY4eTy, alias comprobado READY y asociado a
ese commit: https://route-planner-web-sand.vercel.app/.
API continúa en d7ebfd5dd1db2eb113c3ea5ff1761cfc191aac9c,
dpl_EBZeeib4sbBYxN5rm9TqM7KqwRYx: https://route-planner-api.vercel.app/.

Rollback Web: dpl_37przBY8daiJuu8AjufZgFStqtJ9, commit 2ca303c. No se requiere
rollback de API ni Supabase: no hubo cambios de esquemas, RLS, funciones o datos
alojados. Sólo se modificó el repositorio y despliegue Web autorizados; API se
consultó y actualizó localmente al reporte existente, sin commits nuevos de esta
intervención. Gestión y otros proyectos no se consultaron ni se modificaron.
Sin gastos activados ni credenciales expuestas. Ramas y commits conservados.
El cierre documental posterior no cambia el código publicado y verificado.

### Próxima prioridad

Completado: comparación numérica contextual con alcance explícito, precisión de
capacidad reforzada y aislamiento del modo de reparto, con pruebas y publicación.
Parcial: revisión municipal, sólo referencias y comparación de algunos datos.
Pendientes: vigencia/excepciones/permisos y geometrías/sentidos verificables para
incorporar reglas al ruteo; alternativas de recorrido; enlaces compartidos con
permisos; cálculos autenticados de producción y navegación Android física. La
evaluación de motores alternativos todavía necesita infraestructura autorizada y
pruebas de restricciones conocidas; no se presenta como integración realizada.

Reanudar leyendo main y ambos alias, conservar el reporte automático de API y el
límite real del proveedor sin restaurar ocho entregas. El programa maestro no
está completo; no se elimina la continuidad por cerrar este ciclo.

## Ciclo cerrado · 10-11-2026 · Alternativas de recorrido

### Diagnóstico y cambios

Se leyeron main y los informes persistentes antes de editar: Web 3e5aea8, API
0550ad5; los alias estaban READY en Web 2dfa34a y API d7ebfd5. No había cambios
nuevos de código. Se conservó el reporte automático de fuentes de API.

El cálculo sólo consumía routes[0] y la interfaz no permitía comparar opciones.
Ahora alternatives es opcional y falso por defecto. Con origen y destino sin
intermedias se solicitan hasta tres recorridos en una llamada Directions. Se
conservan perfil HGV, medidas/pesos y preferencias de peajes/autopistas. No se
repiten solicitudes debilitando restricciones ni se fabrican opciones o tiempos.

Cada opción se serializa desde su geometría: métricas, instrucciones, índices de
extremos y jurisdicciones propias, con el mismo contexto del vehículo. Se
rechaza una primaria incompleta; secundarias incompletas, duplicadas o excedentes
se omiten y su descarte se informa. Si sólo queda una opción válida se explica.

La selección actualiza mapa, métricas, navegación, instrucciones, jurisdicciones,
exportación y el resultado guardado, sin otra llamada al proveedor. Cambiar de
opción detiene la sesión GPS anterior. Durante un guardado no se puede cambiar
la selección. Cargar una ruta restaura sólo el trazado elegido, sin reconstruir
alternativas que no fueron guardadas.

### Límites y normativa

Fuentes oficiales de ORS consultadas el 10-11-2026 (fecha de Chihuahua): límite
publicado de alternativas 100 km y hasta tres rutas; formato JSON con geometría,
resumen e índices; contrato alternative_routes y parámetros HGV. Referencias y
contrato en ROUTE-ALTERNATIVES.md de ambos repositorios. Distancia/tiempo son
estimaciones del proveedor, no mediciones en carretera.

Se rechazan antes de Directions extremos separados por más de 100 km en línea
recta. Es una condición de descarte, no distancia real de conducción ni garantía
de aceptación por debajo del umbral. El proveedor puede devolver menos opciones
o rechazar su distancia/credencial/cuota. Su error específico permanece visible.

Las alternativas se limitan a dos puntos en esta implementación; no se sustituyen
entregas por opciones ni se limita el recorrido normal a ocho. Añadir una entrega
desactiva alternativas y cancela cálculos obsoletos, conservando las 48 intermedias
admitidas por el cálculo normal. El backend rechaza la combinación incompatible.

Cada geometría tiene su revisión aproximada de municipios. No se añaden reglas
municipales de exclusión: siguen 14 referencias parciales y cero municipios con
validación legal completa. No hay geometrías/sentidos oficiales nuevos aplicados.
Google Maps no recibe polilínea bloqueada, atributos HGV o permisos por seleccionar
otra opción aquí. El cambio no certifica circulación legal ni seguridad.

### Archivos y pruebas

API: index.js, test/routing.test.js, docs/ROUTE-ALTERNATIVES.md. Web: app/page.tsx,
globals.css, test/planner.test.mjs, geolocation.e2e.mjs, integración autenticada y
su fixture ORS; workflow con API fijada a 9fddd1f; documentos de alternativas,
cobertura e ingeniería. Sin dependencias nuevas, migraciones o cambios de RLS.

Local: build/sintaxis API, TypeScript y build Web aprobados; API 64 pruebas y Web
103 aprobadas; auditorías de producción sin vulnerabilidades conocidas. No se
repitió el navegador local en este entorno: su bloqueo de socket/ptrace está
documentado en ciclos anteriores; la verificación de navegador se hizo en CI.

CI API 42957456691: 64 pruebas, build, nueve migraciones en Postgres 17 aislado,
propiedad/RLS y auditoría aprobados. CI Web 42958503698: typecheck, build, 103
pruebas, 23 casos de navegador y tres flujos autenticados aprobados en el head
final c118d3183229967203830d50e45f7eb6ef09716d. Se corrigió el selector de un test para reconocer «＋ Agregar
parada» y se verificó también el aviso de opciones omitidas antes de publicar.

Casos nuevos: tres rutas con geometrías/instrucciones distintas; conservación de
restricciones y preferencias; rechazo de intermedias y extremos lejanos antes del
proveedor; datos incompletos/duplicados; una sola opción y límites específicos,
sin reintentos débiles. Web comprueba selección sin nueva petición, métricas,
retiro al añadir entregas y explicación de descartes. Móvil comprueba detención
GPS al seleccionar otro trazado y ausencia de desbordamiento.

La tercera integración usa Auth/REST locales reales, solicita alternativas a la
API con ORS simulado, selecciona la segunda, guarda su geometría y métricas y
restaura ese mismo resultado. Mantiene los otros casos de RLS, perfiles, papelera,
referencias, preferencias y 48 entregas. No son alternativas reales calculadas
con una sesión de producción, ni pruebas Android físicas/en carretera.

Producción vía proxy: salud 200; coordenadas, Plus Codes completo/compuesto y
búsqueda Express cercana 200 (ocho sugerencias). Validate acepta alternativas
con dos puntos y rechaza intermedias; acepta 48 entregas normales y rechaza 49.
Plan sin sesión conserva 401. Se comprobó la API nueva desde la Web anterior,
conservando compatibilidad. En navegador público se comprobó el control de alternativas: al añadir una entrega se desactiva y desmarca, y al quitarla vuelve a estar disponible. No se calculó una alternativa autenticada en producción durante esa comprobación.

Vercel no mostró errores/fatales runtime agregados en los 30 minutos revisados de Web y API. Esto no garantiza ausencia permanente de errores.

### Publicación, recuperación y siguiente prioridad

API PR #14: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/14,
head d427e171, merge publicado 9fddd1fc5cf0414397e0f4ee32c58802c9946352,
despliegue dpl_6iVB9D6CzDauuAzqmFXufcRAVHP1:
https://route-planner-api.vercel.app/.
Web PR #16: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/16,
merge/código publicado 1917904ffa752fdf303f3e559241b0f3b75ba546, despliegue dpl_9mWuK3srK1qd9h47q8jeYDDN8FUc:
https://route-planner-web-sand.vercel.app/.
Ambos alias comprobados READY y asociados a esos commits. El cierre documental
posterior no cambia el código que se probó y publicó.

Rollback: Web dpl_5Cc571NruusJTef3Td1egdxY4eTy (2dfa34a), API
 dpl_EBZeeib4sbBYxN5rm9TqM7KqwRYx (d7ebfd5). No hay migración que revertir; rutas
guardadas conservan su trazado y el mismo contrato JSON. Ramas y commits
permanecen como puntos de recuperación. Sin datos existentes eliminados ni
modificaciones alojadas de Supabase. Gestión y demás proyectos no se consultaron
ni modificaron. No se activaron planes de pago ni se expusieron secretos.

Implementado: alternativas entre dos puntos y selección/persistencia verificadas
con proveedor controlado. Pendiente: contraste autenticado real de ORS en producción
y Android físico. No se garantizan tres opciones o disponibilidad en la cuenta.
Continúan vigencia/excepciones/permisos y geometrías/sentidos municipales, enlaces
compartidos con permisos y evolución de navegación. El programa maestro sigue
incompleto; reanudar comprobando main y alias y conservar la continuidad.

## Ciclo: Chihuahua capital y separación de evidencia de planeación

Implementación del 11 de noviembre; producción y guía pública reverificadas el
15 de noviembre de 2026. Main se consultó de nuevo antes de continuar: Web
191b166 y API 669579a, esta última con reportes automáticos posteriores al código.
No se sobrescribieron esos reportes. El trabajo general sigue incompleto.

### Hallazgo y cambio

La descarga oficial del Congreso contiene la ley estatal consolidada hasta el
08-08-2026; una copia indexada más antigua mostraba 2024. El artículo 66 remite a
la autoridad para concretar horarios. El programa metropolitano MO-4.4 (POE 54,
05-07-2025) ofrece ejemplos de horas punta como propuesta. No son prueba de
prohibiciones municipales vigentes.

08019 pasa a referencia parcial, con fuente, fechas, jurisdicción, huellas y
páginas distintas para ley y programa. La Web identifica `planning_proposal`,
no muestra comparadores ni ventanas operativas de una propuesta, y enlaza su
propio documento. El monitor revisa también el anexo de 23,352,913 bytes con
presupuesto explícito de 24 MiB; las demás fuentes conservan 20 MiB, con tope
absoluto de configuración de 32 MiB y control durante el streaming.

Quedan 15 municipios con referencia parcial, siete fuentes principales y cero
con validación legal automática completa. No se atribuye cobertura a otros
municipios por formar parte de una zona metropolitana; no hay geometrías ni
nuevas exclusiones aplicadas. Detalle: CHIHUAHUA-CAPITAL-REFERENCE.md.

### Archivos y pruebas

API: national-references.json, source-status.json, check-official-sources.mjs,
pruebas municipales/monitor y documentos de cobertura/Chihuahua. Web:
MunicipalCoverage.tsx, globals.css, pruebas de consulta municipal e integración
autenticada, workflow fijado a API 27e8082 y documentos de cobertura/ingeniería.
Sin dependencias nuevas ni migraciones.

Local: 66 pruebas API, 104 Web, sintaxis/build API, TypeScript, build Web y ambas
auditorías sin vulnerabilidades de producción conocidas. CI API 42993051789:
66 pruebas y nueve migraciones en Postgres 17 aislado, propiedad/RLS y auditoría
aprobados. CI Web 42993181139: 104 pruebas, 23 casos de navegador y tres flujos
con Auth/REST locales reales aprobados. La integración móvil consultó la ficha
real de la API y su fuente de planeación. ORS permaneció simulado.

Producción comprobó salud, coordenadas, Plus Codes completo/compuesto, búsqueda
Express, consulta de 08019, catálogo 15/0 y siete fuentes. Validate aceptó dos
puntos y 48 intermedias, rechazó 49; plan sin sesión mantuvo 401. En navegador se
corroboró un punto de coordenadas y la guía publicada con procedencia, fechas y
la separación de propuesta. La búsqueda enfocada en Chihuahua no encontró
Express a menos de 50 km: conserva aviso explícito y distancias de los resultados
lejanos; no demuestra cobertura completa de sucursales.

Supabase Route Planner se inspeccionó sin cambios: ACTIVE_HEALTHY, nueve
migraciones, seis tablas públicas con RLS. Sigue el aviso de protección de
contraseñas filtradas desactivada, ya registrado; no se habilitaron servicios.
Remediación: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

### Publicación y recuperación

API PR #15: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/15.
Commit de código publicado: 6fad021dd414a964056ad029e8f4dc80033c577d;
despliegue dpl_FNdvSQM2HMky1kreq84MnQ7cugjc, READY:
https://route-planner-api.vercel.app/.
Web PR #17: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/17.
Commit de código publicado: 191b1663000528e7a47dac8af1f826dd75da58ff;
despliegue dpl_4YAb5nFU5bmdHUiWK1Gt4iopbFfZ, READY:
https://route-planner-web-sand.vercel.app/.
Alias y commits se reverificaron el 15 de noviembre. El código API es anterior
a los reportes automáticos posteriores de main; el endpoint puede leer evidencia
más reciente sin alterar reglas. Rollback: Web dpl_9mWuK3srK1qd9h47q8jeYDDN8FUc
(1917904), API dpl_6iVB9D6CzDauuAzqmFXufcRAVHP1 (9fddd1f). Sin cambios alojados
de datos/esquema que revertir. Gestión y demás proyectos no se modificaron.

Completado: referencia y clasificación de evidencia. Parcial: cobertura municipal.
Pendientes: acuerdos locales vigentes, permisos/excepciones, días/horarios y
geometrías/sentidos; revisar cambios y fallos del monitor sin activarlos como
leyes. Faltan cálculos ORS autenticados reales en producción y Android físico.
Siguiente ciclo: corregir pérdida de pedidos repetidos en manifiestos y facilitar
su corroboración, conservando todas las entregas intencionales.

## Ciclo: pedidos repetidos y corroboración de manifiestos · 15-11-2026

### Problema, causa y comportamiento

El parser agrupaba direcciones y luego aplicaba un Set. Dos órdenes con texto
idéntico quedaban reducidas silenciosamente a una entrega. Se retiró esa
eliminación: cada candidato conserva posición, multiplicidad y texto de origen.
Se muestran grupos de texto repetido y pares confirmados a 10 m o menos en línea
recta, sin fusionar, excluir o bloquear pedidos intencionales. La revisión lleva
el foco a la entrega elegida. Editar invalida la confirmación; excluir retira la
comparación. Se conserva la confirmación explícita de cada punto.

Archivos: lib/manifest.ts, lib/manifest-review.ts, ManifestImport.tsx, globals.css,
pruebas de parser/revisión/cuentas/navegador y MANIFEST-DELIVERY-REVIEW.md.
No cambia API, dependencias, esquema, privacidad del OCR ni el máximo real de
48 paradas intermedias. Los avisos resumidos no recortan filas adicionales.

### Verificación y publicación

TypeScript, build de producción y 109 pruebas Web aprobados. CI final
43773112709 sobre head 8a0b389: 109 pruebas, 24 casos de navegador y tres flujos
con Auth/REST locales reales aprobados; auditoría de dependencias de producción
sin vulnerabilidades conocidas. El caso móvil importa ambas órdenes coincidentes,
reabre la segunda, comprueba foco, edición/invalidez, reconfirma y conserva ambas.
La API main se verificó de nuevo: 66 pruebas, sintaxis/build y auditoría aprobados.

En producción, con coordenadas públicas de prueba y proveedores reales de búsqueda,
se prepararon dos entradas iguales, se confirmó cada una, apareció el aviso y se
importaron como parada 1 y destino, ambas con el mismo Plus Code. El documento
no se guardó ni se crearon cuentas o rutas alojadas. Esto verifica importación;
no es OCR de un manifiesto de usuario ni cálculo ORS autenticado en producción.

También se repitieron salud, coordenadas, Plus Codes completo/compuesto y búsqueda
Express: 200; ocho sugerencias en Monterrey, primera a 4,861 m en línea recta del
origen sintético. Validate: dos puntos y 48 intermedias aceptados, 49 rechazadas;
plan sin sesión sigue 401. Las integraciones de rutas usan ORS simulado y sesiones
locales reales; no acreditan navegación Android física ni datos reales de tráfico.

PR #18: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/18.
Commit publicado 0f8be4d9a8d8bf68d9d5d7540c1105e553c414dd;
despliegue dpl_3HBMRwx9kgMtsS4Hk93hYtFGc7qA, READY y alias verificado:
https://route-planner-web-sand.vercel.app/.
API permanece en 6fad021 / dpl_FNdvSQM2HMky1kreq84MnQ7cugjc:
https://route-planner-api.vercel.app/.
Rollback de este ciclo: Web dpl_4YAb5nFU5bmdHUiWK1Gt4iopbFfZ (191b166), sin
migraciones que revertir. Git conserva ambos commits y ramas de recuperación.

Supabase se volvió a consultar: ACTIVE_HEALTHY y seis tablas públicas con RLS;
permanece únicamente el aviso ya registrado de contraseñas filtradas. Sin cambios
alojados. Vercel no devolvió errores/fatales agregados en la ventana de 30 minutos
revisada; no es garantía de ausencia permanente de fallos. Gestión y otros
proyectos no se modificaron; no se generaron servicios o planes de pago.

Completado: preservación de pedidos y revisión de coincidencias. Parcial: precisión
y cobertura de proveedores. Durante la verificación visual se detectó un fallo
anterior de centro cartográfico al mostrar el planificador oculto; se aborda en
el ciclo siguiente. Continúan pendientes permisos, horarios, vigencia y geometrías
municipales; siguen 15 referencias parciales y cero validaciones legales completas.


### Punto de reanudación anterior cerrado

La corrección del centro se validó y publicó en el ciclo siguiente. Los commits
de recuperación e963e7f y 8a243b3 quedan en el historial. No hay código de este
ciclo pendiente de publicar.

## Ciclo: centro cartográfico al mostrar el planificador · 15-11-2026

La comprobación visual del flujo anterior expuso un desplazamiento geográfico
al pasar de un panel oculto al mapa. El ResizeObserver desactivaba con `pan:false`
la compensación de tamaño de Leaflet 1.9.4. No era una respuesta errónea del
geocodificador. Se restableció la compensación con animación desactivada, sin
recalcular ni reenmarcar todas las paradas y conservando el centro del operador.

Archivos de código: components/RouteMap.tsx y test/geolocation.e2e.mjs. Documentos:
MAP-VIEWPORT.md, NAVIGATION-OPTIONS.md y este cierre. Sin cambios de dependencias,
API, variables, datos alojados, esquema, RLS o servicios de pago.

### Pruebas y producción

TypeScript, build y 109 pruebas Web locales aprobados. El primer caso nuevo
falló por un selector ambiguo de prueba (opción del vehículo); se corrigió
acotándolo al listbox del origen. CI final 43774511555, head e963e7f, aprobó
109 pruebas, 25 casos de navegador, tres flujos con Auth/REST locales reales y
auditoría sin vulnerabilidades de producción conocidas.

La regresión confirma el marcador, oculta el planificador, cambia el tamaño de
viewport y vuelve a comprobar su centro en escritorio y orientación móvil.
Usa cajas DOM visibles, sin acceso a estado privado de Leaflet. El resto de
flujos conserva GPS, manifiestos, Plus Codes, múltiples paradas, navegación,
preferencias, selección de alternativas, guardado, papelera y aislamiento RLS.
ORS en las integraciones sigue simulado; no son cálculos reales autenticados de
producción ni navegación Android física.

En navegador público se cargó el planificador desde la guía, se confirmó un
origen con coordenadas públicas de prueba y geocodificación real, se pasó de
nuevo por la guía y se regresó al mapa. El marcador permaneció centrado: desfase
DOM medido 0 px horizontal y 0 px vertical. Se capturó el mapa real de Chihuahua,
sin inyectar respuestas o ubicación. No se calculó ni guardó una ruta alojada.

El proxy de producción se volvió a comprobar después del despliegue: salud,
coordenadas, Plus Code completo/compuesto y Express; validación de dos puntos y
48 paradas, rechazo de 49 y protección 401 sin sesión. Validación de entrada no
equivale a cálculo real. Los logs agregados de Web/API no mostraron errores ni
fatales en los 30 minutos revisados; no es garantía permanente.

### Publicación y recuperación

PR #19: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/19.
Web publicada: **4d693ab327bff2a759c35702f0295d4c422900be**, despliegue
**dpl_GckiwsqF2o53gixMS7pZ19aXoEos**, alias READY verificado:
https://route-planner-web-sand.vercel.app/.
API continúa en **6fad021dd414a964056ad029e8f4dc80033c577d**, despliegue
**dpl_FNdvSQM2HMky1kreq84MnQ7cugjc**, alias READY verificado:
https://route-planner-api.vercel.app/.
La API main contiene reportes automáticos posteriores; no se sobrescribieron.
El cierre documental posterior de Web no cambia el código probado y desplegado.

Rollback inmediato de Web: **dpl_3HBMRwx9kgMtsS4Hk93hYtFGc7qA** (0f8be4d),
que conserva la corrección de manifiestos. Para el ciclo de manifiestos se
conserva además dpl_4YAb5nFU5bmdHUiWK1Gt4iopbFfZ (191b166). No hay migraciones
ni datos que revertir. Gestión y demás proyectos no se modificaron; no se
contrataron ni activaron funciones de pago.

### Estado y próxima prioridad

Completados y publicados: preservación de pedidos, avisos y foco de revisión,
compensación del centro del mapa y documentación del ciclo de Chihuahua.
Parcial: cobertura/precisión de proveedores y normativa municipal. Se mantienen
15 referencias parciales, cero validaciones legales completas y sin geometrías
municipales nuevas aplicadas al cálculo. El monitor reporta Puebla con cambios y
fuentes de Juárez/CDMX sin comprobación; no se interpretan como reformas vigentes.

Investigación terminada: NAVIGATION-OPTIONS.md contrasta Maps URLs y la opción
OsmAnd/GPX con fuentes primarias del 15-11-2026. La importación y navegación GPX
son candidatas para un ensayo gratuito sujeto a sus límites; no se instalaron
productos, activaron compras ni se probó ese navegador físicamente. Los puntos
guía no bloquean Google Maps ni le transmiten dimensiones, peso o permisos HGV.

Próxima prioridad P1: conectar la corroboración de manifiestos con el mapa central
para comparar sucursales sin cambiar de contexto, conservando confirmación y
cancelación de búsquedas obsoletas. Después, completar acuerdos locales,
permisos/excepciones y geometrías/sentidos oficiales verificables. Siguen
pendientes ORS autenticado real en producción, Android físico, enlaces compartidos
con permisos y otras funciones del programa maestro. **El programa no está terminado.**


## Ciclo: corroboración del manifiesto en el mapa central · 15-11-2026

### Diagnóstico y alcance

Se retomó main Web db6715d y API 669579a, leyendo ambos informes de main y
comprobando los alias READY. La revisión del manifiesto usaba su propio buscador,
pero no trasladaba sus sugerencias al mapa principal: comparar sucursales obligaba
a cambiar de contexto. No había un nuevo fallo P0 reproducible en las búsquedas
públicas. No se sobrescribieron cambios de otras ejecuciones.

Ahora la entrega activa muestra S1, S2… con el mismo orden y referencia cercana
del buscador. El popup conserva avisos de número aproximado y de acceso de
carga. Confirmar afecta únicamente a la fila vigente y avanza a la siguiente;
tras la última, vuelve el foco al botón de importación. Editar, excluir, cambiar
fila/referencia/sección o cerrar invalida el lote. Se exige coincidencia de token,
fila, consulta y punto canónico, conservando metadatos del proveedor.

Las entregas sólo pasan al recorrido con «Añadir entregas confirmadas». Revisar
conserva geometría y métricas del resultado previo; importar sí lo invalida para
recalcular. La navegación activa se detiene durante la revisión y no se reanuda
sola. Se reutilizan debounce, caché y cancelación existentes, sin consultas masivas,
servicios o dependencias adicionales. No se restaura un límite de ocho entregas.

Archivos: app/page.tsx, components/ManifestImport.tsx, components/RouteMap.tsx,
lib/manifest-map.ts, test/manifest-map.test.mjs, test/account-workflows.test.mjs,
test/geolocation.e2e.mjs y docs/MANIFEST-CENTRAL-MAP.md. Este informe y
MEXICO-COVERAGE.md contienen el cierre persistente.

### Pruebas y comprobación pública

TypeScript, build, 114 pruebas Web y auditoría sin vulnerabilidades conocidas
aprobados localmente. La primera CI encontró una aserción inmediata al retirar
el popup: se hizo explícita la limpieza al cerrar y la prueba espera la retirada
DOM de Leaflet. CI final 43803464845, head 87ae649: 114 pruebas, 27 casos de
navegador y tres flujos Auth/REST locales reales, todos aprobados. Las regresiones
nuevas prueban selección de la fila correcta, eventos atrasados, cierre, avisos,
proximidad, foco final, conservación de ruta/métricas y detención del GPS.

La comprobación en navegador de producción usó coordenadas públicas de prueba
en Monterrey y proveedores reales, sin inyectar respuestas ni usar la ubicación
del propietario. «Bodega Aurrera Express» devolvió ocho sugerencias a 4.2–9.3 km
en línea recta. Se abrió S1 (José Timoteo Rosales), se vio el aviso de acceso de
descarga y se cerró el manifiesto: cero popups y marcadores de sugerencia. Al
reabrir se confirmó desde el mapa; el destino seguía vacío hasta la importación.
El foco terminó en «Añadir 1 entregas confirmadas» y la importación conservó el
origen, la sucursal seleccionada, Plus Code y coordenadas del enlace de Google.
No hubo desbordamiento horizontal en esa vista de escritorio. Se capturó evidencia
visual del mapa y la lista. No se calculó ni guardó una ruta alojada.

El proxy público respondió 200 para salud, coordenadas, Plus Code completo y
compuesto y ocho resultados Express. Validó dos puntos y 48 intermedias; rechazó
49 con 400 y plan sin sesión con 401 AUTH_REQUIRED. Validar entradas no equivale
a calcular esas rutas. Las integraciones calculan dos/múltiples puntos con ORS
controlado y sesiones locales; no acreditan un cálculo autenticado real en
producción. Los viewport móviles de CI no son navegación Android física.

### Publicación y rollback

PR Web #20: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/20.
Commits de trabajo 95afe67 y 87ae649; merge publicado
**b99253cdb6bc567a1c71218a5cf63ada5b590ba2**.
Despliegue **dpl_BJ6evNZR9k4rM7W3CTrYEX3efhcA**, READY y alias con ese SHA:
https://route-planner-web-sand.vercel.app/.
Rollback: **dpl_GckiwsqF2o53gixMS7pZ19aXoEos** (4d693ab). Sin migraciones
ni datos que revertir. Los commits y la rama de trabajo quedan en GitHub.


## Ciclo: PDF municipal de Puebla bajo vigilancia · 15-11-2026

### Causa, implementación y límites

COREMUN carga un visor PDF; vigilar sólo su página HTML no detectaba cambios
independientes del documento. Se siguió el enlace del visor oficial y se añadió
https://gaceta.pueblacapital.gob.mx/media/k2/attachments/COREMUN.pdf al registro
de Puebla y a los enlaces públicos de la guía. Se conserva el monitor existente,
con host oficial permitido, límite de descarga y evidencia por documento. No se
modifica ninguna norma, ventana horaria, umbral, geometría ni permiso.

La descarga real dio HTTP 200 y 8,017,957 bytes, hash
`b8015929109522726f95e0d9278564592757bcd2a690abe0a326e898ae1c891f`.
La portada se declara informativa, consolidada al 10-12-2025 y remite al Periódico
Oficial. Localizar artículos en ella no valida íntegramente el código ni actos
posteriores; el PDF permanece `unreviewed`. Se mantienen 15 municipios con alguna
referencia parcial y cero con validación legal automática completa.

Archivos API: data/mx/national-references.json, data/mx/source-status.json,
test/source-monitor.test.js y docs/MEXICO-COVERAGE.md. Se incorpora a este cierre
la comprobación del monitor automático posterior sin sobrescribir su reporte.

### Pruebas, publicación y seguimiento

67 pruebas API, build y auditoría sin vulnerabilidades conocidas aprobados.
CI 43804005124 (head 92b13b2) aprobó además migraciones y aislamiento RLS en
Postgres desechable. La prueba nueva cambia sólo el PDF detrás de páginas
idénticas y verifica evidencia pública de cambio sin aprobación legal.

La ejecución real de las 04:23 UTC del 16-11 (15-11, Chihuahua) registró OJP con
503, sin ocultar el PDF recuperado. Después del merge, el monitor automático
creó **f2b56fdf6b303c84e8f13a7215c4845ddc41822f**, reporte 04:27:52 UTC,
con el mismo hash del PDF; OJP volvió a responder. Puebla mantiene cambios en
sus páginas y el PDF sin revisión legal. La programación solicita seis horas,
pero los tiempos de GitHub pueden demorarse; no es vigilancia en tiempo real
ni actualización automática de reglas. Cambios de HTML no prueban reformas.

PR API #16: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/16.
Merge publicado **1e3482b282d3aaa55c840f37ed492e1d4d41dcb4**, despliegue
**dpl_7yJT4EeyGrXPQX7T2s3guv3huJSg**, READY y alias con ese SHA:
https://route-planner-api.vercel.app/.
La API directa y el proxy devolvieron 200 y el PDF correcto (`unreviewed`, hash
anterior), con `routingEnforced:false` y sin actualización legal automática. En
esa comprobación aún sirvieron el reporte 04:23:34 UTC y OJP 503; la evidencia
04:27:52 está confirmada en GitHub, no se presenta como ya refrescada en el
endpoint. La caché de consulta remota es de 15 minutos y conserva el snapshot
local ante un fallo. CORS respondió 204 con el origen Web autorizado.
El commit automático posterior sólo actualiza esa evidencia; no sustituye el
SHA del código desplegado. Rollback API:
**dpl_FNdvSQM2HMky1kreq84MnQ7cugjc** (6fad021), sin migraciones alojadas.
El cierre documental posterior en Web tampoco cambia su código publicado.

Los logs agregados Web/API no devolvieron errores ni fatales en los 30 minutos
revisados; no es garantía permanente. La consulta inicial de Supabase mostró
ACTIVE_HEALTHY y seis tablas públicas con RLS, con el aviso previo de protección
de contraseñas filtradas desactivada. No se modificaron datos, configuración,
variables o políticas alojadas. No se modificó Gestión ni otros proyectos y no
se contrataron o activaron servicios de pago.

### Estado y punto de reanudación

Completados/publicados: corroboración central del manifiesto y vigilancia directa
del PDF de Puebla. Parciales: precisión/cobertura del proveedor y normativa.
Pendientes: contraste de COREMUN/Periódico Oficial y actos posteriores, acuerdos
de horarios/permisos, excepciones, sentidos y geometrías oficiales; siguen cero
municipios con validación automática completa. Google Maps puede recalcular y
no recibe parámetros HGV; los puntos guía no fijan un trazado exacto.

Próxima prioridad P1: revisar la fuente consolidada de Puebla con sus actos
posteriores, separando maniobras/estacionamiento de circulación y sin interpretar
el umbral ambiguo de 3.5 t; incorporar sólo evidencia con ámbito y fechas
comprobables. Continuar las geometrías oficiales verificables y pruebas reales
ORS/Android cuando exista sesión/dispositivo autorizado disponible, sin presentar
fixtures como sustituto. Quedan también enlaces compartidos con permisos y las
otras funciones abiertas del programa maestro. **El programa no está terminado.**


## Ciclo: ámbito y procedencia por disposición de Puebla · 15-11-2026

### Diagnóstico, cambios y alcance

Se retomaron main Web e2ff1e9 y API f2b56fd, leyendo ENGINEERING-STATUS y
MEXICO-COVERAGE de main y comprobando los alias READY b99253c/1e3482b. Las
búsquedas públicas respondieron y no se reprodujo un nuevo P0 de red. Supabase
Route Planner estaba ACTIVE_HEALTHY, con seis tablas públicas y RLS activo;
la inspección fue de sólo lectura, sin modificar datos o configuración alojada.

La revisión seleccionada de COREMUN separa materias que no deben confundirse:
298 I–III (horas/zonas y maniobras), 299 I–III (transporte y autorizaciones),
323 Quindecies (duración/espacios de maniobras) y Sexdecies (estacionamiento
rotativo por tonelaje). Se añadieron cuatro referencias con actividad,
jurisdicción, ámbito específico, consulta, consolidación indicada, hash y página
propia. El tonelaje no precisado por Sexdecies no se asigna al peso bruto o
capacidad del perfil. No se inventa una ventana del artículo 298 ni una
prohibición municipal general de circulación.

La portada informativa indica consolidación al 10-12-2025 y remite al Periódico
Oficial. Son disposiciones seleccionadas, con publicación y vigencia posterior
pendientes; no una revisión íntegra de los 1,166 folios. Se conservan las cinco
fichas previas de RES. 2021/49. La descarga consolidada de OJP volvió a fallar
(502 en el lector web); no se reemplaza por texto de 2020 de los buscadores.

Archivos API: data/mx/national-references.json, test/municipal-regulations.test.js,
docs/MEXICO-COVERAGE.md y nuevo docs/PUEBLA-OPERATIONS-REFERENCE.md.
Archivos Web: components/MunicipalCoverage.tsx, test/municipal-review.test.mjs,
test/geolocation.e2e.mjs y esos dos documentos. La interfaz distingue la actividad
y las fechas/ámbitos por ficha en lugar de atribuirles la fecha de otra fuente.

### Verificación y publicación del primer avance

Build, 68 pruebas API y auditoría sin vulnerabilidades conocidas aprobados. CI
43805379458, head 6716d11, aprobó además migraciones e aislamiento RLS en
Postgres desechable. Web: TypeScript, build y 115 pruebas locales; CI 43805380626,
head e12d250, aprobó 115 pruebas, 28 casos de navegador y tres flujos con sesiones
Auth/REST locales reales, más auditoría sin vulnerabilidades conocidas.
El caso de guía verifica ámbito, fechas, enlace propio y ausencia de desbordamiento
en escritorio y viewport móvil. No equivale a Android físico ni ORS real.

API pública/proxy: cuatro registros nuevos con páginas 159, 160 y 176,
consulta 15-11-2026 y routingEnforced:false, HTTP 200. En navegador de producción
se consultó Puebla, se leyeron las cuatro procedencias y se comprobó el orden
alfabético de las entidades. No se guardó ni calculó una ruta alojada.

PR API #17: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/17.
Código publicado **4255ad7ea68a5e0285f9f97ac49fa04d6f8895fc**,
despliegue **dpl_5TTHpaqDKNXcNmQWiP6Sc4XSk54Q**, READY.
PR Web #21: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/21.
Código publicado **1ceb953f50d3798a35292960d44298d5aca9c424**,
despliegue **dpl_F4Q2itcRPFpuTCnMeWWe9o89HPw4**, READY.
Alias verificados: https://route-planner-api.vercel.app/ y
https://route-planner-web-sand.vercel.app/.
Rollback de ese primer avance: API dpl_7yJT4EeyGrXPQX7T2s3guv3huJSg (1e3482b)
y Web dpl_BJ6evNZR9k4rM7W3CTrYEX3efhcA (b99253c), sin migraciones.
El reporte automático 369c049 posterior al merge se preservó.


## Ciclo: ventanas citadas, capacidad inclusiva y compatibilidad · 15-11-2026

### Fuente, implementación y causa del ajuste

La búsqueda en fuentes oficiales localizó RES. 2025/88 y el acta C26/11 del
14-08-2025. La página PDF 70 del acta contiene arts. 11–13 de las reglas del
programa: distingue capacidad hasta 3.5 t de capacidad mayor, cita una ventana
nocturna y exige permiso previo/duración. Se descargó el PDF oficial real,
HTTP 200, 2,395,402 bytes, hash
`0917dc30ac70594a6e954243800bc5219d7ea3f2bc8017f7ea532b8ec510555c`,
y se revisó visualmente la página 70. La creación técnica del PDF en 2026 no se
utiliza como fecha del acto ni publicación legal.

Se añaden tres fichas separadas para corredores del programa: capacidad hasta
3.5 t inclusive, capacidad mayor con cruce de medianoche y permiso/duración.
Se conservan días en null, zona America/Mexico_City, excepción por sustancias,
permiso requerido, fuente/hash y fecha del acto. Las ventanas son referencias
de maniobras, no autorización de circulación/estacionamiento ni exclusiones de
calles en Directions. Faltan publicación/vigencia completa, actos posteriores,
corredores y geometrías oficiales verificadas.

El comparador Web admite lte sólo cuando la fuente lo declara. Con capacidad
3.5 t coincide únicamente ese dato del art. 11 a; los comparadores estrictos
anteriores conservan el caso de frontera. No se sustituye capacidad por peso
bruto ni se acepta un comparador contradictorio. La guía diferencia fecha del
acto y consolidación documental.

Antes de publicar se detectó que clientes anteriores esperaban una consolidación
en evidence. Se conservaron esas fichas y se añadió actEvidence para las actas.
La nueva Web lee ambos tipos; la anterior conserva texto/enlaces de las actas.
El problema potencial no se publicó. No se inventó una fecha de consolidación
para adaptar los datos a un cliente antiguo. API y Web mantienen rollback.

Archivos adicionales: Web lib/municipal-vehicle-review.ts y su prueba,
MunicipalCoverage.tsx, pruebas de componente/navegador y documentos de Puebla.
API: registro, reporte técnico de fuentes, prueba municipal y documentos. El
nuevo PDF quedó en relatedUrls del monitor existente, sin proveedor, servicio,
cron o dependencia adicional. Siguen siete fuentes principales y 15 municipios
con referencias parciales; cero con validación legal automática completa.

### Pruebas finales y transición pública

TypeScript/build y 117 pruebas Web locales aprobados. API build y 69 pruebas
aprobados. CI final Web **43806800084**, head **41ae4a2**: 117 pruebas,
28 casos de navegador, tres flujos Auth/REST locales reales y auditoría sin
vulnerabilidades conocidas, todos aprobados. CI final API **43806797041**,
head **14c1417**: 69 pruebas, migraciones/aislamiento RLS en Postgres desechable
y auditoría sin vulnerabilidades conocidas. Las primeras versiones 539452d y
f54e83c también pasaron CI, pero se corrigió la compatibilidad antes de publicar.

La regresión distingue un umbral inclusivo de los estrictos, capacidad de peso
bruto, comparadores malformados, fecha del acto y consolidación. La prueba de
navegador verifica ambos tipos documentales en móvil/escritorio. ORS y sensores
son controlados en las integraciones; no son cálculos autenticados reales de
producción ni navegación Android física.

Se publicó la API y se probó una pestaña ya abierta con Web 1ceb953: al volver
a consultar Puebla mostró las 12 fichas y tres enlaces a página 70, sin recarga,
fallo ni respuestas inyectadas. La Web anterior mostraba las cuatro procedencias
de COREMUN y el texto/enlaces nuevos; no se afirmó que presentara los nuevos
metadatos de acta. Después se publicó la Web final y se recargó esa pestaña.

La comprobación final pública, con datos manuales sintéticos de camión (capacidad
3.5 t, peso bruto de ejemplo 40 t), mostró 12 fichas y siete procedencias: cuatro
con consolidación 10-12-2025 y tres con acto 14-08-2025. El comparador inclusivo
mostró «coincide sólo este dato» para capacidad 3.5 t, conservando advertencias
de permiso, días, ámbito y vigencia. Se verificaron los tres enlaces propios a
página 70 y ausencia de desbordamiento horizontal en escritorio. Se capturó
pantalla. No se guardó vehículo/ruta ni se hizo un cálculo alojado.

### Publicación, monitor y rollback

PR API #18: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/18.
Código publicado **7510d45854830c5c1baeed01132394b78fe74d58**,
despliegue **dpl_HhqaKtVHeyK7JEub8X7fQSEp13mn**, READY y alias verificado:
https://route-planner-api.vercel.app/.
PR Web #22: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/22.
Código publicado **b0cab9823ba6d0cd13c78e647d1b8ebd95f18846**,
despliegue **dpl_DFZkDGST4Soa4PhgDt6TcDFbiXQ5**, READY y alias verificado:
https://route-planner-web-sand.vercel.app/.

Rollback inmediato: API **dpl_5TTHpaqDKNXcNmQWiP6Sc4XSk54Q** (4255ad7) y
Web **dpl_F4Q2itcRPFpuTCnMeWWe9o89HPw4** (1ceb953). Sin migraciones o datos
que revertir. La compatibilidad con esa Web anterior y API nueva se verificó
públicamente; no se ejecutó un rollback de producción. Los commits y ramas de
ambos ciclos quedan en GitHub. El cierre documental posterior de main no cambia
el código comprobado en los alias.

El informe automático **62f901e0a1a0cb6aac13875825ca7d24873c9f8a**, 04:56:11 UTC
del 16-11 (15-11, Chihuahua), conservó el mismo hash del acta, sin revisión legal
completa. No se sobrescribió. La comprobación pública servía el reporte 04:46:25
con el PDF recuperado y OJP 503; era evidencia técnica fresca y no validación
legal. El reporte remoto y la caché de 15 min se distinguen; no se inventa que
la recuperación más reciente de OJP ya esté reflejada en el endpoint. La
programación del monitor puede demorarse y no actualiza reglas automáticamente.

El proxy público volvió a responder 200 a salud, coordenadas, Plus Code completo
y compuesto y ocho coincidencias Express cercanas. Validación: dos puntos y
48 intermedias 200, 49 intermedias 400; plan sin sesión 401 AUTH_REQUIRED.
Validar entradas no equivale a calcular esos recorridos. CORS respondió 204 con
el origen Web autorizado; un origen ajeno obtuvo 404 en OPTIONS sin cabecera de
autorización. El script de la comprobación negativa se ajustó para inspeccionar
la respuesta HTTP rechazada, no tratarla como fallo de conexión. Los logs Web/API no
mostraron errores/fatales agregados en los 30 minutos revisados, sin garantía
permanente. No se modificó Gestión ni otros proyectos; no se contrataron ni
activaron servicios de pago, ni se cambiaron secretos, variables, esquema o RLS
alojados. El trabajo quedó limitado a los dos repositorios y proyectos autorizados.

### Estado y próxima prioridad

Completados/publicados: cuatro referencias seleccionadas de COREMUN, tres del
acta, comparador inclusivo, fechas/ámbitos por ficha, compatibilidad con clientes
anteriores y seguimiento del PDF nuevo. Parciales: cobertura/precisión de fuentes
y vigencia normativa. El catálogo nacional continúa separado de la validación
legal; no se añadieron geometrías municipales al motor ni se certificó una ruta.
Google Maps sigue sin recibir parámetros HGV y puede recalcular su trazado.

Próxima prioridad P1: extraer y contrastar los corredores/anexos del acta de
Puebla, su cadena de publicación/entrada en vigor y actos de 2026, diferenciando
horas de estacionamiento de maniobras. Conservar fuente/página/extremos/sentidos;
no usar centroides de geocodificación como geometrías legales ni activar una
exclusión sin evidencia suficiente. OJP, fuentes intermitentes y permisos
individuales siguen pendientes. Continúan ORS autenticado real en producción,
Android físico, enlaces compartidos con permisos y las demás funciones abiertas
del programa. **El programa maestro no está terminado.**


## Cierre: corredores citados de Puebla y búsqueda precisa · 16-11-2026

### Diagnóstico, evidencia y alcance

Se retomó main Web 42f149f y API 5249294, conservando el nuevo reporte técnico
de fuentes. Producción seguía en b0cab98/7510d45. La consulta de Puebla mostraba
las 12 fichas legales parciales, pero no permitía buscar los corredores del
anexo. Se extrajeron 128 registros del acta C26/11, páginas 80–88, por separado
de las ventanas de maniobras y las prohibiciones de estacionamiento.

Descarga oficial real repetida el 16-11: HTTP 200, 2,395,402 bytes, SHA-256
0917dc30ac70594a6e954243800bc5219d7ea3f2bc8017f7ea532b8ec510555c. El JSON se
reprodujo sin diferencias. La revisión inicial y de las nueve páginas fue del
15-11 y se conserva esa fecha de consulta. Un archivo controlado con otra huella
se rechazó con SOURCE_CHANGED antes de producir datos. No se autoaprueban cambios.

Se conservan seis etiquetas de polígono, los duplicados 10/15 y 126/128, la
discrepancia de numeración 5/6 para San Alejandro y ambas páginas del registro
124. El Transitorio Primero exige publicación en Gaceta: no se conoce aún la
fecha efectiva verificada. Horarios de operación no son ventanas de descarga,
ni «No aplica» equivale a permiso. No hay sentidos/geometrías viales validados.
Siguen 15 municipios parciales y cero con validación legal completa.

La Web consulta bajo demanda, filtra por calle/cruce y polígono, muestra número
original, horarios, alcance y enlace por página. La API omite las celdas crudas
del payload pero mantiene esa evidencia versionada. El campo opcional preserva
compatibilidad con las versiones anteriores. No cambia Directions/timeRules.

Durante CI se detectó que el selector heredaba un nombre accesible que incluía
sus opciones. Se corrigió con aria-label explícito antes de publicar. Después,
la verificación real detectó que «29 A Norte» coincidía con «29 Norte» por la
A de Alejandro: se exigió palabra completa para números y sufijos de una letra.
Los nombres restantes conservan búsqueda parcial y acentos normalizados; los
cruces siguen siendo consultables. Se añadió regresión para A/B y 12/112/129.

Archivos principales API: lib/municipal-regulations.js,
data/mx/21114-parking-corridors.json, scripts/import-puebla-parking.py y
test/municipal-regulations.test.js. Web: MunicipalParkingCorridors.tsx,
MunicipalCoverage.tsx, lib/parking-corridors.ts, globals.css, pruebas de
parking-corridors y geolocation.e2e. Ambos: PUEBLA-PARKING-CORRIDORS.md,
PUEBLA-OPERATIONS-REFERENCE.md y MEXICO-COVERAGE.md. Sin dependencias nuevas.

### Pruebas y resultados

API: build y 70 pruebas locales aprobados; auditoría cero vulnerabilidades
conocidas. CI 43897992427 aprobó código 1b97114, 70 pruebas, migraciones y RLS
en Postgres desechable. El commit posterior ceaab4c sólo documentó la nueva
descarga; no cambió código. La lista de runs por SHA aparecía vacía: se localizó
el run real en Actions y se confirmaron sus jobs/logs. No se sustituyó esa
comprobación por un estado supuesto.

Web: primer CI 43897438763 aprobó Auth local pero detectó el selector; no se
publicó esa versión defectuosa. e98f4e6 pasó CI 43898376913 con 120 pruebas,
29 casos de navegador y tres flujos con Auth/REST locales reales. El ajuste
posterior de búsqueda pasó localmente 121 pruebas, typecheck y build.
CI final 43899967824 sobre 007b330: 121 pruebas, 29 casos de navegador,
tres flujos Auth locales y auditoría sin vulnerabilidades, todos aprobados.
El caso ampliado incluye una calle similar y exige sólo el registro 124 para
«29 A Norte». Se publicaron únicamente versiones con CI funcional aprobado.

Los casos de interfaz prueban 390×844 y 1280×900 con respuestas controladas.
Auth usa una instancia local desechable y API fijada en 27e8082; los proveedores
y GPS de integración no son una ruta ORS autenticada de producción ni sensores
de Android físico. No se presenta esa prueba como verificación de navegación
real. Supabase alojado respondió ACTIVE_HEALTHY y seis tablas públicas con RLS;
no se cambiaron esquema, políticas ni datos alojados.

Comprobación pública en navegador, sin respuestas inyectadas: 128 registros
iniciales; consulta por cruce preservó 125/126/128 (incluidas las dos repeticiones).
Tras publicar el ajuste, «29 A Norte» y polígono 5 devolvieron únicamente 124,
con enlaces exactos a páginas 87 y 88. Se comprobó el estado sin coincidencias y
la recuperación de los 128 al limpiar filtros. Sin desbordamiento horizontal en
escritorio. Se guardó captura y pestaña de evidencia; no se crearon datos de
usuario ni se ejecutó un cálculo alojado. El Android físico sigue pendiente.

Sondas públicas: salud, coordenadas, Plus Code completo/compuesto y ocho
coincidencias Express próximas HTTP 200. Validación de dos puntos y 48 entregas
200; 49 entregas 400; cálculo sin sesión 401 AUTH_REQUIRED. Validar no equivale
a calcular. Dos sondas iniciales tuvieron timeout de lectura; al repetirlas
respondieron correctamente. No se atribuye ese timeout aislado a un defecto
del servicio sin evidencia. CORS autorizado 204 con origen Web; origen ajeno
404 sin cabecera de autorización. API pública: 128 registros, duplicados y
páginas 87/88 conservados, ninguna celda cruda expuesta, geometrías nulas,
timeRules vacío, catálogo 15 parciales/0 completas.

Logs Web/API: ninguna agrupación error/fatal en los 30 minutos finales
consultados; esto no garantiza ausencia permanente de fallos. El endpoint de
fuentes devolvió HTTP 200, siete fuentes y evidencia del 16-11-2026 07:02:16 UTC,
sin marca de antigüedad; es seguimiento técnico, no revisión legal.

### Publicación y recuperación

API PR #19: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/19.
Commit publicado 241b96686cd6e63f78f668de2c2fb806f0124505, deployment
dpl_8HxcehAAZHLwsHTwKBbPMLzmtBAJ, READY, alias comprobado:
https://route-planner-api.vercel.app/.
Web PR #23: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/23,
primera versión 9899a1d8a6e7aa884b34bb5ca0d92207ac6cb2ae, deployment
dpl_7Nw3FKdiwNHgMkzBucKPnXmeNxwY.
Web final PR #24: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/24.
Commit 6c6be580881f958bdde2eb34d164329e07675836, deployment
dpl_DYpnRq1tErfEETKeFGUM28TJpnZA. READY y alias verificado con ese commit:
https://route-planner-web-sand.vercel.app/.

Rollback a la entrada del ciclo: Web dpl_DFZkDGST4Soa4PhgDt6TcDFbiXQ5
(b0cab98) y API dpl_HhqaKtVHeyK7JEub8X7fQSEp13mn (7510d45). Se conserva
también la primera Web de este ciclo. No hay migraciones/datos que revertir;
no se ejecutó un rollback de producción. El cierre documental posterior en
main no cambia el código publicado. Historial y ramas de recuperación en GitHub.
Sólo se modificaron los dos repositorios y proyectos de Route Planner. No se
accedió ni modificó Gestión u otros proyectos, ni se activaron gastos/servicios.

### Estado y siguiente prioridad

Completado/publicado: extracción trazable del anexo, consulta por calle/cruce,
filtros, accesibilidad y corrección de sufijos/números. Parcial: cobertura legal,
vigencia documental y precisión geográfica. Pendiente P1: reconstruir publicación
y entrada en vigor del acta, actos posteriores de 2026, resolver oficialmente
5/6 y contrastar sentidos/extremos con geometrías verificadas antes de aplicar
restricciones. No usar centroides geocodificados como geometría legal.

El PDF ya pertenece al monitor existente de Puebla; no se creó otro servicio.
Sus cambios técnicos requieren revisión y no alteran normas automáticamente.
Google Maps no recibe dimensiones HGV ni conserva obligatoriamente el trazado.
Continúan pendientes ORS autenticado real en producción, Android físico,
funciones de compartir con permisos y los demás pendientes del programa.
**El prompt maestro no está terminado; no se declara cobertura nacional completa.**


## Cierre: publicación histórica y cambios de sanciones en Puebla · 16-11-2026

### Diagnóstico y cambio implementado

Se revisó main Web 716cf90 y API 241b966, con producción 6c6be58/241b966. Los informes mantenían pendiente la cadena de publicación
del estacionamiento rotativo. Las sondas públicas de búsqueda, confirmación y
validación respondieron correctamente; no se reprodujo un nuevo P0 de red.

Se descargaron realmente cuatro páginas de Gaceta municipal, todas HTTP 200:
RES. 2025/148 y Tomo LXXXIII núm. 1, y RES. 2025/162 y Tomo LXXXIV núm. 1.
La primera reforma se aprobó/publicó el 14-08-2025; el considerando X de la
segunda corrobora la publicación en esa fecha. La segunda se aprobó/publicó el
18-09-2025. No se usaron fechas del buscador, creación técnica de PDF ni firma
del dictamen en comisión como sustitutos de la aprobación/publicación.

La fecha inicialmente citada de sanciones del Polígono 5 San Alejandro–Ortopedia
era 01-10-2025; RES. 2025/162 la cambió a 01-11-2025. La aplicación muestra la
primera como sustituida y la segunda como fecha histórica modificada, sin
declarar vigencia actual o permiso de circulación/descarga. No se extienden esas
fechas a los demás polígonos o a todo Puebla. No se interpreta una fecha de
sanciones como horario diario ni se resuelve por analogía la discrepancia 5/6.

El hallazgo sólo corrobora publicación de la reforma RES. 2025/148. La
publicación íntegra de todas las reglas/anexo y la vigencia de cada disposición
siguen pendientes. Se mantuvo intacto el snapshot reproducible del PDF, incluido
source.entryIntoForce.publicationDate=null; publicationReview conserva la
evidencia nueva por separado. No se asignó al texto íntegro la fecha de otra
resolución. Continúan 128 registros, 15 municipios parciales y cero con validación
legal completa; no hay geometrías, timeRules o exclusiones nuevas de Directions.

API añade data/mx/21114-parking-publications.json, el campo opcional de revisión,
pruebas y cuatro URL al monitor existente de Puebla. Cada fuente conserva
tamaño, SHA-256, fecha y apartados seleccionados. Las huellas de HTML pueden
variar por elementos del sitio y no prueban una reforma. La Web añade
MunicipalPublicationHistory.tsx, tipo opcional en parking-corridors, presentación
en MunicipalParkingCorridors, CSS, pruebas de componente/navegador y fixture.
API modifica además lib/municipal-regulations.js, test/municipal-regulations.test.js
y data/mx/national-references.json. Web modifica lib/parking-corridors.ts,
app/globals.css, test/parking-corridors.test.mjs y test/geolocation.e2e.mjs,
y añade test/fixtures/parking-publications.mjs. Ambos repositorios incluyen PUEBLA-PUBLICATION-HISTORY.md y actualizan los
documentos de anexo y cobertura nacional. No hay dependencias o servicios nuevos.

### Pruebas, producción y límites

Locales: build y 71 pruebas API; TypeScript, build y 122 pruebas Web, auditorías
sin vulnerabilidades conocidas. CI API 43936692406 sobre 899a3e7 aprobó 71 pruebas,
migraciones y aislamiento RLS en Postgres desechable, más build/auditoría.
CI Web 43936697921 sobre 0a443bc aprobó 122 pruebas, 30 casos de navegador,
tres flujos Auth/REST locales y auditoría sin vulnerabilidades conocidas.

Las pruebas de navegador usan respuestas controladas en 390×844 y 1280×900.
Auth local usa backend fijado en 27e8082, sesiones reales desechables y proveedores
controlados. No son cálculos ORS autenticados de producción ni navegación física
Android. Supabase alojado se inspeccionó sólo en lectura: ACTIVE_HEALTHY y seis
tablas públicas con RLS; no se cambió esquema, política o dato alojado.

La API pública respondió 200 con partial_history, publicación de la reforma
14-08-2025, dos resoluciones, cuatro fuentes y las dos fechas de sanciones con
sus estados. Conserva 128 registros, publicación íntegra desconocida y timeRules
vacío. Con la API nueva se probó Web anterior 6c6be58 en navegador sin recargar
código: el anexo conservó un único resultado para 29 A Norte y sin desbordar.
Comprobación final con Web nueva y datos públicos reales, sin respuestas
inyectadas: historial con dos resoluciones, fechas de aprobación/publicación,
01-10-2025 marcada sustituida y 01-11-2025 marcada como fecha modificada,
cuatro enlaces exactos a resoluciones/tomos y ámbito sólo Polígono 5. Se
conservaron el aviso de publicación íntegra/vigencia pendiente y la consulta
de un único registro 124 para 29 A Norte, sin desbordamiento horizontal en
escritorio. Se capturó evidencia visual y se dejó la pestaña de consulta.
No se crearon usuarios, vehículos o rutas en la base alojada.

Sondas finales de producción: salud, coordenadas, Plus Codes completo/compuesto
y ocho coincidencias Express cercanas HTTP 200. Validación de dos puntos y
48 entregas 200, 49 entregas 400; plan sin sesión 401 AUTH_REQUIRED. Son
validaciones, no cálculos reales de esos recorridos. CORS Web autorizado 204
con su origen; origen ajeno 404 sin cabecera de autorización. El catálogo
público conserva 15 referencias parciales y cero validaciones completas.
El monitor automático guardó 15680f98a9d284678db6ad349767c29a88780b22 con
comprobación real 16-11-2026 19:12:43 UTC. Puebla conserva nueve documentos;
las cuatro páginas nuevas se descargaron y quedan unreviewed como evidencia
técnica, no como aprobación de vigencia. El endpoint público devolvió ese mismo
reporte, nueve documentos y las cuatro URL nuevas, sin marca de antigüedad.
No se sobrescribió el reporte automático; la programación existente puede
demorarse y no actualiza normas automáticamente.
Logs Web/API finales: sin agrupaciones error/fatal en los 30 minutos
consultados. Es una comprobación de esa ventana y no una garantía permanente.

### Publicación y recuperación

API PR #20: https://github.com/FernandoBalsimelli/Route-Planner-API/pull/20.
Commit b21e3890bb47626ddabc847e0f9428807aa16d2e, deployment
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi, READY y alias verificado:
https://route-planner-api.vercel.app/.
Web PR #25: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/25.
Commit b0fdba8f8b45584331aa8a037f878f358edb82bb, deployment
dpl_J5bcCTDMz13zUxhkw9ahUNrZgFvS, READY y alias verificado:
https://route-planner-web-sand.vercel.app/.

Rollback a la entrada del ciclo: Web dpl_DYpnRq1tErfEETKeFGUM28TJpnZA (6c6be58)
y API dpl_8HxcehAAZHLwsHTwKBbPMLzmtBAJ (241b966). Sin migraciones ni datos que
revertir; no se ejecutó rollback. El cierre documental posterior de main no
cambia el código verificado de producción. Historial y ramas en GitHub.
Sólo se modificaron Route-Planner-Web/API y sus proyectos Vercel autorizados;
no se modificó Gestión ni otros recursos. No se activaron pagos, servicios,
variables ni secretos nuevos.

### Estado y próxima prioridad

Completado/publicado: historial documental parcial con fuentes propias y fechas
sustituidas visibles, compatibilidad y vigilancia de las cuatro páginas. Parcial:
publicación íntegra y vigencia de reglas/anexo. Pendiente P1: contrastar texto
publicado completo, actos posteriores de 2026, sentidos/geometrías de corredores
y resolución oficial de discrepancias antes de aplicar restricciones. La
búsqueda dirigida no demuestra ausencia de otras reformas. Mantener separado
estacionamiento, maniobras, circulación y permiso individual.

Google Maps no recibe HGV ni queda obligado a mantener el trazado por puntos
guía. Continúan pendientes ORS autenticado de producción, Android físico,
compartición con permisos y los demás requisitos abiertos. El programa maestro
no está terminado y no se declara cobertura nacional completa.


## Cierre de ciclo — 16-11-2026: aislamiento de sesión y respuestas tardías (P0)

Revisión final: 16-11-2026, aproximadamente 18:22 America/Chihuahua
(17-11-2026 00:22 UTC). Alcance exclusivo Route Planner Web.

### Diagnóstico y causa

Se partió de main Web 711fde3a3d33bd6b4e8093b1cb577a6a9589fb3d y API
31e458c8802dfc43d4a37012fcce23a6c4a90901 (reporte automático). Los alias
apuntaban a Web b0fdba8 / dpl_J5bcCTDMz13zUxhkw9ahUNrZgFvS y API b21e389 /
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi. Se leyeron ENGINEERING-STATUS.md y
MEXICO-COVERAGE.md de main. Los directorios previos conservaban cambios de
otra ejecución: no se sobrescribieron; se trabajó en worktrees aislados.

El componente principal conservaba puntos, entregas, resultado y configuración
privada después de salir de la cuenta. Una respuesta pendiente de route_stops
podía restaurar datos autorizados previamente en otro contexto. Comparar sólo
user.id no distingue A → fuera → A. Además, getUser inicial podía imponerse a
un evento de sesión posterior, y un editor de vehículos desmontado podía llamar
onSaved y seleccionar su unidad en la cuenta siguiente. Guardados/cálculos
pendientes podían mostrar mensajes o resultados después del cambio.

Se reprodujo con datos sintéticos; no se afirma un acceso entre cuentas en la
base alojada ni una vulneración de RLS. El fallo era aplicar datos ya autorizados
de una sesión anterior a la interfaz actual. Supabase se inspeccionó sólo en
lectura: ACTIVE_HEALTHY y seis tablas públicas con RLS. No hubo escrituras de
cuentas, vehículos, rutas o favoritos en producción durante esta verificación.

### Implementación y archivos

- app/page.tsx: transición central de identidad con versión de contexto; limpia
  borrador privado, resultados/alternativas, nombre, parámetros de vehículo y
  preferencias, búsquedas/mapa/manifiesto y mensajes. Invalida restauraciones,
  cálculos y guardados tardíos, incluso A → fuera → A. Añade owner_id a la consulta
  de paradas. Preserva el borrador de invitado al primer acceso y el recorrido
  cuando sólo se refresca el token del mismo usuario.
- components/AccountPanel.tsx: eventos de sesión recientes tienen prioridad
  sobre getUser inicial; descarta respuestas/eventos tras desmontaje. Callback
  de sesión síncrono, sin introducir llamadas Auth dentro del callback.
- components/SavedRoutesPanel.tsx y components/VehicleManager.tsx: versión de
  instancia/identidad para respuestas, errores y finalizaciones pendientes;
  un panel desmontado no puede cargar rutas ni seleccionar vehículos. Se limpian
  formularios de perfil/unidad/flota al cambiar de dueño.
- test/session-isolation.test.mjs: ocho regresiones de componentes.
- test/geolocation.e2e.mjs: cierre de sesión elimina el resultado y termina GPS.
- test/integration/authenticated.e2e.mjs: retiene una respuesta REST auténtica
  de route_stops de la cuenta uno hasta haber entrado en la segunda cuenta y
  escrito un nuevo borrador; no puede sobrescribirlo.
- docs/SESSION-ISOLATION.md: causa, comportamiento, pruebas y alcance.

Son ocho archivos en el PR, más este cierre documental. No se borran datos
persistidos ni todo localStorage. Una escritura ya enviada puede terminar en la
cuenta original: se descarta su efecto tardío en la interfaz nueva, sin fingir
cancelación/reversión del servidor. No se modifican esquema, RLS, variables,
secretos, dependencias, catálogo municipal, normativa, geometrías, límites de
paradas ni enlaces Google.

### Pruebas ejecutadas

Las ocho regresiones nuevas fallaron sobre main anterior 711fde3 y pasaron con
la corrección. Local: 130 pruebas Web, TypeScript y build aprobados; auditoría
sin vulnerabilidades conocidas. API sin cambios: build y 71 pruebas aprobados,
auditoría sin vulnerabilidades conocidas. Los ocho archivos locales se
compararon byte por byte con el commit fusionado; coincidieron.

CI Web 43985877121 sobre e92e890ea9edab03a7648c9997a30a016c42ada9:
https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/43985877121.
Ambos trabajos aprobados: 130 pruebas Web, 31 casos de navegador, tres flujos
Auth/REST/Postgres locales, TypeScript, build y auditoría 0. Jobs 133713759109
(Web) y 133713758616 (authenticated-integration). En la primera ejecución
43985251992, Web pasó y la integración falló porque la prueba buscaba Origen
mientras estaba abierta Mis rutas; se corrigió la navegación de la prueba y se
repitió CI completo. No se ocultó un error de aplicación con una excepción.

Los casos de navegador usan datos controlados y vistas móvil 390×844/escritorio
1280×900. Auth/REST/Postgres local usa sesiones reales desechables y RLS activa;
el backend de integración sigue fijado en 27e8082, con ORS controlado. La prueba
de GPS utiliza sensor simulado. No son cálculos ORS autenticados de producción,
una prueba de sesiones alojadas ni navegación física Android. Esas comprobaciones
siguen pendientes; no se crearon credenciales ni se solicitó acceso adicional.

Después del despliegue se recargó el alias y se probó el flujo público real,
sin respuestas inyectadas: coordenadas de un punto público, confirmación del
origen, ocho recomendaciones Express con distancias en línea recta, selección
Bodega Aurrera Express/José Timoteo Rosales, corroboración y confirmación del
destino. Ambos marcadores y el enlace Google conservan las coordenadas exactas.
Se verificó ausencia de desbordamiento horizontal en esa vista de escritorio.
Se guardó evidencia visual pública y se dejó la pestaña de comprobación.
Esta captura acredita búsqueda/confirmación pública, no cierre de sesión real.

Sondas públicas posteriores: salud, coordenadas y Plus Codes completo/compuesto
HTTP 200; ocho coincidencias Express cercanas (primera a 4,157 m en línea recta).
Validación de dos puntos y 48 entregas 200; 49 entregas 400. Plan sin sesión
401 AUTH_REQUIRED. Son validaciones de payload, no cálculos de esos recorridos.
CORS directo API: origen Web autorizado 204 con su cabecera; origen ajeno 404
sin cabecera de autorización. Catálogo conserva 15 referencias parciales y cero
municipios con validación completa. Monitor público: siete grupos, checkedAt
2026-11-16T22:25:21.781Z, stale=false, legalRulesAutomaticallyUpdated=false.
No se sobrescribió su reporte automático. Logs Web/API: sin agrupaciones de
error/fatal en los 30 minutos consultados; no equivale a monitoreo permanente.

### Publicación, recuperación y continuidad

Web PR #26: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/26.
Implementación eab5b904f93e1309eed8d6c508bf25a4423339ec; ajuste de prueba
e92e890ea9edab03a7648c9997a30a016c42ada9; merge publicado
91c5324a7291ad6cb775f1234068da2832c10c94. Deployment
**dpl_6Azm4VAoqXuUczZ4jeti3QrWxdbG**, READY, target production y alias
https://route-planner-web-sand.vercel.app/ comprobado con ese SHA.
API conserva **b21e3890bb47626ddabc847e0f9428807aa16d2e** /
**dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi**, READY, alias
https://route-planner-api.vercel.app/. No se desplegó API en este ciclo.

Rollback Web disponible: **dpl_J5bcCTDMz13zUxhkw9ahUNrZgFvS (b0fdba8)**.
API no cambió. Sin migraciones/datos que revertir; no se ejecutó rollback.
El commit documental posterior con [skip ci] conserva el código publicado;
main puede ir por delante del SHA del alias sólo por documentación. El PR y
sus commits conservan el historial y el punto de recuperación. Se mantienen
los directorios anteriores intactos y el trabajo actual en worktree separado.
No se modificó Gestión ni otros proyectos, ni se activaron pagos o servicios.

Completado/publicado: aislamiento de identidad y respuestas tardías descrito,
regresión de cierre de GPS e integración local entre dos cuentas. Parcial:
verificación pública de producción, sin sesión alojada ni Android físico.
P1 siguiente: completar comprobaciones de campo/autenticación de producción
cuando existan medios, y retomar la publicación íntegra/actos municipales
posteriores de 2026, sentidos y geometrías verificadas antes de aplicar normas.
Quedan compartición con permisos y demás requisitos abiertos del programa.

Puebla y las otras referencias siguen siendo parciales; catálogo/documento no
equivale a permiso legal. Google no recibe dimensiones/peso HGV y los puntos
guía no bloquean su trazado. No se declara ruta legal/segura ni cobertura
nacional completa. El PROMPT MAESTRO sigue abierto y la automatización existente
se mantiene activa; no se crea, elimina ni reprograma en este ciclo.


## Cierre de ciclo — 16-11-2026: recuperación de búsqueda de ubicaciones (P0)

### Entrada y diagnóstico

Main Web comprobada: 706467ef5f8aeaebebbab8fe4ecd72a1f07b93f2; main API:
31e458c8802dfc43d4a37012fcce23a6c4a90901. Se leyeron ENGINEERING-STATUS.md y
MEXICO-COVERAGE.md de esa main antes de cambiar código. Producción a la entrada:
Web 91c5324 / dpl_6Azm4VAoqXuUczZ4jeti3QrWxdbG y API b21e389 /
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi, ambas READY. Salud, coordenadas, Plus Codes
y ocho sucursales Express cercanas respondieron HTTP 200. No se observó una
caída general del servicio durante esta comprobación.

LocationInput tenía debounce y cancelación al editar, pero no plazo completo
en el navegador. El límite de 25 s del proxy no acota una conexión cliente-proxy
que no termine. Un error de transporte mostraba Failed to fetch; un fallo al
decodificar JSON mostraba el mensaje técnico. No había acción de reintento sin
editar el texto. Son fallos de recuperación del cliente: no se afirma haber
detectado una caída nueva de ORS ni una causa de red específica en producción.

El entorno de terminal/archivos y el navegador no estaban disponibles en este
ciclo. Se trabajó directamente en GitHub, en rama separada, y se ejecutó el
código mediante el CI existente. No se afirma compilación/pruebas locales ni
interacción visual real de producción en esta ejecución. Supabase Route Planner
se consultó sólo en lectura y reportó ACTIVE_HEALTHY; no se reinspeccionaron
políticas/tablas ni se escribió ningún dato alojado.

### Cambio implementado y archivos

- lib/location-search.ts (nuevo): plazo de 30 s desde el inicio de la petición,
  incluido el cuerpo; cancela fetch y termina la espera aun si fetch/body no
  respetan abort. Libera temporizador/listener. Distingue transporte, timeout,
  rechazo HTTP/proveedor y respuesta JSON/contrato inválido. Conserva código,
  mensaje y estado HTTP cuando existen, sin registrar consultas privadas.
- components/LocationInput.tsx: usa el helper, presenta causa específica con
  role=alert y permite Reintentar búsqueda. Conserva texto, referencia de cercanía
  y debounce; devuelve el foco al campo para teclado/sugerencias del mapa y
  cierra selectores alternativos. No hay reintentos automáticos por un fallo.
  Editar o desmontar cancela sin mostrar la cancelación como error de tiempo.
  Elegir una sugerencia conserva la corroboración/confirmación explícita.
- test/location-search.test.mjs (nuevo): ocho casos de helper, incluidos fetch
  bloqueado, cuerpo bloqueado, cancelación, red, HTTP, JSON y lista vacía válida.
- test/location-input.test.mjs: dos regresiones de recuperación y foco.
- test/geolocation.e2e.mjs: tres casos nuevos: secuencia red/503/JSON/recuperación
  en móvil y escritorio; espera real de 30 s y reintento en navegador móvil.
- docs/LOCATION-SEARCH-RECOVERY.md (nuevo): comportamiento, presupuestos,
  referencias técnicas primarias y límites de validación.

Se mantienen GPS/OCR, autocompletado cercano, coordenadas/Plus Codes, proveedores,
caché backend, cuotas, límite real de 48 entregas, orden y enlaces Google.
No cambian API, dependencias, secretos/variables, esquema/RLS o datos alojados.
No se modifican fuentes legales, reglas municipales ni geometrías en este ciclo.

### Pruebas y resultados

Primero se guardaron sólo las dos regresiones sobre main anterior: commit
bae1bcc5da2a7552d536dd2873724e5fef42cca1, CI 43987993039, job 133721023726.
Pasaron las 130 existentes y fallaron exactamente las dos nuevas. La prueba
del plazo completo se añadió con el helper, no se presenta como ejecución roja
del helper antes de que existiera.

Implementación 53770c9adc10ee5f7bf524985e5449cf5a105fae: CI 43988347077
aprobó 140 pruebas, 34 casos de navegador, tres flujos Auth locales, TypeScript,
build y auditoría 0. El ajuste posterior de foco 4476fcd8c508c88087c6bd5742df9d53acfbc107
se volvió a verificar completo antes de publicar:

CI final 43988944139 sobre 4476fcd8c508c88087c6bd5742df9d53acfbc107:
https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/43988944139.
Ambos trabajos aprobados: 140 pruebas Web, 34 casos de navegador, tres flujos
Auth locales, TypeScript, build y auditoría 0; sin omitidas. Jobs 133724257822
(Web) y 133724257494 (authenticated-integration). El árbol del merge coincide
exactamente con el árbol del commit probado, sin cambios de código intermedios.

Las pruebas de navegador usan proveedores/red controlados en 390×844 y
1280×844, junto con los casos existentes. El timeout móvil espera los 30 s de
la implementación, sin acortar el plazo de producción. Auth/REST/Postgres
local usa sesiones reales desechables; el backend de integración sigue fijado
en 27e8082 y ORS es controlado. Incluye cálculo/guardado de dos y múltiples
puntos, 48 entregas, rechazo de la 49, aislamiento y alternativas. No son
cálculos ORS autenticados de producción ni navegación física Android.
La suite independiente API de 71 casos no se volvió a ejecutar en este ciclo
Web; su último resultado queda en el cierre anterior, sin presentarlo como nuevo.

### Producción y publicación

Comprobaciones HTTP posteriores al despliegue: salud, coordenadas y Plus Codes
completo/compuesto 200 con una sugerencia; Express cercano 200 con ocho y
primera distancia en línea recta 4,157 m. Referencia de cercanía inválida:
400 INVALID_SEARCH_FOCUS, preservado por el proxy. Catálogo: 15 referencias
parciales, cero validadas. Monitor público: checkedAt 2026-11-16T22:25:21.781Z,
stale=false; no actualiza normas automáticamente.

Página de producción HTTP 200 y paquete app/page-34f0899307231f59.js HTTP 200:
incluye LOCATION_NETWORK_ERROR, LOCATION_SEARCH_TIMEOUT y LOCATION_INVALID_RESPONSE.
Esto comprueba el código servido, no una interacción visual del usuario.
No se ejecutaron POST/CORS de producción en este ciclo: los medios HTTP
disponibles son GET. Las comprobaciones de cálculo se hicieron en la integración
local de CI y no se presentan como cálculos reales ORS de producción.
Logs Web/API: sin agrupaciones error/fatal en los 30 minutos consultados; es
una ventana concreta y no monitoreo permanente.

Web PR #27: https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/27.
Merge publicado: 2ffebfb905b1256ba8bb92a1297c977b09f405f2.
Deployment: dpl_H9tJy5YcKyfaTMadyuSv6S6kG8i4, READY, target production, alias
https://route-planner-web-sand.vercel.app/ verificado con ese SHA.
API permanece b21e3890bb47626ddabc847e0f9428807aa16d2e /
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi, READY:
https://route-planner-api.vercel.app/. No se desplegó API ni se sobrescribió
su reporte automático de fuentes.

Rollback Web disponible: dpl_6Azm4VAoqXuUczZ4jeti3QrWxdbG (91c5324).
No hay migraciones/datos que revertir y no se ejecutó rollback. Rama
fix/location-search-recovery-20261116 y PR conservan recuperación/historial.
El cierre documental posterior de main usa [skip ci] y no cambia el código
verificado del alias. No se modificó Gestión ni otros proyectos; no se
activaron servicios/funciones de pago o credenciales nuevas.

### Estado y reanudación

Completado/publicado: búsqueda acotada, clasificación de causas y reintento
manual con foco/confirmación, con pruebas de helper, componente y navegador.
Parcial: producción comprobada por HTTP/paquete servido; sin navegador real
disponible en este ciclo, Android físico ni sesión alojada. Quedan pruebas de
campo/ORS autenticado cuando existan medios, compartición con permisos y demás
P1 abiertos. Retomar revisión oficial de publicación íntegra y actos de 2026,
permisos, sentidos y geometrías antes de aplicar normas municipales.

Persisten 15 municipios con referencia parcial y cero con validación legal
completa; un documento/catálogo no acredita permiso. Google no recibe HGV ni
queda obligado por puntos guía. El programa maestro sigue incompleto. Se
conserva la tarea periódica existente, sin crear otra ni desactivarla.


## Cierre de ciclo — 16-11-2026: recuperar rutas por nombre y vigilancia de Juárez

### Entrada, diagnóstico y alcance

Se consultaron main Web b9d9d7bfc23d8097986793eb13de7a6875c8b19c y API
31e458c8802dfc43d4a37012fcce23a6c4a90901, ENGINEERING-STATUS.md y
MEXICO-COVERAGE.md, y ambos alias READY antes de modificar. Web estaba en
2ffebfb / dpl_H9tJy5YcKyfaTMadyuSv6S6kG8i4; API en b21e389 /
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi. La salud pública respondió 200.
Se usaron worktrees nuevos de main sin sobrescribir los directorios anteriores.

No existía buscador de rutas guardadas: localizar un nombre antiguo requería
ampliar la lista. La integración nueva encontró además que el panel precargaba
al iniciar sesión y permanecía oculto sin actualizarse al abrirlo; una escritura
desde otra sesión podía no aparecer. Se corrigió la activación y la restauración
pendiente al salir, no se añadió una recarga artificial sólo en la prueba.

### Funciones implementadas y archivos

- components/SavedRoutesPanel.tsx: búsqueda por fragmentos del nombre en rutas
  activas/papelera, debounce 300 ms, filtro REST antes del límite, reinicio del
  límite al editar y orden estable por fecha/id. Conserva dueño explícito y RLS;
  los signos no amplían la consulta. Mantiene la búsqueda al cambiar a papelera.
  Eliminar archiva y recuperar conserva el registro y sus puntos.
- lib/saved-route-search.ts: escape literal para imatch. No usa ilike, cuyo
  asterisco puede ser alias de porcentaje en PostgREST. No concatena SQL ni OR.
  No promete ignorar acentos ni buscar las direcciones intermedias.
- El listado consulta al entrar y al volver, sin precarga oculta. El campo sigue
  editable durante la consulta; las acciones esperan su resultado. Cancelación,
  descarte de respuestas tardías, plazo de 30 s y reintento distinguen fallo de
  lista vacía. Se conservan resúmenes ligeros, sin geometría hasta cargar la ruta.
- app/page.tsx: activa el panel con el espacio de trabajo e invalida una
  restauración pendiente si se abandona Mis rutas, incluso con paradas en vuelo.
- app/globals.css: campo integrado con temas, foco visible, texto móvil de 16 px
  y controles táctiles. README.md y docs/SAVED-ROUTE-SEARCH.md describen uso/límites.
- test/saved-route-search.test.mjs añade siete casos; test/session-isolation.test.mjs
  añade salir durante una restauración; test/integration/authenticated.e2e.mjs
  añade un cuarto flujo real de Auth/REST/Postgres local en móvil y escritorio.

Son nueve archivos en Web PR #28, más el cierre documental y la actualización de
cobertura. Se conserva el modelo anterior de ampliar el límite solicitado y el
máximo de respuesta de Supabase; no se implementaron cursores ni se certifica
rendimiento para colecciones arbitrariamente grandes. El filtro sí se aplica
antes del límite. No cambia el límite real de 48 entregas de un recorrido.

API PR #21 modifica data/mx/national-references.json, test/source-monitor.test.js,
docs/MEXICO-COVERAGE.md y añade docs/JUAREZ-OPERATIONS-MONITOR.md. Incorpora al
grupo existente de Juárez una URL oficial del aviso operativo del 08-09-2026
sobre obras en Valle del Sol, con aviso de revisión en la consulta municipal.
No lo convierte en reglamento permanente, horario universal o desvío autorizado.
La vigencia actual, fin de trabajos, perímetro y geometrías siguen pendientes.
El reglamento histórico de 2003 conserva sus fechas y advertencias originales.

Fuente:
https://www.juarez.gob.mx/noticia/34586/aclara-seguridad-vial-sobre-circulaciA3n-de-vehA-culos-de-carga-pesada-por-obras-de-valle-del-sol
Descarga directa real de esta revisión: HTTP 200, 45,181 bytes, SHA-256
58eec143ed7a2fa23c1846f12c2876ac0fa0c8e666c741e44008a6b597e4b159.
Es evidencia del HTML consultado; no certifica reforma ni vigencia posterior.

El monitor existente se activó por el cambio de registro: run 44024118839,
job 133840247988, finalizó y guardó 10c5c7ee2968aee41b3292b2f8348cd5ee5a0fc0.
Reporte checkedAt 2026-11-17T05:26:32.948Z: Juárez y su URL nueva devolvieron
HTTP_403 desde GitHub, sin descarga/hash nuevos para el aviso. Se conserva el
fallo real, separado de la descarga directa 200; no se sustituye por evidencia
manual ni se afirma una causa específica del 403. Mantiene siete grupos de
fuentes y la programación existente, sin cron, permisos o servicios nuevos.
Las dos pruebas nuevas comprueban cambios independientes y conservación del
documento vinculado aunque falle el principal. La cobertura sigue en 15
municipios parciales y cero con validación legal completa, sin exclusiones nuevas.

### Pruebas, fallos encontrados y resultados

Local final: 148 pruebas Web, TypeScript/build y auditoría 0; API 73 pruebas,
build y auditoría 0. La ejecución local de navegador no pudo iniciar Chromium
por socket() Operation not permitted. Los 34 casos fallaron en el hook inicial;
no se cuentan como pruebas funcionales locales aprobadas. Se ejecutaron en CI.

Web CI final 44024334624 sobre 60e4feb5c7942ec4966e04ed465d266f122f62e3:
https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44024334624.
Jobs 133840955269 y 133840955698 aprobados: 148 pruebas Web, 34 casos de
navegador, cuatro flujos Auth/REST locales, TypeScript/build y auditoría 0,
sin omitidas. El árbol fusionado 2bc812ac8ab963aa67f25c6f739018af05537f68
coincide con el probado; los nueve archivos locales coincidieron byte por byte.

La primera integración (44023081276) pasó tres flujos y falló el nuevo porque
la lista oculta estaba precargada antes de sembrar los datos en otra sesión:
defecto real corregido. La segunda (44023880084) pasó tres y falló al contar
antes de completarse la paginación. La prueba se sincronizó con la respuesta
REST de 30 registros y su elemento visible; se repitió CI completo.
No se relajaron las comprobaciones de cantidad o literalidad.

El cuarto flujo prueba Auth/REST/Postgres genuinos con RLS activa, dos cuentas,
30 rutas sintéticas, ruta fuera de la primera página, signos %, _, *, paréntesis,
corchetes, barras/comillas, ausencia de resultados, limpieza, archivado,
recuperación y carga en 390×844 y 1280×844. No se simula la respuesta de esa
búsqueda. Los siete casos unitarios sí controlan transporte y el plazo se acorta
sólo en el caso de timeout. La suite general conserva GPS/proveedores simulados.

API CI 44023963673 sobre 96079d1606b15c1fadedbcaf31ac45b9a18fd271:
https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44023963673.
Job 133839747369 aprobó 73 pruebas, build/auditoría y migraciones/aislamiento RLS
en Postgres desechable. No se aplicaron migraciones, permisos o datos a Supabase
alojado; sólo se consultó Route Planner y respondió ACTIVE_HEALTHY.

Auth local de Web conserva backend fijado en 27e8082 y ORS controlado. Sus casos
de cálculo/guardado de dos y múltiples puntos, 48 entregas, rechazo de la 49
y alternativas no se presentan como ORS autenticado de producción. No hay
prueba nueva de sensores/permisos en Android físico ni de cuentas alojadas.

### Verificación de producción

Se verificó la API nueva con Web anterior, y después ambos despliegues nuevos:
salud, coordenadas exactas y Plus Codes completo/compuesto HTTP 200; ocho
coincidencias Express cercanas. Validación de payload de dos puntos y 48
entregas 200, 49 entregas 400. Plan sin sesión 401 AUTH_REQUIRED.
Son validaciones de entrada, no cálculos reales de esos recorridos.
CORS directo: origen Web autorizado 204 con su cabecera; origen ajeno 404 sin
cabecera de autorización. Catálogo conserva 15 parciales y cero validados.

El endpoint municipal de Juárez contiene el aviso y URL nueva, routingEnforced
false y timeRules vacío. source-status refleja el reporte 05:26:32 UTC,
stale=false, URL nueva unavailable / HTTP_403 / sha256 null / lastSuccessAt null
y legalRulesAutomaticallyUpdated=false. Un intento reciente no implica descarga
correcta. No se sobrescribió el reporte automático.

Comprobación pública real en navegador, sin respuestas inyectadas: compatibilidad
de Web anterior con API nueva; recarga de Web nueva, Mis rutas exige sesión
sin mostrar registros privados, y consulta Chihuahua/Juárez con aviso de 2026,
fuentes históricas separadas y HTTP_403 visible por documento en el seguimiento.
La URL del aviso es la exacta verificada. Sin desbordamiento horizontal en esa
vista de escritorio. Se guardó evidencia visual pública y se dejó la pestaña.
Esa captura prueba seguimiento documental, no búsqueda autenticada de producción.

Página y paquete /_next/static/chunks/app/page-5f63e9ff5605e670.js respondieron
200 e incluyen el campo y filtro nuevos. Logs Web/API finales: sin agrupaciones
error/fatal en los 30 minutos consultados; no es garantía ni vigilancia permanente.

### Publicación y recuperación

Web PR #28:
https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/28.
Commits 1f0a855f4ad3b16becd1585a32372980113aaebf (búsqueda),
e56201962ad13fcc8f873ebcb1ad96dcbf44db93 (activación/cancelación) y
60e4feb5c7942ec4966e04ed465d266f122f62e3 (sincronización de prueba).
Merge publicado 90f61e81e44efa600cea8cf6ab3338c71c135fb6.
Deployment dpl_3S6E6U2KxbEbCLs9XEWC5ipVT9xi, READY, target production:
https://route-planner-web-sand.vercel.app/, alias verificado con ese SHA.

API PR #21:
https://github.com/FernandoBalsimelli/Route-Planner-API/pull/21.
Feature 96079d1606b15c1fadedbcaf31ac45b9a18fd271, merge
544e0f39f5fce8ed774cf07a547834a447c122fe; reporte automático publicado
10c5c7ee2968aee41b3292b2f8348cd5ee5a0fc0. Entre merge y reporte sólo cambió
data/mx/source-status.json, sin código intermedio no probado.
Deployment dpl_Fkj31Bh94vhh4jrWBQfZy3YVTRfN, READY, target production:
https://route-planner-api.vercel.app/, alias verificado con SHA 10c5c7e.
Corrección documental API posterior bf92d22baba6de189f5a1ce2ea89d27ade7bd5d1 registra el 403
sin cambiar código ni desplegar de nuevo.

Rollback de entrada: Web dpl_H9tJy5YcKyfaTMadyuSv6S6kG8i4 (2ffebfb) y API
dpl_6VZgRhbt2Xy7XsPBEEop9vn1S3Yi (b21e389). Sin migraciones/datos que revertir;
no se ejecutó rollback. Los cierres documentales posteriores usan [skip ci] y
main puede ir por delante del SHA publicado sólo por documentos. Historial y
ramas permanecen. Los worktrees de este ciclo se pueden reanudar desde main.
No se modificó Gestión ni otros proyectos, secretos, dependencias o variables,
ni se contrataron/activaron servicios de pago.

### Estado y próxima prioridad

Completado/publicado: búsqueda por nombre y papelera con actualización al entrar,
cancelación y recuperación; seguimiento de la nueva URL de Juárez y fallo visible.
Parcial/bloqueado: descarga automática de esa fuente por HTTP 403; vigencia,
perímetro y geometrías pendientes. Buscar corroboración oficial accesible y
actos posteriores, sin eludir controles ni convertir una nota de prensa en norma.

Pendientes P1: enlaces compartidos con permisos/revocación, mejoras de navegación
y comprobación de campo/autenticación alojada cuando existan medios. Mantener
el límite real del proveedor y todos los puntos, y continuar revisión municipal
trazable. Google no recibe restricciones HGV ni queda obligado por puntos guía.
No se declara cobertura nacional, ruta segura/legal ni programa maestro completo.
Se conserva la tarea periódica existente; no se crea otra ni se desactiva.


## Cierre de ciclo · enlaces compartidos revocables · 17-11-2026

### Diagnóstico y causas

Se consultaron main y ambos alias antes de editar. Entrada Web main
909fe00ac858de2d0dd13137312e57d7cde0a41b, producción 90f61e81e44efa600cea8cf6ab3338c71c135fb6;
API main 81d39d0beef555aa37279e47f7e00958521633b0, producción 10c5c7ee2968aee41b3292b2f8348cd5ee5a0fc0.
Se leyeron ambos informes actuales y se preservó el reporte automático nuevo.
No se reprodujo un P0 de red: salud, búsquedas y validaciones respondieron.
Compartir rutas seguía pendiente: no existía un permiso revocable/caducable para
que un receptor recibiera los puntos sin acceder a la cuenta del dueño.

Durante CI, una prueba municipal antigua encontró dos comparaciones válidas
sobre capacidad en Puebla al actualizar el backend fijado para integración:
la disposición de maniobras de 2021 y la del programa de corredores de 2025.
El selector suponía una sola coincidencia. Ahora verifica ambas por su disposición;
no se eliminó ni fusionó evidencia. El primer candidato no se publicó.
Antes de aplicar también se corrigieron una expresión CASE PL/pgSQL y dos
supuestos del fixture SQL (JSON frente a texto; lectura posterior a la revocación).
La migración aplicada es la versión que pasó la suite PostgreSQL y Auth/REST.

### Función y archivos

Completado y publicado: **Mis rutas → Compartir puntos**. Consentimiento obligatorio,
1/24/72/168 horas, enlace sólo mostrado al crearlo, copiar con alternativa manual,
lista de administración y revocación. El token viaja en el fragmento, se guarda
sólo su hash y no se persiste en localStorage. Sólo el dueño puede crear/revocar
los enlaces de su ruta y consultar sus metadatos. Diez enlaces activos por ruta
no limita sus entregas. La lista prioriza los potencialmente activos para no
ocultar controles de revocación tras mucho historial; se puede revocar incluso
si el reloj del dispositivo considera que ya caducó.

Receptor: mapa, puntos ordenados, medidas/pesos y preferencias. No importa nada
hasta **Usar estos puntos**; en ese instante vuelve a comprobar el enlace. Sustituye
el borrador sólo tras esa acción, preserva 48 paradas más origen/destino y exige
un nuevo cálculo. No copia IDs privados, flotas, resultados, métricas, geometría,
instrucciones ni supuesta cobertura legal. Cerrar sin importar conserva el borrador.
Se cancelan solicitudes obsoletas, salidas y cambios de cuenta, con timeout de 30 s.
Archivar revoca permanentemente los enlaces anteriores aunque se recupere la ruta.
Las copias ya importadas no pueden borrarse remotamente.

Web: app/page.tsx, app/globals.css, components/SavedRoutesPanel.tsx,
components/RouteShareLinks.tsx, components/SharedRouteReview.tsx,
lib/route-sharing.ts, lib/use-share-request.ts, test/route-sharing.test.mjs,
test/share-links.test.mjs, test/integration/authenticated.e2e.mjs y
.github/workflows/checks.yml. API: migración, test/sql/route-sharing.sql,
.github/workflows/checks.yml y docs/ROUTE-SHARING.md. Este informe y
MEXICO-COVERAGE.md cierran el ciclo documental.

### Pruebas y resultados

- Web: TypeScript, compilación y **155 pruebas** aprobadas; **34 casos de navegador**
  aprobados. CI [44064888845](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44064888845),
  jobs 133975900896 y 133975901775: cero fallos y cero omitidas.
- **Cinco flujos Auth/PostgREST/PostgreSQL locales reales** aprobados: ciclo de
  vehículo/ruta, 48 entregas con reintento atómico, alternativa elegida, búsqueda
  literal/papelera y enlaces compartidos en 390/1365 px. El último genera un enlace,
  comprueba lectura anónima, ausencia de campos privados, revisión sin cálculo
  automático, importación completa, permisos entre cuentas y revocación después
  de abrirlo; archivar/recuperar no reactiva enlaces. ORS es fixture sintético.
- API: build, **73 pruebas**, migraciones y comprobaciones RLS/ACL sobre PostgreSQL
  desechable, aprobadas. CI final [44065507467](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44065507467),
  job 133978049410. También verifica caducidad según el servidor, snapshot inmutable,
  hash en vez de token, modo/perfil incompletos, 49 paradas rechazadas y límite de enlaces.
- npm audit --omit=dev: cero vulnerabilidades reportadas en ambos repositorios.
  Chromium local no puede crear su socket; los casos de navegador se ejecutaron
  en GitHub CI. No se presenta ese bloqueo local como una prueba aprobada.
- Producción posterior al despliegue: salud de ambos servicios HTTP 200;
  coordenadas, Plus Code completo y compuesto y búsqueda cercana HTTP 200.
  Bodega Aurrera Express devuelve ocho coincidencias. Validate con 0/2/48 paradas
  devuelve 200, con 49 devuelve 400. Plan sin sesión devuelve 401.
  CORS del dominio autorizado: 204 y cabecera correcta; origen ajeno: 404 sin permiso.
- Navegador público real: enlace desconocido devuelve el estado de no disponibilidad;
  cerrar vuelve al planificador. Origen decimal confirmado conserva 25.6866,-100.3161;
  búsqueda de Express muestra ocho coincidencias con distancias en línea recta y
  marcadores; se confirma la sucursal de José Timoteo Rosales y ambos puntos aparecen
  sobre teselas reales. No se inyectaron respuestas en esta comprobación pública.
- Vercel: ninguna fila de errores/fatales agregados en los 30 minutos consultados,
  en ambos proyectos. No equivale a observabilidad permanente ni a ausencia futura de fallos.
- No se ejecutaron creación/revocación autenticadas de enlaces en Supabase alojado,
  cálculo ORS autenticado real ni GPS/navegación en Android físico. La prueba local
  de cuentas y los fixtures no se presentan como esos resultados.

### Supabase aplicado y límites de seguridad

Sólo pakhlscjbjvwnheeyjxd: migración **20261117102944_route_share_links**, registrada
por apply_migration. El archivo creado con CLI se alineó con esa versión alojada,
sin editar filas del historial ni cambiar su SQL ya probado. SHA-256 del SQL:
7acf6bc7dc1debdd7f9417c48f3cf8c6686e383cb22ad70509914515f80ba60d.
Tras aplicar: **3 rutas, 10 paradas y 1 vehículo**, iguales a la inspección previa;
**0 enlaces** creados. No se sembraron cuentas o datos de prueba en producción.
RLS activo, clientes sin SELECT de snapshot/hash, anon sin crear enlaces y lector
por token habilitado. Una lectura SQL bajo rol anon del token inexistente devuelve null.

Los asesores señalan intencionalmente el lector SECURITY DEFINER accesible a anon
y los tres RPC accesibles a authenticated. Son avisos vigentes, no se declaran
resueltos: se necesitan para este acceso limitado por token y administración del
dueño sin grants directos sobre snapshot/hash. Se revisaron pertenencia, whitelist,
search_path vacío, expiración, revocación y grants. Referencias y revisión en
[ROUTE-SHARING.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/ROUTE-SHARING.md),
incluidos los enlaces de remediación 0028/0029. Sigue el aviso previo de protección
de contraseñas filtradas desactivada; no se activaron servicios de pago. Salud sin
avisos; el índice de flota sin uso es informativo y no se eliminó.

### Commits, publicación y recuperación

Web PR [#29](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/29):
bee33ed277f1140ebcb62bd14acd2a0189326142 inicial; candidato final probado
9822d150fe4f7ac5e484bfec200c284df2296c19; merge publicado
**0909fae3a506584276827d3dc33559c9bbf0c1e3**.
Deployment **dpl_52eJGKK2KpiKLrphqH4d5svg9rNa**, READY y production;
https://route-planner-web-sand.vercel.app/ resuelve a ese SHA.

API PR [#22](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/22):
SQL/ACL probado 080d707a745081e138898ba9906dcb6e9bc70ca6 (fijado en integración Web);
candidato final probado ec8a69b0391691437879be8052f2db000bbff7f1 con versión de
migración alineada y documentación; merge publicado
**f5c9b1882cc4cdd33331dab6dfa8c1774a9b83cc**.
Deployment **dpl_Hc3QfG4ZszBzZKao8sGXUxjDefGL**, READY y production;
https://route-planner-api.vercel.app/ resuelve a ese SHA. Sin cambios a JS del motor.
Los cierres documentales posteriores usan [skip ci]; un main posterior sólo por
documentos no implica que haya código funcional sin publicar.

Rollback de entrada: Web dpl_3S6E6U2KxbEbCLs9XEWC5ipVT9xi (90f61e8) y
API dpl_Fkj31Bh94vhh4jrWBQfZy3YVTRfN (10c5c7e). Restaurarlos conserva las tablas
aditivas. **Volver la Web por sí solo no revoca enlaces ya creados**: si se requiere
suspender lecturas, aplicar `revoke execute on function public.read_route_share_link(text)
from anon, authenticated;` y reponer el grant tras corregir/verificar. No borrar tabla,
filas ni historial. No se ejecutó rollback. Las ramas y commits de recuperación
se conservan. No se modificó Gestión u otros recursos, variables, secretos ni
servicios de pago.

### Pendientes y próxima prioridad

Completado/publicado en este ciclo: compartir puntos con permisos, caducidad,
revisión, importación completa y revocación/papelera. Mejoras generales de búsqueda,
vehículos, manifiestos y navegación conservadas, sin restaurar el límite de ocho.
Parcial/bloqueado: verificación autenticada alojada y Android físico sin medios
actuales; fuentes Juárez con HTTP 403; permisos, vigencia y geometrías municipales
sin completar. El monitor público refleja el reporte de 08:18:41 UTC del 17-11;
una descarga o catálogo no valida una ruta.

Próxima prioridad independiente: mejorar progreso/continuidad de entregas y la
navegación por tramos sin perder puntos; continuar corroboración oficial accesible
de Juárez y actos posteriores de Puebla sin eludir controles. Mantener distinción
entre parámetros HGV del proveedor y normativa municipal no aplicada. Google Maps
no conserva necesariamente el trazado exacto ni recibe dimensiones/peso HGV.
El programa maestro sigue incompleto; se conserva la tarea periódica existente.


## Cierre de ciclo · orden de Google y avisos de Juárez · 17-11-2026

### Diagnóstico y causa

Preflight nuevo: Web main 57c58a9aba470b816afffad2f4a149d45562bd22, producción
0909fae3a506584276827d3dc33559c9bbf0c1e3/dpl_52eJGKK2KpiKLrphqH4d5svg9rNa;
API main/producción f5c9b1882cc4cdd33331dab6dfa8c1774a9b83cc,
dpl_Hc3QfG4ZszBzZKao8sGXUxjDefGL. Se leyeron ambos informes de esa main.
La salud/búsqueda públicas respondieron sin reproducir un error de conexión.

Se encontró un defecto real de integridad del itinerario: googleMapsSegments
convertía puntos inválidos en cadenas vacías y después los eliminaba con filter.
Con origen/destino válidos y una entrega vacía podía emitir un enlace que la
omitía. Ahora, con al menos dos puntos preparados, cualquier punto inválido o
separador de paradas dentro de una dirección bloquea todos los enlaces y pide
corroborarlo, sin eliminar entregas. Un borrador con menos de dos puntos válidos
sigue sin emitir navegación. La corrección se comprobó en producción.

### Funciones y archivos

P0 completado/publicado: bloqueo de itinerarios incompletos y direcciones con
separadores que Google interpretaría como paradas adicionales. Corregir el punto
recupera un enlace que incluye las entregas completas.

P1 completado/publicado: **Retomar desde**, sólo en recorridos calculados con
paradas. El operador elige origen o una entrega anterior al destino; cada enlace
comienza en el punto elegido y conserva todos los posteriores, sus números y
preferencias de carretera. Puntos guía usan índices explícitos del waypoint
original, no coincidencias de nombre/coordenadas o cercanía. Dos entregas iguales
siguen siendo dos visitas distintas. Se validan correspondencias antes de recortar.
Cambiar el tamaño de enlace o habilitar guías conserva la elección; cambiar ruta,
puntos, modo o preferencias la invalida antes de renderizar enlaces antiguos.
Volver al origen restaura el itinerario entero. La selección permanece al cambiar
de sección en la misma pestaña, es temporal y no escribe en rutas ni estados de
entrega. No es todavía progreso persistente entre dispositivos o recargas.

API: dos comunicados oficiales vinculados y vigilados por separado en Juárez,
publicados el 07-09 y 18-09-2026. Se conserva su ámbito operativo, la exclusión
de carga pesada del desvío para autos chicos y sus plazos diferentes, sin fecha
de reapertura inferida ni autorización de desvío. La consulta Web muestra ambos
enlaces con fecha y los límites de interpretación. No se añade una geometría,
regla, ventana, umbral de vehículo o municipio plenamente validado.

Archivos Web: components/NavigationLinks.tsx, lib/navigation.ts,
lib/google-route-guides.ts, lib/navigation-continuation.ts, app/globals.css,
test/navigation-continuation.test.mjs, test/navigation-links.test.mjs,
test/geolocation.e2e.mjs, test/integration/authenticated.e2e.mjs. API:
data/mx/national-references.json, docs/JUAREZ-OPERATIONS-MONITOR.md y
test/source-monitor.test.js. Este informe y MEXICO-COVERAGE.md cierran el ciclo.
No se cambiaron dependencias, secretos, variables, esquema ni datos Supabase.
No se operó sobre Gestión u otros proyectos ni se activó un servicio de pago.

### Verificación

- Web: TypeScript, compilación de producción, **162 pruebas**, **36 casos de navegador**
  y **seis flujos Auth/REST/PostgreSQL locales**, todos aprobados, cero omitidas.
  [CI 44111009593](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44111009593),
  jobs 134136329257 y 134136262821. Nuevos casos en 390/1280 px bloquean una parada
  vacía o separador y recuperan el enlace al corregirla. El flujo Auth nuevo en
  390/1365 px calcula con ORS sintético, guarda/restaura 48 entregas y retoma desde
  la 24, verifica guías, enlaces 3/9, extremos compartidos, preferencias, orden
  completo posterior, ida/vuelta de secciones y ruta/paradas originales intactas.
- API: build, **74 pruebas**, migraciones y comprobaciones RLS/ACL en PostgreSQL
  desechable aprobadas. [CI 44111783593](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44111783593),
  job 134139042739. El caso nuevo distingue cambio en un aviso de disponibilidad
  del otro incluso con principal caído; no infiere reapertura ni legalidad.
- Ambas auditorías npm --omit=dev reportaron cero vulnerabilidades conocidas.
  Chromium local sigue bloqueado por el entorno; navegador se ejecutó en GitHub,
  no se reportó el intento local como aprobado. No se alteró esa protección.
- Navegador público de producción, sin inyectar respuestas: origen/destino escritos,
  parada vacía muestra el mensaje de punto 2 y ningún enlace Google; completar
  la parada recupera origin/waypoints/destination con los tres puntos. La guía de
  Juárez muestra las dos URLs nuevas, sus fechas y las limitaciones de evidencia.
- Probes posteriores al despliegue: salud Web/API, coordenadas, Plus Code global
  y compuesto y búsqueda Express HTTP 200; ocho sugerencias cercanas. Validación
  con 0/2/48 paradas devuelve 200 y 49 devuelve 400; plan sin sesión devuelve 401.
  CORS autorizado: 204 con cabecera correspondiente; origen ajeno: 404 sin permiso.
- Vercel: ninguna fila de errores/fatales agregados en los 30 minutos consultados,
  ambos proyectos. Es una revisión puntual, no monitoreo permanente garantizado.
- No se creó una sesión de prueba alojada ni se ejecutó reanudación de un cálculo
  autenticado en producción o navegación física Android/Google. La reanudación
  calculada se validó con Auth/REST locales reales y proveedor sintético. No se
  presenta como uso real de sensores, legalidad ni navegación Google en carretera.

### Seguimiento de fuentes y bloqueos

Se consultó contenido oficial con fechas y URLs, y cada descarga directa nueva
se intentó una vez: HTTP 403. No se inventaron huellas ni se eludieron controles.
El workflow existente solicita cada seis horas; su última ejecución programada
observada antes del cambio fue 08:18:41 UTC, no se garantiza puntualidad de GitHub.
El push del registro activó la comprobación sin añadir cron ni permisos nuevos:
[44112003847](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44112003847),
job 134139824238, terminó correctamente y publicó el reporte de
**2026-11-17T15:14:30.013Z** (09:14 Chihuahua). Los cinco documentos de Juárez
recibieron HTTP_403, incluidos ambos avisos nuevos sin descarga correcta ni hash.
El éxito del workflow significa que registró resultados, no que las fuentes
estén accesibles o legalmente verificadas. Permanecen 15 municipios parciales,
cero con validación legal automática y ningún cambio al motor Directions.

### Publicación y recuperación

Web PR [#30](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/30):
candidato aa9819d78a4cda78d18072bc6c03240ec320abe7; merge publicado
**2260f77816c3b35c44fe927c9ffb8074de50eb18**. Deployment
**dpl_7dx6wmpHeYgAttkywPL7Uo7eijez**, READY/production;
https://route-planner-web-sand.vercel.app/ resuelve a ese SHA.

API PR [#23](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/23):
candidato 4ded7ebb7f1750807cf795de3846e58963fd1894; merge publicado
**8f7823190bef32ac2459b0af7bdc2e1e05d5bb4d**. Deployment
**dpl_FK4MRW9zb58rGCKPuuNF5AMrqFkc**, READY/production;
https://route-planner-api.vercel.app/ resuelve a ese SHA. Main avanzó después a
ccaaf1545c216d40d67522bb3309cd7409261f79 sólo por data/mx/source-status.json;
comparación comprobada. El endpoint lee ese reporte remoto sin volver a publicar
el motor. Se conserva el registro automático; no se sobrescribió con el local.

Rollback de entrada Web dpl_52eJGKK2KpiKLrphqH4d5svg9rNa (0909fae), API
dpl_Hc3QfG4ZszBzZKao8sGXUxjDefGL (f5c9b18). No hay migración/datos nuevos que
revertir. Los enlaces compartidos existentes del ciclo anterior y sus permisos
siguen siendo compatibles; no se cambió ningún grant. Se conserva historial,
ramas y commits de recuperación. No se ejecutó rollback. El cierre documental
posterior [skip ci] no añade código funcional sin publicar.

### Estado y siguiente prioridad

Completado/publicado: integridad de puntos Google, reanudación explícita temporal,
seguimiento y consulta de dos avisos más de Juárez. Parcial/bloqueado: progreso
de entregas persistente por cuenta/ruta; validación autenticada alojada y Android
físico sin medios actuales; descargas oficiales 403; vigencia, permisos y geometrías
sin verificar. No se promete ruta segura/legal, trazado exacto Google ni cobertura
nacional completa.

Próxima prioridad: progreso de entregas recuperable por ruta/cuenta con control
manual, aislamiento y revisión antes de omitir puntos, conservando el cálculo y
las entregas históricas. Continuar corroboración de actos y geometrías oficiales
sin convertir notas operativas en autorizaciones. El programa maestro sigue
abierto y se mantiene la tarea periódica existente sin duplicarla ni desactivarla.


## Cierre de ciclo · avance de entregas recuperable · 17-11-2026

### Diagnóstico y causa

Preflight nuevo: se consultaron GitHub, ambos dominios de producción, Supabase y
ENGINEERING-STATUS.md/MEXICO-COVERAGE.md de main. Web main
e3eda608a43e00a2db243fe22c59faa430b5f46f, producción
2260f77816c3b35c44fe927c9ffb8074de50eb18/dpl_7dx6wmpHeYgAttkywPL7Uo7eijez;
API main ccaaf1545c216d40d67522bb3309cd7409261f79, producción
8f7823190bef32ac2459b0af7bdc2e1e05d5bb4d/dpl_FK4MRW9zb58rGCKPuuNF5AMrqFkc.
Se preservó el reporte automático de fuentes de main. No se reprodujo un P0 de
conexión, búsqueda o validación pública en la comprobación inicial ni final.

La continuidad anterior sólo retenía temporalmente la elección **Retomar desde**;
no existía registro persistente por ruta de las entregas declaradas realizadas.
Una recarga u otra sesión no podían recuperar ese avance. No se resolvió marcando
la navegación como entrega: se añadió un registro manual separado de puntos,
cálculos, rutas compartidas y enlaces Google.

### Funciones completadas y archivos

**Mis rutas → Entregas** muestra las paradas en su orden original y el destino,
hasta 49 casillas cuando existen 48 paradas intermedias. El origen no es entrega.
Marcar casillas prepara cambios; **Guardar avance** los persiste explícitamente.
La selección se recupera al reabrir o iniciar otra sesión de la misma cuenta.
La interfaz indica cambios sin guardar; cerrar/cambiar ruta o cuenta cancela la
solicitud y descarta respuestas tardías. No se almacena avance en localStorage.

Cada cambio conserva una revisión anterior. Se consultan las diez revisiones más
recientes; **Revisar selección** prepara una anterior compatible y sólo guardar
añade otra revisión. No se borra historial ni se modifica una revisión existente.
Guardar exactamente la misma selección vigente no duplica registros. Si otra
sesión guardó antes, la escritura devuelve conflicto y mantiene la selección
local; **Actualizar avance** consulta y sustituye explícitamente esos cambios.
No hay reintento que sobrescriba silenciosamente.

La huella se calcula con puntos completos ordenados e identidades/secuencias
originales de las paradas. Reordenar dos visitas a la misma dirección también
la cambia. Si el recorrido cambió, se conserva historial pero sus marcas ya no
se aplican: el operador revisa la lista actual y guarda una selección nueva.
Archivar impide editar; recuperar la ruta conserva su historial. El panel queda
limitado a rutas activas y la sesión propietaria.

Web: .github/workflows/checks.yml, app/globals.css,
components/SavedRoutesPanel.tsx, components/DeliveryProgressPanel.tsx,
lib/delivery-progress.ts, lib/use-share-request.ts,
test/delivery-progress.test.mjs, test/delivery-progress-panel.test.mjs y
test/integration/authenticated.e2e.mjs. API: .github/workflows/checks.yml,
supabase/migrations/20261117201420_route_delivery_progress.sql,
test/sql/delivery-progress.sql y
[docs/DELIVERY-PROGRESS.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/DELIVERY-PROGRESS.md).
Este informe y MEXICO-COVERAGE.md documentan el cierre.

El avance sigue siendo declaración manual, no llegada GPS ni comprobante de
entrega. No cambia el cálculo o puntos originales, no altera enlaces compartidos
y no omite automáticamente puntos de Google. Para navegar se carga la ruta
completa y se revisa **Retomar desde**. No se restauró el límite de ocho entregas;
se mantienen los límites reales del proveedor y enlaces Google consecutivos.

### Base de datos y protección de datos

Se creó la migración con CLI y se aplicó exclusivamente a pakhlscjbjvwnheeyjxd.
La versión registrada por apply_migration es **20261117201420**; se alineó el
nombre del archivo con ella sin cambiar el SQL ni editar historial alojado.
SHA256 del SQL: 6fbee494123e630171ae3c7900a547418ce1c0f1709dd08d9eb50bae10254ff6.
El commit 6fbf44cac735c7e26ebd103f269863e9af6ba3ee usado por el flujo Web
autenticado contiene los mismos bytes SQL con el nombre anterior de creación.
El candidato API final comprueba el nombre canónico en un Postgres nuevo.

La tabla route_delivery_events usa RLS por propietario; authenticated sólo tiene
SELECT/INSERT, sin UPDATE/DELETE y sin acceso anónimo. El RPC usa SECURITY INVOKER,
search_path vacío, auth.uid() y pertenencia a una ruta activa. Un bloqueo breve
de la fila de ruta serializa escrituras y archivo; compara revisión y huella antes
de insertar. Valida coordenadas, orden, duplicados y rangos de las secuencias.
Leer no crea eventos. El servidor y cliente validan los datos recibidos.

Comprobación alojada posterior: **3 rutas, 10 paradas, 1 vehículo, 0 enlaces**, sin
cambios de cantidades, **0 eventos de avance**; RLS nueva activada, permisos anónimos
de tabla/RPC ausentes, mutaciones UPDATE/DELETE de cliente ausentes y RPC sin
elevación. No se crearon cuentas, rutas o entregas de prueba en producción.
El historial sigue ligado al ciclo de vida de la ruta/cuenta. El cliente propietario
puede insertar datos propios válidos bajo RLS: no es una bitácora probatoria
inalterable frente al dueño; RPC/UI añaden los controles de revisión y huella.

Health sin avisos; security conserva los avisos previos de RPC de enlaces
compartidos (uno anónimo y tres autenticados SECURITY DEFINER) y protección de
contraseñas filtradas desactivada. El RPC de entregas no añade SECURITY DEFINER ni
acceso anónimo. Performance sólo informa índices sin uso previo; no se eliminaron.
No se habilitaron funciones de pago ni cambiaron variables o credenciales.

### Pruebas y comprobación de producción

- Web: TypeScript, producción build, **169 pruebas unitarias/componentes** y
  **36 casos de navegador**, aprobados; auditoría npm --omit=dev con cero avisos.
  [CI 44166478468](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44166478468),
  jobs 134333782883 y 134333783624. Las pruebas nuevas de componente comprueban
  guardado explícito, conflicto, preparación de historial y cancelación al cerrar.
- **Siete flujos Auth/REST/PostgreSQL locales** aprobados, cero omitidos. El nuevo
  caso usa sesiones locales reales, 48 paradas más destino y pantallas 390/1365 px:
  guardar [1,24,49], recargar, conflicto con otra sesión, actualización explícita,
  revisión histórica sin escribir hasta guardar, aislamiento entre dos cuentas,
  cambio de puntos que invalida marcas y papelera/recuperación con historial.
  Dos escrituras HTTP simultáneas de la misma revisión producen exactamente un
  éxito y un conflicto. Ruta y paradas fuente permanecen intactas. Los cálculos
  de los otros flujos conservan proveedor ORS sintético.
- API: build, **74 pruebas**, auditoría npm --omit=dev cero vulnerabilidades,
  migraciones y SQL/RLS en PostgreSQL desechable aprobados.
  [CI final 44167288088](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44167288088),
  job 134336621742. SQL prueba precisión, lectura sin eventos, no duplicación,
  conflictos, acceso ajeno denegado, archivo/recuperación, cambio de puntos y
  permuta de visitas con coordenadas/etiquetas idénticas.
- Chromium local sigue sin poder iniciarse (SIGABRT/EPERM). Los casos de navegador
  se ejecutaron en GitHub; ese intento local no se contabiliza como aprobado.
- Probes reales posteriores a ambos deploys: Web, API health y proxy health 200;
  coordenadas decimales, Plus Code completo 75WMMW72+52, compuesto MW72+52 Monterrey
  y Bodega Aurrera Express 200. Express devolvió ocho sugerencias con sesgo cercano.
  Validación de 0/2/48 paradas 200; 49 devuelve 400. Plan sin sesión 401/AUTH_REQUIRED.
  CORS del origen autorizado 204 con cabecera; ajeno 404 sin autorización.
  Estas validaciones públicas no ejecutan un cálculo ORS autenticado alojado.
- Ambas consultas de logs Vercel error/fatal, agrupadas por ruta en los últimos
  30 minutos, no devolvieron filas. Es una comprobación puntual, no monitoreo
  continuo garantizado. Los trece archivos funcionales publicados coinciden
  byte a byte con los archivos locales verificados.
- **No ejecutado:** flujo de avance con una sesión alojada real, cálculo ORS
  autenticado alojado de este ciclo, navegación Google en carretera y Android
  físico. La inspección de migración/ACL alojada y las pruebas Auth locales no se
  presentan como esas verificaciones. No se garantiza seguridad/legalidad vial.

### Publicación, recuperación y límites

Web PR [#31](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/31),
candidato 7801777c4fb938b1ac42be482e261373dd43ce74; merge publicado
**c69d4ce1088a3d9a2d5ad84aff2956b75e4bfee4**, deployment
**dpl_7FSF7yMV7trtPBwifg8NWpwSSbwM**, READY/production. Alias comprobado:
https://route-planner-web-sand.vercel.app/.

API PR [#24](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/24),
candidato 6fe6b0c9cc0a7de41c472b699d69bcc3573f43f4; merge publicado
**cd8c8526901bce91a8c4052e1a3fac0ace07e402**, deployment
**dpl_5A8wM8zHdXFU6ZSG6h1v17RRb3Pd**, READY/production. Alias comprobado:
https://route-planner-api.vercel.app/.

Rollback conservado: Web **dpl_7dx6wmpHeYgAttkywPL7Uo7eijez** (2260f77), API
**dpl_FK4MRW9zb58rGCKPuuNF5AMrqFkc** (8f78231). Volver a la Web previa oculta
el panel; el esquema nuevo es aditivo y conserva historial. Si hiciera falta
suspender escrituras, revocar INSERT de route_delivery_events y EXECUTE de
route_delivery_progress(uuid,integer[],integer,text) a authenticated; reponer
los grants tras corregir/verificar. No borrar tabla, filas o historial de
migraciones. No se ejecutó rollback. Se mantienen ramas y commits de recuperación.
El cierre documental posterior [skip ci] sólo cambia estos dos informes y no añade
código funcional sin publicar. No se modificó Gestión ni ningún otro proyecto.

Normativa sin ampliación en este ciclo: **15 municipios parciales, cero con
validación legal completa**. El endpoint público conserva el reporte de
17-11-2026T15:14:30.013Z (09:14 Chihuahua), no obsoleto al comprobarlo; cinco
documentos de Juárez siguen HTTP_403/unavailable. Se preservó el monitor periódico
existente, sin añadir cron ni fuentes/reglas/geometrías no verificadas. Un avance
de entrega no certifica el acceso, horario, permiso, peso o dimensiones del camión.
Google sigue recalculando y no recibe parámetros HGV ni fija su trazado por guías.

Completado/publicado: progreso privado persistente, guardado manual, historial,
revisión antes de recuperación y control de conflictos. Parcial/bloqueado:
validación alojada autenticada y Android físico; normativa vigente, permisos y
geometrías; Juárez 403. Próxima prioridad: conectar el avance con la revisión
explícita de **Retomar desde**, mostrando las entregas pendientes sin omitir
automáticamente visitas, y continuar corroboración oficial accesible de Juárez y
actos posteriores de Puebla. El programa maestro sigue abierto. Se mantiene la
automatización existente activa, sin duplicarla ni desactivarla.


## Cierre de ciclo · revisar pendientes antes de navegar y PDF de Puebla · 17-11-2026

### Diagnóstico y causa

Se leyeron ambos informes de la main Web b475faf32c4f1579897da838f4bfeb29776a5005.
Producción Web c69d4ce/dpl_7FSF7yMV7trtPBwifg8NWpwSSbwM READY. API main
861b26754c5d7c45053d50f1a2a320a02b302c4b sólo añadió el reporte automático al
merge cd8c852, que seguía publicado en dpl_5A8wM8zHdXFU6ZSG6h1v17RRb3Pd.
Se preservaron todos los avances y el reporte, sin reutilizar cambios pendientes
locales de otras ejecuciones. La comprobación pública no reprodujo un P0 de red,
búsqueda o validación; los cálculos alojados autenticados no se ejecutaron.

El avance persistente existía, pero no había una revisión de enlaces desde esa
lista: cargar el recorrido y buscar manualmente dónde retomar añadía pasos y podía
confundir una entrega marcada fuera de orden con un prefijo completo. Se añadió
una revisión separada que conserva puntos, revisiones, cálculo y permisos.

### Función publicada y límites

En **Mis rutas → Entregas → Revisar navegación** se consulta otra vez el RPC de
avance de la cuenta y después sólo modo y preferencias de carretera guardados.
No se descarga geometría/instrucciones ni se dispara un cálculo ORS nuevo. Los
puntos son los del RPC validado; se rechazan datos incompletos o avance que no
corresponde a los puntos actuales. El panel queda ligado a cuenta/ruta y conserva
cancelación, timeout y descarte de respuestas después de abandonar la sección.

La revisión enumera cantidad pendiente y primera pendiente. Propone continuar
después de la última entrega del prefijo inicial completado consecutivamente.
**No se aplica automáticamente**: los enlaces parten del origen hasta pulsar
**Retomar después de entrega N** o elegir **Retomar desde**. Una entrega marcada
más adelante de un hueco permanece en los enlaces. Visitas repetidas con la misma
dirección/coordenadas no se fusionan. Elegir manualmente un origen que deja puntos
pendientes atrás muestra un aviso con su cantidad. Volver al origen restaura todos.
Todos completados tampoco inicia, oculta o recorta automáticamente el recorrido.

Se mantienen enlaces consecutivos de 3/9 paradas intermedias y el límite real de
48 paradas del proveedor (50 puntos totales), sin límite artificial de ocho.
Se conservan las preferencias guardadas de peajes/autopistas en cada enlace.
El modo camión muestra que Google no recibe peso, dimensiones ni permisos y no
conserva necesariamente el trazado original. Esta revisión usa puntos guardados,
sin afirmar que transfiere geometría o guías del cálculo. Para consultar ese
trazado y sus guías existentes se carga la ruta completa en el planificador.

Cambiar una casilla o preparar historial cierra la revisión; deshacer ese cambio
no restaura enlaces antiguos. Guardar/actualizar también la cierra. Cambios sin
guardar, conflicto/error o puntos obsoletos impiden abrir otra. Revisar vuelve a
leer el servidor: no es sincronización en vivo y la interfaz pide volver a revisar
si cambia el avance en otra sesión. No se marca ninguna entrega por abrir enlaces,
ni se escribe o comparte progreso al navegar. Un registro manual no es comprobante
de entrega, llegada GPS o autorización municipal.

Archivos Web: .github/workflows/checks.yml, app/globals.css,
components/DeliveryProgressPanel.tsx, components/NavigationLinks.tsx,
lib/delivery-progress.ts, test/delivery-progress-panel.test.mjs,
test/delivery-progress.test.mjs, test/navigation-links.test.mjs y
test/integration/authenticated.e2e.mjs. CI usa el merge API cd8c852 completo con
la migración canónica ya aplicada; no se añade una migración ni cambia el SQL.

### Puebla: evidencia nueva y seguimiento efectivo

Se revisó la página oficial de RES. 2025/148 y sus dos enlaces de descarga reales:
[anexo de corredores](https://gaceta.pueblacapital.gob.mx/publicaciones/minutas/item/download/1010_de64725dc771e51346629bf7150420d4)
y [reglas de operación](https://gaceta.pueblacapital.gob.mx/publicaciones/minutas/item/download/1011_6e30ca00b3bfbe8310ef2f0b1afc1954).
Descargas directas HTTP 200: anexo 339465 bytes/7 páginas, SHA256
1244f0f66db366f8b0f4612c32b64a6a857bc5d9f41c5117843448e95088a8a8;
reglas 340080 bytes/18 páginas, SHA256
49da56a082baac634fd004f9a24e224dc0eab4d2a532d7ac2d6bc1949532006f.
PDFinfo contrastó tamaños y páginas de los bytes descargados. La fecha técnica
del PDF o del buscador no se usa como fecha legal de publicación.

Ambas URL se incorporaron al grupo puebla-carga existente, con huellas independientes
del HTML, acta y COREMUN. API: data/mx/national-references.json,
data/mx/21114-parking-attachments.json, docs/PUEBLA-ATTACHMENTS-MONITOR.md y
test/source-monitor.test.js. Se conserva el snapshot anterior de 128 corredores;
no se comparó/reemplazó su contenido ni se resolvió la discrepancia 5/6. No se
inventan reformas de 2026 ni vigencia actual de las reglas por encontrar adjuntos.

El cambio del registro activó el monitor ya existente:
[44213200927](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44213200927),
job 134496444078, aprobado. El reporte real de **2026-11-18T01:06:33.575Z**
(17-11, 19:06 Chihuahua) registró ambos PDF con las mismas huellas directas,
status **unreviewed**, sin error ni validación legal; relatedSetChanged=true.
Puebla figura changed por cambios técnicos pendientes de revisar, no una reforma
aprobada automáticamente. Juárez sigue unavailable/HTTP_403. El monitor conserva
su programación y límites previos; no se creó otro cron, proveedor, cuota o servicio.

La primera consulta pública posterior todavía devolvió el reporte de 21:12:42 UTC
del 17-11 porque el backend conserva caché de 15 minutos. No se presentó como el
reporte nuevo. Se publicó el checkpoint automático 5787c11 después de comprobar
que únicamente difiere en data/mx/source-status.json respecto de 0c972ad. El motor
y el registro probados son idénticos; el reporte nuevo se incluye como respaldo
sin esperar a la expiración de caché. La verificación final del endpoint queda
registrada abajo con el deployment correspondiente.

### Pruebas y comprobaciones

- Web: TypeScript, build de producción, **175 pruebas unitarias/componentes**,
  **36 casos de navegador** y **ocho flujos Auth/REST/PostgreSQL locales**, todos
  aprobados, cero omitidos. Auditoría npm --omit=dev: cero vulnerabilidades.
  [CI 44212533308](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44212533308),
  jobs 134494211050 y 134494211602. Navegadores ejecutados en GitHub; el Playwright
  descargado no estaba local y el Chromium del sistema no logró iniciarse.
- El octavo flujo usa cuentas/sesiones locales reales, 48 paradas más destino,
  390/1365 px y visitas repetidas. Otra sesión cambia el avance antes de revisar;
  la UI consulta la revisión nueva, conserva inicio completo hasta la elección,
  mantiene todas las visitas posteriores en enlaces 3/9 y preferencias de carretera,
  avisa de pendientes omitidos por elección manual y cierra al editar. Todos
  completados y cambio de puntos vuelven al recorrido completo o bloquean revisión,
  respectivamente. Revisar no crea eventos. No hay desbordamiento horizontal.
- API: build, **75 pruebas**, migraciones y SQL/RLS en Postgres desechable, aprobados;
  auditoría npm --omit=dev cero vulnerabilidades.
  [CI 44213017647](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44213017647),
  job 134495844745; CI push 44213200952 también aprobado. La prueba nueva verifica
  cambios independientes de adjuntos sin ampliar cobertura, alterar corredores
  o aprobar normas. Fixtures del monitor se distinguen de las descargas reales.
- Producción pública posterior al primer par de deployments: Web, salud API y
  proxy 200; coordenadas decimales, Plus Code completo 75WMMW72+52 y compuesto
  MW72+52 Monterrey 200; Bodega Aurrera Express 200 con ocho sugerencias cercanas.
  Validar 0/2/48 paradas: 200; 49: 400. Plan sin sesión: 401/AUTH_REQUIRED.
  CORS autorizado: 204 con cabecera; ajeno: 404 sin cabecera. Validar no equivale
  a calcular una ruta ORS autenticada alojada.
- Los nueve archivos Web y cuatro API publicados coinciden byte a byte con los
  locales verificados. Vercel no devolvió filas error/fatal agregadas en los 30
  minutos consultados de ambos proyectos; es una revisión puntual.
- Supabase alojado, sólo consulta: siguen **3 rutas, 10 paradas, 1 vehículo,
  0 eventos de avance y 0 enlaces**. No se sembraron cuentas o datos de prueba.
  Los avisos previos de RPC compartidos SECURITY DEFINER y protección de
  contraseñas filtradas desactivada siguen pendientes, sin cambios en privilegios.
  Referencias de los avisos: https://supabase.com/docs/guides/database/database-linter
  y https://supabase.com/docs/guides/auth/password-security .
- No ejecutado: navegación del panel con sesión alojada real, cálculo ORS
  autenticado alojado de este ciclo o Android/Google físicos en carretera. Los
  flujos Auth locales son reales dentro del entorno desechable, pero sus cálculos
  usan ORS sintético. No se presentan como esas verificaciones alojadas/físicas.

### Publicación, recuperación y próxima prioridad

Web PR [#32](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/32):
candidato a0835469232f2c858c44dc4fc78116c3f3feb7cc, merge publicado
**a6336b0fb484167a399f9be4195a2fb2f167f44d**, deployment
**dpl_72kFGuVRnN1DNSJVCqzESUbNT124**, READY/production, alias comprobado
https://route-planner-web-sand.vercel.app/.

API PR [#25](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/25):
candidato 79d1c967acc0d992e513d6ce0028a55039b6eb1d; merge
**0c972ad032ec120148b4548d7884ec755cd4345a**, primer deployment
**dpl_3euuDUdBhHessWY6VF1opgkJJzHL**, READY. Checkpoint posterior sólo de reporte
**5787c11b456bf26a3eb8aad29ec3d2679c7574c0**, deployment final
**dpl_EtsjrQWemC81bEYiLu2ZH2cStybr**, READY/production; alias verificado al SHA
5787c11. El endpoint público por el proxy sirve el reporte de 01:06:33.575Z,
no obsoleto, y ambos adjuntos unreviewed con las dos huellas directas, sin errores.
API https://route-planner-api.vercel.app/. El cierre documental Web posterior
[skip ci] sólo cambia estos informes y no contiene funcionalidad sin publicar.

Rollback conservado: Web **dpl_7FSF7yMV7trtPBwifg8NWpwSSbwM** (c69d4ce), API
**dpl_5A8wM8zHdXFU6ZSG6h1v17RRb3Pd** (cd8c852). Revertir Web oculta la revisión
nueva sin borrar avance, rutas o historial. No hay migración nueva que revertir.
Conservar registro/huellas técnicas en Git; no eliminar datos de usuario. No se
hizo rollback ni se modificó Gestión u otros recursos, secretos, variables o
servicios de pago. Las ramas/candidatos y su punto de recuperación se mantienen.

Completado/publicado: revisión explícita desde avance persistido, pendientes,
prefijo consecutivo, advertencia ante pendientes anteriores al inicio, enlaces
ordenados y seguimiento de los dos PDF. Parcial/bloqueado: verificación alojada
con sesión y Android físico; vigencia/permisos/geometrías municipales y Juárez
403. Permanecen **15 municipios parciales y cero con validación legal completa**;
ninguna calle, sentido, horario, dimensión/peso o permiso se añadió al ruteo.

Próxima prioridad: comparar reproduciblemente el anexo publicado de siete páginas
con el anexo de nueve páginas del acta, preservando versiones, ámbitos y la
ambigüedad 5/6 hasta corroborarla; revisar actos oficiales posteriores de 2026.
Continuar la revisión del recorrido calculado junto a pendientes sin aplicar
saltos o recalcular automáticamente. El programa maestro sigue incompleto y se
conserva la tarea periódica existente activa, sin duplicarla ni desactivarla.


## Cierre de ciclo · contraste de anexos oficiales por corredor · 18-11-2026

### Diagnóstico y causa

Se consultaron de nuevo main y ambos dominios antes de modificar. Web main
08a7d8c7d219aedc6b8852cba587f5a82cdd020d, producción a6336b0/dpl_72kFGuVRnN1DNSJVCqzESUbNT124;
API main/producción 5787c11b456bf26a3eb8aad29ec3d2679c7574c0,
dpl_EtsjrQWemC81bEYiLu2ZH2cStybr. Se leyeron ENGINEERING-STATUS.md y
MEXICO-COVERAGE.md de esa main y se conservaron los avances y reportes.
No se reprodujeron errores críticos de red/búsqueda en la comprobación inicial.

La referencia de corredores sólo enlazaba las páginas del acta. Los adjuntos de
Gaceta ya estaban localizados y vigilados, pero no existía una correspondencia
por registro ni comparación reproducible. No se supuso que encontrar dos archivos
parecidos o un enlace publicado resolviera la discrepancia 5/6 o la vigencia legal.

### Implementación y evidencia

Se descargaron otra vez los PDF reales con HTTP 200. Acta: 2395402 bytes,
167 páginas, anexo en 80–88, SHA256
0917dc30ac70594a6e954243800bc5219d7ea3f2bc8017f7ea532b8ec510555c.
Adjunto: 339465 bytes, siete páginas, SHA256
1244f0f66db366f8b0f4612c32b64a6a857bc5d9f41c5117843448e95088a8a8.
Fuentes, método y límites en
[PUEBLA-ANNEX-COMPARISON.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/PUEBLA-ANNEX-COMPARISON.md).

El script nuevo primero debe reproducir íntegramente el snapshot anterior del
acta con su importador existente. Después verifica la huella del adjunto y
contrasta 128 números/ocurrencias en orden, etiquetas de polígono, nombres de
corredor, extremos y horarios por días/estado/horas. Sólo normaliza espacios,
palabras partidas ya revisadas del importador y espacios alrededor del guion
ASCII; no elimina acentos, números, sufijos A/B o palabras. Excluye de horarios
los contadores flotantes de página del acta, sin convertir «No aplica» en permiso.

Los 128 registros coinciden en esos campos tras normalizar. Hay 29 registros con
diferencias de espacios alrededor de guiones en los nombres extraídos: 38/41
(Norte-Sur) y 42–68 (Carmen-Huexotitla). El JSON conserva ambos valores, huellas y
cada correspondencia de página. No se afirma identidad literal de los PDF.
Cambiar bytes detiene con SOURCE_CHANGED; discrepancia de campo con CONTENT_CHANGED.
Se reprodujo el JSON idéntico y se rechazó un PDF alterado. Python/pdfplumber
0.11.9 se ejecutaron localmente; no se atribuye esa reproducción a GitHub CI.

Se inspeccionaron las siete páginas renderizadas del adjunto y las páginas 87/88
del acta. Ambos mantienen ocho filas con etiqueta 5 y cuatro con etiqueta 6 para
San Alejandro–Ortopedia: **la ambigüedad persiste**, no se corrige por inferencia.
Duplicados 10/15 y 126/128 intactos. El registro 124 corresponde a páginas 87/88
del acta y página 7 del adjunto; se conserva como una sola ocurrencia.

API añade annexComparison sólo en Puebla y publishedSourcePages a sus filas.
El snapshot original y todos sus nombres/horarios quedan intactos. La respuesta
omite las 29 diferencias extraídas y la tabla redundante completa de mappings;
la evidencia íntegra queda en Git. No se cambia publicationDate, reglas,
timeRules, geometrías ni ruta. La Web anterior ignora los campos adicionales;
la nueva conserva su comportamiento si la comparación falta.

Web añade **Contraste de anexos** plegado dentro de los 128 corredores, con fuentes,
conteos, alcance, normalización y pendientes. Cada corredor conserva sus enlaces
del acta y añade la página del adjunto. Para emitir enlaces de contraparte requiere
comparación sin aprobación legal ni ruteo, conteo coincidente, HTTPS del dominio
oficial y página válida. Se conservan búsqueda, filtros, orden y repeticiones.

Archivos API: scripts/compare-puebla-parking.py,
data/mx/21114-parking-comparison.json, lib/municipal-regulations.js,
test/municipal-regulations.test.js y docs/PUEBLA-ANNEX-COMPARISON.md. Web:
lib/parking-corridors.ts, components/MunicipalParkingCorridors.tsx,
components/MunicipalAnnexComparison.tsx, app/globals.css,
test/parking-corridors.test.mjs, test/geolocation.e2e.mjs y
test/fixtures/parking-comparison.mjs. Estos dos informes cierran el ciclo.

### Verificación

- API: build, **76 pruebas**, auditoría npm --omit=dev cero vulnerabilidades,
  migraciones/SQL/RLS en Postgres desechable aprobados.
  [CI 44248872518](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44248872518),
  job 134614370132. Verifica 128 correspondencias, 29 diferencias, hashes,
  duplicados, páginas partidas, original intacto y ausencia de aprobación legal.
- Web: TypeScript, build de producción y **177 pruebas unitarias/componentes**
  aprobados localmente, auditoría npm --omit=dev cero vulnerabilidades.
  CI navegador/autenticación: **177 pruebas**, **37 casos de navegador** y **ocho flujos Auth/REST/PostgreSQL locales** aprobados, cero omitidos. [44248888311](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44248888311), jobs 134614425453 (Web) y 134614425234 (Auth). El caso nuevo en 390/1280 px comprueba contraste plegado, filtros exactos, páginas de ambas versiones, repeticiones y ausencia de desbordamiento. El retraso observado fue preparación de Chromium; ambos trabajos terminaron correctamente..
- Chromium local no logró iniciarse. No se reporta ese intento como aprobado;
  navegadores se ejecutan en GitHub o en la comprobación pública separada.
- Producción pública antes de la Web nueva: búsqueda/confirmación de Plus Code
  completo y coordenadas reales comprobada en navegador, sin interceptar respuestas.
  El punto conserva sus coordenadas completas en la corroboración. La Web anterior
  con API nueva conserva 128 registros y no muestra enlaces de contraparte nuevos.
- Producción nueva: navegador real sin interceptar respuestas, viewport 1348×926: consulta Puebla, abre contraste de 128 registros, observa método y límites, filtra 29 A Norte a un registro y comprueba acta páginas 87/88 más adjunto página 7. El filtro de polígono 6 conserva cuatro registros. Se dejó la consulta preparada para revisión. Es prueba pública de escritorio, no Android físico ni cálculo autenticado alojado..
- Probes finales HTTP/API/Plus Codes/búsqueda/límites/CORS: salud Web/API/proxy, coordenadas decimales, Plus Code completo 75WMMW72+52, compuesto MW72+52 Monterrey y Express: 200; ocho sugerencias Express. Validación 0/2/48 paradas 200 y 49 devuelve 400. Plan sin sesión 401/AUTH_REQUIRED. CORS autorizado 204 con cabecera y ajeno 404 sin autorización. Tras publicar Web se volvió a comprobar salud, Plus Code, coordenadas y la nueva referencia por su proxy..
- Logs Vercel: ambos proyectos, sin filas error/fatal agregadas en los 30 minutos consultados. Es comprobación puntual, no monitoreo continuo garantizado.
- Supabase alojado sólo se consultó: **3 rutas, 10 paradas, 1 vehículo,
  0 eventos de avance, 0 enlaces**, sin cambios ni datos/cuentas de prueba nuevos.
  No hay migración, modificación de privilegios, configuración, secretos o servicios
  de pago. Los avisos previos documentados de Supabase no se resuelven en este ciclo.
- No ejecutado: cálculo ORS autenticado alojado o navegación física Android/Google.
  Los flujos Auth de CI usan sesiones/REST/Postgres locales reales y cálculos ORS
  sintéticos; los fixtures municipales sólo prueban interacción, no normas reales.
  La comprobación pública de la consulta se registra por separado.

### Publicación y recuperación

API PR [#26](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/26),
candidato 20d659b1ad15a5ff81af944c12f9442032a902dc; merge
**8891b1b041e2924da47634be23ad58639563376b**, deployment
**dpl_BFakA27xhMoDv6EyvDdUS2N3vDBa**, READY/production. Alias comprobado
https://route-planner-api.vercel.app/ al mismo SHA.

Web PR [#33](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/33),
candidato d9b5c049e1c718cfac74c200b1036c5b065b7c9a; merge **fe1601b7c87b8eb69ffa6bf2f3a4d734c94ef389**,
deployment **dpl_33HgrktzfaWXGsG53pkK9b1F5564**, READY/production, alias comprobado al mismo SHA. Alias
https://route-planner-web-sand.vercel.app/.

Rollback conservado: Web **dpl_72kFGuVRnN1DNSJVCqzESUbNT124** (a6336b0), API
**dpl_EtsjrQWemC81bEYiLu2ZH2cStybr** (5787c11). Revertir oculta contraste/enlaces
nuevos conservando todos los datos e historial. No hay SQL que revertir. No se
hizo rollback ni se modificó Gestión u otros recursos, variables o credenciales.
El cierre posterior [skip ci] sólo modifica estos dos informes, sin funcionalidad
pendiente de publicar. Se mantienen candidatos y ramas de recuperación.

### Normativa y siguiente prioridad

No se cambia el monitor, sus URL, frecuencia, cuotas o límites; ambos PDF ya estaban
vigilados. Reporte público observado: 2026-11-18T01:06:33.575Z, no obsoleto en esta comprobación; Juárez unavailable/HTTP_403 y los adjuntos sin aprobación legal. No se convierte su status
unreviewed en aprobación legal por contrastar campos. La búsqueda dirigida de
actos de 2026 no prueba ausencia de reformas; no se inventa vigencia ni una cadena
completa. Permanecen **15 municipios parciales y cero con validación legal completa**.
No se añade ninguna calle, horario HGV, permiso, sentido o geometría al motor.
Google sigue recalculando sin dimensiones/peso ni garantía de trazado exacto.

Completado/publicado: comparación reproducible y enlaces de corroboración por
corredor entre dos anexos. Parcial: cadena de publicación/consolidación y cambios
posteriores de 2026; sin resolver 5/6, permisos y geometrías. Próxima prioridad:
contrastar los artículos de maniobras de las reglas adjuntas con el acta y sus
reformas, conservando sus ámbitos y fechas; continuar revisión de navegación junto
al trazado calculado, sin saltos automáticos. El programa maestro sigue abierto
y la tarea periódica existente se mantiene activa sin duplicarla.


## Cierre de ciclo · contrastar las disposiciones de maniobras · 18-11-2026

### Diagnóstico y alcance

Preflight fresco: Web main 89ef838b9e669f18d479bead2b48c0db3b5be2c6,
producción fe1601b/dpl_33HgrktzfaWXGsG53pkK9b1F5564; API main
03c900e0113bb7372664e1c0009a9fcc31fcfcfd, producción
8891b1b/dpl_BFakA27xhMoDv6EyvDdUS2N3vDBa. Main API sólo adelantaba el reporte
automático de fuentes; se conservó. Se leyeron ambos informes de Web main.
No se reprodujo un P0 de red. Las tres fichas de maniobras seguían citando sólo
el acta aunque las reglas adjuntas estaban descargadas y vigiladas. Faltaba un
contraste delimitado por artículo que el operador pudiera consultar.

### Implementación y evidencia

Se descargaron otra vez los PDF oficiales, HTTP 200, y se inspeccionaron sus
páginas renderizadas. Acta: 167 páginas, 2395402 bytes, página 70, SHA256
0917dc30ac70594a6e954243800bc5219d7ea3f2bc8017f7ea532b8ec510555c.
Reglas adjuntas: 18 páginas, 340080 bytes, página 7, SHA256
49da56a082baac634fd004f9a24e224dc0eab4d2a532d7ac2d6bc1949532006f.
Los artículos 11, 12 y 13 coinciden en texto seleccionado al normalizar únicamente
espacios y saltos de línea. Palabras, signos, números y comparadores se conservan.
El script verifica huellas, páginas, límites de artículos, hash íntegro normalizado
y las condiciones originales asociadas; no descarga ni publica normas. Se
reprodujo localmente el JSON idéntico y un PDF alterado se rechazó SOURCE_CHANGED.
No se atribuye esta reproducción Python/pdfplumber a CI.

API añade documentReview a exactamente las tres fichas de corredores: artículo
11 para capacidad hasta/mayor de 3.5 t y 12–13 para permiso/duración. Se conserva
la fuente primaria, todos los campos originales y el ámbito particular del
programa. No se cambia national-references.json, timeRules, permisos, geometrías,
monitor, SQL, variables ni dependencias. LegalValidityVerified y routingEnforced
siguen false. No se confunde capacidad de carga con peso bruto ni se resuelven
por inferencia los comparadores de 2021 o el tonelaje de COREMUN.

Web muestra un contraste plegado por ficha, con fecha, método, ámbito y ambos
enlaces a páginas exactas. Valida municipio, estado sin aprobación, fechas,
huellas, artículos, páginas dentro del documento y HTTPS del dominio oficial;
si el bloque falla conserva el enlace primario sin generar contrapartes.
Las fichas anteriores de otras fuentes no adquieren este contraste.

Archivos API: scripts/compare-puebla-loading.py, data/mx/21114-loading-review.json,
lib/municipal-regulations.js, test/municipal-regulations.test.js,
docs/PUEBLA-LOADING-COMPARISON.md. Web: lib/provision-review.ts,
components/MunicipalProvisionReview.tsx, components/MunicipalCoverage.tsx,
app/globals.css, test/provision-review.test.mjs, test/fixtures/provision-review.mjs,
test/geolocation.e2e.mjs; cierre en estos dos informes.

### Pruebas y límites prácticos

- API: build y 77 pruebas aprobadas localmente y en
  [CI 44291786883](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44291786883),
  job 134758545929. Migraciones/SQL/RLS y auditoría npm --omit=dev (cero
  vulnerabilidades) aprobadas en PostgreSQL desechable.
- Web: typecheck, build, 180 pruebas unitarias/componentes y auditoría de producción
  cero vulnerabilidades, local y
  [CI 44291803059](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44291803059).
  Job 134758601707: 38 casos de navegador, incluido el contraste en 390/1280 px,
  páginas exactas, ámbito, original intacto y ausencia de desbordamiento.
  Job 134758601402: ocho flujos Auth/REST/PostgreSQL locales reales, aprobados.
  Los fixtures de rutas/municipios no son validación normativa o cálculo ORS real.
- Chromium local no pudo iniciarse; no se reporta como aprobado. CI sí ejecutó
  Chromium. Android físico, Google real en movimiento y cálculo ORS autenticado
  alojado no ejecutados; no hay cuenta/sesión privada utilizada para esos fines.
- Producción real, navegador sin interceptar: Guía camión → Puebla → tres fichas;
  apertura de los tres contrastes, artículos 11/12–13, fuentes acta 70/reglas 7,
  aviso de no acreditar permisos y ausencia de contraste en ficha de 2021.
  Captura de escritorio 1348×926; no equivale a Android físico.
- HTTP público API nueva: salud, coordenadas decimales, Plus Code completo
  75XMRW22+22, compuesto RW22+22 Chihuahua y Bodega Aurrera Express: 200;
  una sugerencia en cada formato directo y ocho Express. Municipio Puebla
  expone tres bloques revisados, otro municipio ninguno. Validación 0/2/48
  intermedias: 200; 49: 400; plan sin sesión: 401. Es validación de entrada,
  no cálculo autenticado. CORS autorizado: 204 con cabecera; ajeno: 400 sin ella.
- Vercel: ambos alias READY y apuntando a los merges indicados abajo; no hubo
  filas error/fatal agregadas en los 30 minutos consultados. Verificación puntual.
- Supabase alojado, sólo lectura: 3 rutas, 10 paradas, 1 vehículo, cero eventos
  de avance y cero enlaces. Sin cambios de datos, esquema, políticas o secretos.
  Avisos previos de funciones SECDEF/contraseñas filtradas siguen pendientes.

### Publicación y recuperación

API PR [#27](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/27),
candidato f8df550551f4c7fbe080ba13ea46a5caac658d20, merge
27e161c7eb325d2524ff02577073ad457908affc, deployment
**dpl_2qZB8kkDGAFqQQr8Yw1hoA6Q2ogt** READY/production. Alias comprobado al SHA:
https://route-planner-api.vercel.app/.

Web PR [#34](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/34),
candidato b89a5207a323805fabd4f0a3ca364e6773c90811, merge
453f937002871ffa68b0faf9f54c9c04238aca46, deployment
**dpl_4bsYL7c4VNwzNpiBQizAMQpiaEz1** READY/production. Alias comprobado al SHA:
https://route-planner-web-sand.vercel.app/.

Rollback previo conservado: Web dpl_33HgrktzfaWXGsG53pkK9b1F5564/fe1601b,
API dpl_BFakA27xhMoDv6EyvDdUS2N3vDBa/8891b1b. No se ejecutó rollback;
revertir oculta los bloques nuevos sin perder datos. API es aditiva y Web admite
su ausencia. No hay SQL que revertir. Gestión y otros proyectos intactos;
ningún servicio de pago activado. Cierre documental [skip ci] sólo en estos dos
informes, sin código funcional adicional pendiente de publicar.

### Cobertura y continuación

Completado/publicado: contraste reproducible delimitado a tres artículos y
corroboración desde las tres fichas. Parcial: publicación íntegra/consolidación,
actos posteriores de 2026, vigencia, permisos actuales, días, sustancias, zonas,
sentidos y geometrías. El contraste no convierte documentos unreviewed o cambios
de huella en aprobación legal ni habilita circulación. Se mantienen 15 municipios
parciales y cero completos, sin nueva regla aplicada al motor. Google sigue sin
recibir HGV ni conservar obligatoriamente el trazado exacto.

Monitor sin cambios; reporte observado 2026-11-18T07:49:38.924Z, no obsoleto.
Juárez unavailable/HTTP_403 y CDMX Centro unavailable/NETWORK_OR_TIMEOUT.
No se interpreta un cambio técnico como reforma ni una búsqueda como prueba de
ausencia de actos posteriores. Próxima prioridad: revisar publicación y cambios
posteriores de Puebla conservando versiones y la ambigüedad 5/6; continuar P1
revisión del trazado calculado junto al avance antes de navegar, sin omitir
entregas automáticamente. El programa maestro sigue incompleto y la automatización
existente permanece activa; no se duplica ni elimina.


## Cierre de ciclo · trazado guardado junto al avance de entregas · 18-11-2026

### Problema e implementación

Se continuó desde Web main abb89d1c2119e28dd65fadac76776f0be71a64df, tras el
cierre anterior. Producción Web 453f937/dpl_4bsYL7c4VNwzNpiBQizAMQpiaEz1 y
API 27e161c/dpl_2qZB8kkDGAFqQQr8Yw1hoA6Q2ogt. No se reutilizaron archivos
pendientes de otros ciclos. Los informes se conservan íntegros como historial.

La revisión de entregas mostraba puntos pendientes y enlaces Google, pero para
consultar el cálculo almacenado el operador debía cargar la ruta y abandonar esa
revisión. Se añadió **Ver trazado guardado**, opcional y bajo demanda, dentro de
Mis rutas → Entregas → Revisar navegación. Muestra mapa original completo,
distancia/tiempo estimados del cálculo guardado y lista numerada con las marcas
manuales consultadas. Si detecta una discrepancia, cierra la revisión completa y retira sus enlaces
anteriores; debe actualizarse antes de volver a navegar. No recorta el mapa al
elegir Retomar desde, no calcula
una ruta nueva desde GPS y no modifica ningún enlace o guía de Google.

La lista de rutas y la apertura normal del avance siguen sin descargar geometría.
Sólo la petición explícita obtiene campos específicos del resultado de una ruta
activa bajo RLS; después consulta otra vez el avance. Rechaza cambios de revisión,
snapshot, puntos/orden/etiquetas, perfil o preferencias. Conserva las 50 ocurrencias
posibles, incluida dirección repetida, origen y destino. Coordenadas no se redondean.
Los datos incompletos o geometrías inválidas/extensas producen un error específico;
no se omiten puntos para forzar una vista parcial. Límite de vista previa de
500000 caracteres de polyline y 100000 vértices; no es un nuevo límite de entregas.
Puede cargarse la ruta completa si esa vista no está disponible.

La consulta no escribe eventos ni datos. Editar avance, cerrar revisión, cambiar
ruta/cuenta o salir del panel descarta la vista; las solicitudes se cancelan o
sus respuestas tardías se ignoran mediante el control de ciclo de vida existente.
El mapa sólo representa el cálculo guardado: no acredita actualidad, circulación,
permisos ni seguridad. Google sigue recalculando sin recibir trazado o HGV.

Archivos: components/SavedRouteTraceReview.tsx, lib/saved-route-trace.ts,
components/DeliveryProgressPanel.tsx, app/globals.css,
test/saved-route-trace.test.mjs y test/integration/authenticated.e2e.mjs.
Sin cambios API, SQL, dependencias, variables, credenciales o servicios de pago.

### Verificación

Local: build de producción, typecheck, 184 pruebas unitarias/componentes,
cuatro casos nuevos de integridad/concurrencia/límites/etiquetas históricas y
auditoría npm --omit=dev con cero vulnerabilidades conocidas, aprobados.
Diff sin errores de espacios. next-env.d.ts generado no se publica.

[CI 44295634742](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44295634742):
Web job 134771958722: typecheck, build, 184 pruebas, 38 casos de navegador y auditoría con cero vulnerabilidades. Auth job 134771958546: nueve flujos Auth/REST/PostgreSQL locales reales, incluido el rechazo de cambios y cierre de enlaces antiguos. Ambos trabajos success; cero fallos u omisiones.
La prueba autenticada nueva, en 390/1365 px, guarda 50 puntos sintéticos mediante
sesiones y REST/PostgreSQL locales reales. Comprueba carga de geometría sólo al
pedirla, mapa, lista completa y marcas manuales, direcciones repetidas, enlaces
Google idénticos antes/después, origen sin salto automático, ausencia de desborde,
rechazo de cambio paralelo del avance y retirada de enlaces antiguos,
actualización explícita, desaparición del
mapa al editar y resultado/eventos persistidos intactos. No invoca ORS para la
vista previa; la geometría de esa prueba es sintética, no navegación real.

El entorno local continúa sin Chromium operativo; no se atribuye a él la ejecución
de navegador. La comprobación del flujo privado en producción y Android físico
no se ejecutó: no hay sesión privada alojada utilizada ni nuevas cuentas de prueba
en el servicio alojado. Una consulta agregada de sólo lectura comprobó que las
tres rutas existentes tienen geometría, perfil, estimaciones y el número íntegro
de puntos, además de igualdad de coordenadas/etiquetas en su orden guardado; es
compatibilidad de datos, no una sesión funcional de navegador.
La publicación de la función se apoya en la integración
funcional local real de CI, además del build, y se distingue del smoke público.

Supabase alojado sólo leído al terminar: 3 rutas, 10 paradas, 1 vehículo, cero
eventos de avance y cero enlaces, igual al preflight. No se cambió esquema/RLS,
configuración o privilegios, ni se tocaron Gestión u otros proyectos. Permanecen
los avisos previos SECDEF/contraseñas filtradas, sin asumir que estén resueltos.

Smoke público después de verificar el alias nuevo: Web/manifest, salud por proxy,
coordenadas, Plus Code completo/compuesto, Express y consulta municipal: 200;
ocho sugerencias Express y tres contrastes de maniobras conservados. Validación
0/2/48 intermedias: 200; 49: 400; plan sin sesión: 401. No equivale a un cálculo
ORS autenticado alojado. El reporte de fuentes sigue 2026-11-18T07:49:38.924Z,
no obsoleto. Ambos proyectos Vercel sin filas error/fatal agregadas en la ventana
de 30 minutos; comprobación puntual, no garantía de ausencia futura.

### Publicación y recuperación

Web PR [#35](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/35),
candidato final 51af3f86110403224faaa2d01b011c0fed6b2359 (anterior
1e99ae1e942f21105d1ec4c6ad416d37cfd64ba8 conservado en la rama), merge **da3efef0a4ef580804857bd537c0f4419f52b362**.
Deployment **dpl_3x4t7Q3ixeiCpaCCMtuHwyzzFELv** READY/production; alias de
https://route-planner-web-sand.vercel.app/ comprobado al mismo SHA.
API permanece en **27e161c7eb325d2524ff02577073ad457908affc**,
**dpl_2qZB8kkDGAFqQQr8Yw1hoA6Q2ogt**; no requiere despliegue nuevo por este cambio.
Rollback Web conservado **dpl_4bsYL7c4VNwzNpiBQizAMQpiaEz1** /453f937;
revertir oculta la vista nueva sin perder avance o cálculos. Sin SQL que revertir.
El cierre documental posterior [skip ci] sólo cambia los dos informes.

### Estado y continuación

Completado/publicado: vista del trazado guardado bajo demanda junto al avance,
control de consistencia y conservación íntegra de puntos/Google. Parcial/bloqueado:
verificación privada alojada y Android físico. El trazado es completo y guardado,
no un recálculo actualizado desde una entrega elegida; no se presenta como tal.
Próximo P1: corroborar en equipo real el flujo de navegación/reanudación y mejorar
la relación entre los puntos pendientes y el trazado sin omitir visitas o prometer
que Google lo conservará. Mantener las solicitudes autenticadas reales separadas
de fixtures en todos los reportes.

Normativa: ninguna regla o geometría nueva se aplica al ruteo. Permanecen 15
municipios parciales, cero completos, y pendientes publicación/consolidación,
actos posteriores, permisos, días, ámbitos, sentidos y geometrías verificadas.
Se localizó como pista independiente una versión estatal del Reglamento de la
Ley de Transporte de Puebla: índice OJP y tabla de reformas del PDF citan
21/abr/2026. Su archivo conserva un nombre de 2024; no debe inferirse la fecha de
contenido por la URL. Es jurisdicción estatal, no autorización municipal ni una
reforma automáticamente aplicable a las fichas de carga/estacionamiento. Fuente:
https://ojp.puebla.gob.mx/media/k2/attachments/Reglamento_de_la_Ley_de_Transporte_del_Estado_de_Puebla_T5_11112024_1.pdf
La lectura web recuperó la tabla de reformas de un PDF de 255 páginas; la descarga
directa local devolvió HTTP 503 y no se realizó revisión íntegra ni cotejo visual.
Se deja para revisión íntegra y cotejo con publicación oficial antes de incorporar
reglas o ampliar el monitor. La búsqueda dirigida no prueba ausencia de otros
actos de 2026. El monitor existente permanece sin cambios y no aprueba normas.
El programa maestro sigue abierto; automatización de cinco horas conservada activa.


## Cierre de ciclo · integridad de todas las respuestas Directions · 18-11-2026

### Diagnóstico y causa real

Preflight GitHub fresco: Web main cbbc659157f65d56cab2ce3b2829f1fc7c38cbf5,
producción da3efef0a4ef580804857bd537c0f4419f52b362 /
dpl_3x4t7Q3ixeiCpaCCMtuHwyzzFELv; API main/producción
27e161c7eb325d2524ff02577073ad457908affc /
dpl_2qZB8kkDGAFqQQr8Yw1hoA6Q2ogt. Se leyeron ambos informes de esa main,
se preservaron los avances y se trabajó en árboles aislados. No hubo AGENTS.md
aplicable. El preflight HTTP no reprodujo Failed to fetch: búsquedas, formatos
directos, proxy, salud y validaciones respondieron correctamente.

La auditoría de index.js encontró una omisión verificable: sólo alternativas
rechazaba un resultado exitoso sin geometría/estimaciones válidas. En una ruta
normal, summary.distance/duration ausentes se sustituían por cero y una
correspondencia way_points defectuosa se descartaba, conservando los puntos
solicitados como si formasen un cálculo completo. También un tipo inesperado de
instrucción podía llegar a la interfaz. Es un defecto de contrato reproducido con
respuestas de proveedor controladas, no un incidente de datos ORS reales observado
en producción. No se presenta esa reproducción como navegación real.

La documentación primaria de Directions JSON confirma summary, geometry e índices
way_points cuando se solicita geometría (valor predeterminado de esta petición):
https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types

### Implementación

lib/directions-integrity.js inspecciona todas las rutas: estimaciones numéricas
finitas no negativas; polyline decodificable dentro de los límites existentes;
exactamente un índice por punto, enteros dentro del trazado, no decrecientes y con
origen/fin correspondientes a sus extremos. Repetir un índice es válido: no se
colapsan visitas repetidas. Si hay segmentos/pasos, comprueba su estructura,
tipos de texto y estimaciones opcionales. Es validación estructural de la
respuesta, no corroboración geográfica, física o legal del proveedor.

La API devuelve un mensaje humano específico según el dato defectuoso,
502/ORS_INVALID_ROUTE y un reason seguro ante errores de JSON,
contenedor, estimaciones, geometría, índices o instrucciones. No incluye puntos,
credenciales ni respuesta cruda en el registro; sólo motivo y cantidad de puntos.
Una lista de rutas vacía sigue siendo 422/ORS_NO_ROUTE y el timeout del cuerpo
sigue siendo 504/ORS_TIMEOUT. No hay reintento automático, relajación de medidas,
exclusiones o permisos. Se conserva el cero numérico explícito del proveedor y
se deja de fabricarlo cuando falta el dato. Las alternativas usan la misma
inspección y omiten opciones incompletas/repetidas; se conservan sus conteos.
Los índices de maniobras fuera de los vértices se omiten de la salida cartográfica.

Los fixtures correctos ahora incluyen geometrías sintéticas codificadas y mapeos
reales en vez de cadenas inválidas o trazado ausente. Web CI se fija al SHA
inmutable de la API candidata y añade un caso Auth → navegador → proxy → API
real local que recibe una respuesta ORS sintética incompleta. No cambia código
de interfaz, dependencias, proveedor, variables, secretos, SQL o permisos.

Archivos API: index.js, lib/directions-integrity.js, test/routing.test.js.
Web: .github/workflows/checks.yml, test/integration/ors-fixture.mjs y
test/integration/authenticated.e2e.mjs; cierre en estos dos informes.

### Pruebas, resultados y límites

API local: build, 80 pruebas y auditoría npm --omit=dev (cero vulnerabilidades),
aprobados. [CI 44346217186](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44346217186),
job 134949196941: 80 pruebas, build, migraciones/SQL/RLS de rutas, compartición y
avance en PostgreSQL desechable y auditoría aprobados. Casos de respuestas
incompletas, tipos incorrectos, instrucciones inválidas, índices ausentes/fuera
de orden/fuera de rango, JSON roto, ausencia de ruta y timeout. Comprueba un único
llamado, conservación de HGV/preferencias, 48 entregas repetidas/50 posiciones
y ceros explícitos, sin convertir respuestas incompletas en cálculos válidos.

Web local: build, typecheck, 184 pruebas unitarias/componentes y auditoría con
cero vulnerabilidades. [CI 44346274933](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44346274933)
con resultados finales registrados antes de publicar: 184 pruebas, 38 casos de
navegador y diez flujos Auth/REST/PostgreSQL locales reales. Jobs 134949633331
(Web) y 134949632786 (Auth). El caso nuevo, en 390/1365 px, comprueba error
502 específico, ausencia de detalle calculado/botón de guardar, permanencia de
origen/parada/destino confirmados, altura y evitar peajes, una sola petición y
cero registros creados. La clave/usuarios son desechables locales; el proveedor
ORS y geometría siguen siendo fixtures. No consumen cuota externa de ruteo.

La primera ejecución Auth de la prueba nueva (44344331684) pasó nueve flujos y
falló antes del cálculo por un selector que no incluía el signo ＋ de Agregar parada.
Se corrigió sólo el selector y se repitió la verificación sobre el candidato final;
no se publicó código mientras esa comprobación estaba pendiente.

Un intento de iniciar Chromium local volvió a fallar con Target closed; no se
reporta aprobado. CI sí ejecuta navegador. No se ejecutan sesión privada de
producción, cálculo ORS autenticado real ni Android físico. La compatibilidad
funcional completa se verifica con la pila local real de CI y se distingue del
smoke público. Supabase alojado sólo leído: 3 rutas, 10 paradas, 1 vehículo,
cero eventos de avance y cero enlaces, sin escrituras ni cuentas de prueba.
Los avisos previos SECDEF/contraseñas filtradas continúan sin cambios.

Smoke después de verificar el alias API nuevo: salud por proxy, coordenadas,
Plus Code completo 75XMRW22+22, compuesto RW22+22 Chihuahua, Express y Puebla:
200; ocho sugerencias Express. Validación 0/2/48 intermedias: 200, 49: 400;
plan sin sesión: 401. Ningún cálculo autenticado real se infiere de estos probes.
Ambos proyectos Vercel sin filas error/fatal agregadas en los 30 minutos
consultados. El reporte de fuentes conserva 2026-11-18T07:49:38.924Z, no obsoleto;
Juárez HTTP_403 y CDMX NETWORK_OR_TIMEOUT en ese reporte anterior, distintos de
los HTTP 503 del intento documental directo de este ciclo. Verificación puntual.

### Publicación y recuperación

API PR [#28](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/28),
candidato final 772a6b2ba6bc56f79c3ac3adfbbfe149e9679e07
(anterior 942d25d992af87f8d8d85bd1785764fc49d1aad3 conservado), merge **1d1e916a44a115f2c0101704c908d77189b447b1**,
deployment **dpl_3Din4YGhKtTrS5Qr9NKKJwUHXEGa** READY/production; alias
https://route-planner-api.vercel.app/ comprobado al mismo SHA.
Rollback API conservado **dpl_2qZB8kkDGAFqQQr8Yw1hoA6Q2ogt** /27e161c.
No se ejecutó rollback ni hay SQL que revertir; volver al anterior restituiría
la omisión de validación, sin perder datos de usuarios.

Web PR [#36](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/36),
candidato final 2209a3553827de818657c9ad12d4173e8ae9283a
(selector corregido en 035da706b65f7d71513e578653d6a453266a7753)
(anterior 1bfd2c54618ba901c2f77f846b6894b98943619a conservado), merge **e3c9b045c6e622cd1c8b0d4147bcb75ae6807843**.
Sólo pruebas/CI; no necesita redeploy funcional. Producción Web permanece
**da3efef0a4ef580804857bd537c0f4419f52b362**, deployment
**dpl_3x4t7Q3ixeiCpaCCMtuHwyzzFELv**, READY; alias
https://route-planner-web-sand.vercel.app/ al mismo SHA. Se comprueba que el diff
desde ese código de producción sólo contiene informes, pruebas y workflow,
sin funcionalidad pendiente de publicar ni volver a Preview. La interfaz
existente muestra el error nuevo de API y conserva sus puntos según el flujo CI.

Gestión y demás proyectos intactos; ningún servicio de pago activado. Se conservan
ramas/candidatos e historial. El cierre posterior [skip ci] sólo cambia informes.

### Normativa y próxima prioridad

No se cambia ningún horario, norma, geometría o autorización en el motor. Siguen
15 municipios parciales y cero con validación legal completa. Índices/estimaciones
estructuralmente correctos no acreditan una ruta segura/legal. Google conserva sus
límites y recalcula sin recibir HGV ni garantizar trazado exacto.

Investigación oficial de continuación: dos documentos de la Autoridad del Centro
Histórico de CDMX muestran referencias distintas de maniobras para Perímetro A.
La lectura indexada de Maniobras_info.pdf indica 22:00–07:00 todos los días; la
guía identificada como enero de 2024 describe 20:00–10:00 y 20:00–07:00 en vías
principales, por categorías y excepciones. No se resuelve la diferencia eligiendo
el horario más permisivo. El documento breve no ofrece en esa lectura una fecha
que permita ordenar su vigencia. Ambas descargas directas de este intento dieron
HTTP 503; no se inventan huellas, revisión visual o comprobación actual de bytes.
Fuentes:
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Maniobras_info.pdf
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Que_Si_y_Que_NoCH_2024.pdf
No se encontró una fuente cartográfica continuamente actualizada que permita
certificar legalmente las calles de todos los municipios. La búsqueda dirigida
no acredita inexistencia de una fuente ni ausencia de actos posteriores.

Próxima P0: comprobar con sesión alojada y proveedor real cuando existan medios
apropiados, sin sustituirlo por fixtures. Continuar P1 de navegación/pendientes
sobre el trazado: distinguir marcas manuales y enfocar una entrega desde la
lista sin recalcular ni omitir puntos; corroboración física Android separada.
En normativa: recuperar documentos
CDMX y contrastar la Gaceta del 15-12-2021 y actos posteriores antes de cambiar
reglas; retomar publicación y reformas de Puebla, permisos y geometrías. El
programa maestro sigue incompleto y se conserva la continuación existente activa.


## Cierre de ciclo · localizar entregas en el mapa y fuente histórica CDMX · 18-11-2026

### Diagnóstico y alcance

Se consultaron GitHub, producción y los dos informes de main antes de editar.
Web main 5f7017e171625c28f5ba8e613f234d16d3ca98d1; producción
da3efef0a4ef580804857bd537c0f4419f52b362 / dpl_3x4t7Q3ixeiCpaCCMtuHwyzzFELv.
API main ae4d89ecbc93ec85d6cc37f7ef264451363946fd; producción
1d1e916a44a115f2c0101704c908d77189b447b1 / dpl_3Din4YGhKtTrS5Qr9NKKJwUHXEGa.
La diferencia API era sólo el reporte automático de fuentes y se conservó.
Árboles aislados; no se encontró AGENTS.md aplicable. No se reprodujo un P0
de conexión en las comprobaciones públicas. No se sustituyen fallos por ceros
ni se alteran las comprobaciones de integridad Directions del ciclo anterior.

La vista de trazado guardado ya tenía lista de avance, pero sus marcadores
no distinguían las marcas manuales y no permitían localizar una visita concreta.
Dos entregas con la misma dirección requerían seguir siendo ocurrencias distintas.
La referencia CDMX citaba Gaceta 15-12-2021 sin ofrecer su publicación original
como documento relacionado dentro del seguimiento técnico existente.

### Implementación Web

Mis rutas → Entregas → Revisar navegación → Ver trazado guardado distingue
marcadores pendientes y completados manualmente. Conserva O/D, números y todas
las ocurrencias, incluso coordenadas repetidas. Cada fila tiene Ubicar en mapa;
Ubicar primera pendiente enfoca explícitamente la primera sin marca. Ver recorrido
completo restaura los límites del trazado y cierra el cuadro del punto elegido.
Con todo completado sigue siendo posible consultar cada punto y el recorrido.

La selección conserva la identidad de la ocurrencia, abre su cuadro y realza
su marcador; desplaza la lista hasta el mapa y anuncia el punto mediante status.
Reutiliza los puntos y geometría ya cargados: no consulta otra vez el recorrido,
no consume ruteo, no escribe avance y no cambia resultados, orden o enlaces Google.
La protección frente a cambios de revisión/snapshot/puntos/perfil/preferencias
sigue cerrando el mapa y la navegación revisada antiguos. El mapa de búsqueda y
planificación mantiene su comportamiento cuando no recibe estas opciones.

Archivos Web: components/RouteMap.tsx, components/SavedRouteTraceReview.tsx,
components/SavedTracePointList.tsx, app/globals.css, test/saved-trace-points.test.mjs
y test/integration/authenticated.e2e.mjs. next-env.d.ts generado por build
se excluye de la publicación. Sin dependencias, variables, secretos o SQL nuevos.

### Fuente histórica CDMX y comprobaciones reales

Se localizó en el buscador la publicación oficial de Consejería:
https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/0830deebda0a6b9e7fb44d6d2cef2ab0.pdf
Es la Gaceta histórica del 15-12-2021 citada por la guía de enero de 2024.
La lectura indexada no sustituye recuperación y revisión íntegra del PDF.
Los intentos directos de este ciclo a esa Gaceta, Maniobras_info.pdf, la guía 2024
y regulacionPdf/1679 devolvieron HTTP 503. No se obtuvieron bytes, hashes nuevos,
capturas de páginas ni comprobación de vigencia. El aviso breve y la guía
describen horarios distintos; no se elige uno ni se normalizan umbrales ambiguos
de la lectura indexada para convertirlos en reglas.

La ficha 09015 ofrece el enlace histórico y explica su estado pendiente. El
monitor lo comprueba por separado mediante relatedUrls; no se cambia su frecuencia,
límites de descarga, política de red ni reglas. El push del archivo de referencias
activó el workflow ya existente. La ejecución real
[44399465966](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44399465966)
terminó correctamente y generó checkedAt 2026-11-18T21:15:11.351Z. La Gaceta quedó
unavailable / NETWORK_OR_TIMEOUT, sin sha256 ni lastSuccessAt. Ese resultado es
distinto del HTTP 503 del intento directo. El endpoint público sirvió el mismo
reporte, stale=false: un reporte reciente puede describir una fuente inaccesible.
No representa revisión legal aprobada ni evidencia de que el documento no exista.

Permanecen intactas las cinco reglas previas, sus horarios, citas y tramos; no hay
geometría legal del perímetro A, routingEnforced sigue false. La jurisdicción es
sólo ese perímetro, no toda la alcaldía ni CDMX. Se mantienen 15 municipios con
referencias parciales y cero con validación completa. Ningún catálogo, PDF localizado,
hash o consulta técnica acredita por sí solo circulación segura o legal.

Archivos API: data/mx/national-references.json, test/source-monitor.test.js y
docs/CDMX-GACETA-2021-SOURCE.md. Los dos casos nuevos usan documentos simulados
para probar independencia del seguimiento y conservación del estado sin revisión;
no se presentan sus hashes sintéticos como descargas reales.

### Pruebas y límites

Web local: typecheck, build, 187 pruebas y auditoría de producción sin vulnerabilidades.
Tres casos nuevos de componente comprueban 50 ocurrencias, direcciones repetidas,
marcas manuales, primera pendiente y revisión de todo-completado.
La primera ejecución Auth (44398099560) pasó 9/10 flujos y falló al contar cuadros
inmediatamente tras cerrarlos: Leaflet aún conservaba nodos durante su retirada.
Se corrigió sólo la espera de la prueba a estado detached, sin sleeps ni cambio
del producto. El candidato final es 96aafd81560e158e2c9275a4fedc220f433975ed.
[CI final 44399840169](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44399840169):
job 135139539718 pasó 187 pruebas, build/typecheck, 38 casos de navegador y
auditoría sin vulnerabilidades; job 135139540318 pasó diez flujos autenticados.
El caso de trazado en 390/1365 px comprobó tres marcadores completados y 46
pendientes, selección independiente de las visitas repetidas 1/2, cuadro correcto,
marcador dentro del mapa, retorno al recorrido completo con 50 marcadores,
una única consulta de geometría, enlaces y resultado guardado sin cambios, y
cierre del mapa/enlaces ante cambio de revisión. La integración usa la API
fijada en 772a6b2 (código funcional Directions idéntico a 1d1e916); el cambio de
fuente CDMX posterior se verifica por pruebas API y comprobaciones públicas.

API local: build, 82 pruebas y auditoría de producción con cero vulnerabilidades.
[CI 44399218591](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44399218591),
job 135137330265: 82 pruebas, build, migraciones/SQL/RLS de rutas, compartición y
avance en PostgreSQL desechable y auditoría, aprobados. Sin cambios de esquema
ni migraciones en producción. Supabase alojado sólo leído: 3 rutas, 10 paradas,
1 vehículo, cero eventos de avance y cero enlaces; no se crean cuentas de prueba.
Los avisos previos de seguridad no se modificaron ni se declaran resueltos.

Smoke público: salud/proxy, coordenadas, Plus Code completo 75XMRW22+22,
compuesto RW22+22 Chihuahua y búsqueda Bodega Aurrera Express: HTTP 200;
uno por formato directo y ocho resultados Express. Validación 0/2/48 intermedias
aceptada y 49 rechazada con 400, conforme a 50 posiciones ORS. Plan sin sesión:
401. La ficha 09015 expone el nuevo enlace pendiente y conserva sus cinco reglas.
No son cálculos reales de dos/múltiples destinos autenticados. El cálculo,
aislamiento de cuentas y flujo privado se prueban en CI con Auth/REST/PostgreSQL
reales locales y ORS/trazado sintéticos; no equivalen a Android físico ni navegación
real con Google ni prueba privada de producción con ORS. Esas verificaciones
siguen pendientes. El intento Chromium local devolvió Executable does not exist
para chromium_headless_shell-1234; no se presenta como navegador local aprobado.
Tras publicar Web se repitieron todos esos probes por el alias nuevo con los
mismos resultados. La interfaz pública recargada confirmó una coordenada como
origen y un Plus Code completo como destino; ambos quedaron confirmados con
marcadores O/D y mapa visible. También se verificó visualmente la ficha histórica
Cuauhtémoc publicada. Esto comprueba superficies públicas; el enfoque de visitas
guardadas con sesión se verificó en CI, no en una cuenta alojada. Se conservó
evidencia visual de ambas superficies. Logs Vercel de los dos proyectos, error/fatal
por requestPath en los últimos 30 minutos: sin filas. Es una consulta puntual,
no una garantía continua de ausencia de errores.

### Publicación, historial y rollback

API PR [#29](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/29),
candidato 94b020a0ff458a73ea9215b09a5965a2f30ddf60, merge
46b5ec160d777399bb8b3fc36ac1a778ef01d133. Deployment
dpl_3ddjor55pNbutkjyzDtpfNq66DCv READY/production; alias
https://route-planner-api.vercel.app/ verificado al mismo SHA. El bot dejó después main a60105162429e549868e94bb3a82b8cd2e54b9ac,
sólo data/mx/source-status.json; se preserva sin desplegar por cada sondeo.
Rollback API: dpl_3Din4YGhKtTrS5Qr9NKKJwUHXEGa /1d1e916.
Web PR [#37](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/37),
candidato inicial 1ca6ce27ad044eb335df4b48a84979179a060edc y final
96aafd81560e158e2c9275a4fedc220f433975ed (sólo espera de prueba corregida),
merge 341372febb9ed315c05d0e6ea071d3e315f52d35. Deployment
dpl_Dm7TAQzPrVv6hT8Zb2DEYvAyT2Q1 READY/production; alias
https://route-planner-web-sand.vercel.app/ verificado al mismo SHA 341372febb9ed315c05d0e6ea071d3e315f52d35.
Rollback Web conservado: dpl_3x4t7Q3ixeiCpaCCMtuHwyzzFELv /da3efef.

Los candidatos/ramas e historial quedan conservados. Recuperar el despliegue previo
no requiere borrar ni revertir datos; no se ejecutó rollback. Gestión y los demás
proyectos no se tocaron y no se activaron servicios de pago. El cierre posterior
[skip ci] sólo actualiza estos informes, sin funcionalidad pendiente de publicar.

### Estado y continuación

Completado y verificado: enfoque de entregas, marcadores manuales y
seguimiento independiente de la fuente histórica. Parcial: normativa municipal y
corroboración CDMX. Bloqueado en este intento: descarga íntegra de cuatro fuentes
CDMX; no se considera un bloqueo global del programa. Pendiente: prueba privada
alojada/ORS real, Android físico y cobertura legal con geometrías y permisos.

Próxima P0: comprobar sesión y cálculo reales alojados cuando existan medios de
prueba apropiados. Próxima P1: mejorar la revisión del acceso de descarga de cada
entrega desde la lista conservando coordenadas verificadas, identidad de visita,
avance e historial; no alterar una ruta ya guardada sin revisión explícita.
En normativa: recuperar Gaceta, guía y aviso breve, contrastar artículos/tablas,
reformas posteriores, excepciones, ámbito y permisos antes de cambiar reglas;
continuar publicación/reformas y geometrías verificables de Puebla. Google no
recibe HGV y los puntos guía no bloquean su trazado. El programa maestro sigue
incompleto. La continuación existente se comprobó habilitada y se mantiene activa.


## Cierre de ciclo · revisión del acceso de una entrega · 18-11-2026

### Diagnóstico y cambio implementado

Preflight fresco: Web main 0158d3fecc3adddf5ee19629bcf892ec4ee20a87,
producción 341372febb9ed315c05d0e6ea071d3e315f52d35 /
dpl_Dm7TAQzPrVv6hT8Zb2DEYvAyT2Q1. API main a60105162429e549868e94bb3a82b8cd2e54b9ac,
producción 46b5ec160d777399bb8b3fc36ac1a778ef01d133 /
dpl_3ddjor55pNbutkjyzDtpfNq66DCv. Se leyeron ambos informes de main y se
preservaron todos los avances, incluido el reporte del bot. Sin AGENTS.md aplicable.
No se reprodujo Failed to fetch en los probes públicos de esta sesión.

La confirmación sólo ofrecía un mapa externo; la visita enfocada en el trazado
guardado no ofrecía consultar su entorno. Se añade una revisión explícita del
acceso para ayudar a distinguir la sucursal y su entrada de descarga. No se
presenta el punto del negocio o una fotografía como entrada verificada.

LocationReviewLinks se reutiliza en la confirmación de ubicaciones y en el panel
de la ocurrencia elegida del trazado guardado. Ofrece Ver mapa / Ver punto en
Google Maps y Ver entorno en Street View. Los enlaces reciben únicamente las
coordenadas numéricas exactas del punto, sin buscar por nombre, redondearlas o
enviar el resto del recorrido. Se rechazan valores no numéricos/no finitos/fuera
de rango; cero y los extremos válidos se conservan. No se inventa una ubicación
predeterminada cuando el punto no es válido.

Los enlaces son anchors ordinarios externos con noopener/noreferrer. No hay SDK,
embed, prefetch, clave Google ni servicio de pago. Sólo al pulsar se abre Google.
El texto explica que Street View puede no tener cobertura y puede mostrar una
fotografía antigua o de un punto cercano; se debe corroborar la entrada y la
señalización actual. No acredita acceso o permiso para el camión. En confirmación
se mantiene Confirmar punto como acción separada. En Mis rutas → Entregas →
Revisar navegación → Ver trazado guardado → Ubicar en mapa, el panel muestra
identidad, dirección y coordenadas de la visita elegida, incluidas repeticiones.
Ver recorrido completo cierra ese panel. La retirada de una revisión obsoleta
también lo elimina. No escribe avance, corrige puntos, recalcula o cambia los
enlaces consecutivos de navegación. Para corregir un acceso hay que cargar la
ruta y revisar el punto antes de volver a calcular.

Documentación primaria consultada el 18-11-2026:
https://developers.google.com/maps/documentation/urls/get-started
Maps URLs no exige clave API; map_action=pano/viewpoint abre la imagen más cercana
si existe. Eso no garantiza correspondencia exacta, fecha actual o cobertura.
Se usa la sintaxis documentada y no servicios de metadatos/imagen facturables.

Archivos de implementación: lib/location-review.ts, components/LocationReviewLinks.tsx,
components/LocationInput.tsx, components/SavedRouteTraceReview.tsx, app/globals.css.
Pruebas: test/location-review.test.mjs, test/geolocation.e2e.mjs,
test/integration/authenticated.e2e.mjs. next-env.d.ts generado por build se excluye.
Sin cambios API, esquema, dependencias, variables o secretos.

### Verificación

Web local: build, typecheck, 191 pruebas y auditoría de producción con cero
vulnerabilidades. Cuatro casos nuevos comprueban precisión, cero/extremos,
entradas inválidas, enlaces externos y ausencia de embed/confirmación automática.
En la primera ejecución local, dos casos de render fallaron por el interop del
import estático TSX del arnés Node. Se corrigió a import dinámico como los tests
existentes; la repetición final pasó 191/191. Sin cambio de producto por ese fallo.
[CI 44440935320](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44440935320):
job 135281302122 pasó typecheck/build, 191 pruebas, 38 casos de navegador y
auditoría sin vulnerabilidades. Job 135281302416 pasó diez flujos autenticados
con Auth/REST/PostgreSQL locales reales y la API fijada en 772a6b2. El caso de
trazado en 390/1365 px comprobó el panel Entrega 2, dos URLs a sus coordenadas
completas, target/rel, aviso de cobertura, cierre al restaurar el recorrido y
permanencia de los 50 puntos, geometría, enlaces e historial. El caso móvil de
Aurrera comprobó Street View antes de confirmar sin marcar aún el punto.

API main sin cambios de código, comprobada de nuevo localmente: build/sintaxis, 82 pruebas y auditoría npm de producción con cero vulnerabilidades.
No se presenta el CI de la liberación anterior como nueva ejecución. Supabase
alojado sólo leído: 3 rutas, 10 paradas, 1 vehículo, cero eventos de avance y cero
enlaces. Sin cuentas ni datos de prueba nuevos en producción; avisos previos de
seguridad sin cambios. El intento de Chromium local no pudo arrancar porque falta
chromium_headless_shell-1234; CI ejecuta sus propios navegadores.

Probes: salud/proxy, coordenada 28.6353,-106.0889, Plus Code completo
75XMRW22+22 y compuesto RW22+22 Chihuahua: 200, una sugerencia por formato;
Bodega Aurrera Express cerca de Chihuahua: 200 y ocho resultados. Validación
0/2/48 intermedias: 200; 49: 400. Plan sin sesión: 401. Reporte de fuentes
observado 2026-11-18T21:15:11.351Z, stale=false. Un reporte reciente no aprueba
los documentos inaccesibles. CORS directo: origen Web autorizado devuelve 204 con allow-origin; el ajeno
example.invalid devuelve 404 sin allow-origin. Estos probes no son cálculos
autenticados reales.
Tras publicar se repitieron por el nuevo alias las cuatro búsquedas con los
mismos resultados. La interfaz pública mostró ambos enlaces y su aviso en la
confirmación de la coordenada. Al pulsar Street View se abrió Google en otra
pestaña: panorama de 1781 Av. Mirador, Chihuahua, captura Jun 2024, con posición
cercana a la solicitada. Al volver permanecía el punto pendiente; sólo Confirmar
punto lo marcó y creó el marcador D. Capturas conservadas de la interfaz y del
panorama. Se prueba esa apertura pública real, no una entrada de descarga o
cobertura general. Logs de ambos proyectos Vercel, error/fatal agrupados por
requestPath en 30 minutos: sin filas en la consulta puntual.

Las pruebas privadas de sesión/rutas usan Auth, REST y PostgreSQL reales locales,
con geometría y ORS sintéticos. No se convierten en prueba Android físico, cálculo
alojado real o garantía de navegación en Google. La cobertura y antigüedad de las
imágenes no se verifican por construir un enlace. La prueba pública de Google no sustituye esas comprobaciones pendientes.

### Investigación normativa y límites reales

Se encontró la publicación oficial del decreto estatal de Puebla de 21/abr/2026:
https://periodicooficial.puebla.gob.mx/media/k2/attachments/T_EV_21042026.pdf
El buscador devolvió el PDF como documento paginado de 20 páginas; se pudo leer
el sumario y la relación de artículos modificados. Es reforma del Reglamento
de la Ley de Transporte del Estado, distinta de los lineamientos municipales
de maniobras. La página OJP también identifica publicación base 02/jun/2022 y
última reforma 21/abr/2026. Esta localización mejora la cadena de procedencia,
pero no acredita consolidación completa ni todas las reformas posteriores.

Los intentos directos del 19-11-2026 01:59 UTC (18-11 en Chihuahua) al decreto,
consolidado OJP y Aviso Carga y Descarga 15122021 de CDMX devolvieron HTTP 503;
la consulta posterior del final del decreto mediante el buscador devolvió 502.
No se obtuvieron bytes o hashes nuevos ni se completó revisión visual/íntegra o
de transitorios. No se inventan resultados de descarga a partir del texto indexado.
Fuentes de continuación:
https://ojp.puebla.gob.mx/legislaciondelestado?catid=242&start=20
https://ojp.puebla.gob.mx/media/k2/attachments/Reglamento_de_la_Ley_de_Transporte_del_Estado_de_Puebla_T5_11112024_1.pdf
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Aviso%20Carga%20y%20Descarga%2015122021.pdf
La última referencia relaciona publicaciones históricas 20/sep/2019, 18/dic/2019
y 15/dic/2021; tampoco se usa para resolver horarios contradictorios sin cotejo.
No se altera el catálogo normativo ni su monitor por estas pistas. Siguen 15
municipios parciales y cero con validación legal completa; no hay nueva geometría
o restricción aplicada al motor. El ámbito estatal no se confunde con el municipal.

### Publicación y recuperación

Web PR [#38](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/38),
candidato 8f721841e1023d1a9bbc75abb04a6a5ac1460257. Merge **6fc43e3f3bbf0fffd5019625c1a8c3ee0baccadb**, deployment
**dpl_CFySMhiKGLJ6dPEh69XoGpyKSzUP**, READY/production. Alias
https://route-planner-web-sand.vercel.app/ comprobado al mismo SHA.
Los ocho archivos del candidato se contrastaron byte a byte con lo probado localmente.
Rollback Web conservado: dpl_Dm7TAQzPrVv6hT8Zb2DEYvAyT2Q1 /341372f.
API conserva 46b5ec160d777399bb8b3fc36ac1a778ef01d133,
deployment dpl_3ddjor55pNbutkjyzDtpfNq66DCv READY; alias verificado inicialmente
https://route-planner-api.vercel.app/. No requiere nuevo deploy. Su main a601051
sólo añade reporte técnico respecto a producción, sin funcionalidad sin publicar.

No se ejecutó rollback, borrado de datos o migración; recuperar el deployment
Web anterior mantiene el historial y los datos. Ramas y candidatos conservados.
Gestión y otros proyectos no se tocaron; ningún servicio de pago activado. El
cierre [skip ci] sólo actualiza estos informes y no necesita redeploy funcional.

### Punto de reanudación

Completado: revisión externa explícita del punto seleccionado, límites de imágenes
y protección de identidad/precisión sin editar navegación o avance. Parcial:
corroboración documental mexicana. Bloqueados en este intento: recuperación íntegra
de fuentes citadas por 503/502; no es un bloqueo global del programa. Pendientes:
sesión alojada/ORS real y Android físico, corrección revisada de un acceso y
cadena normativa/geometrías/permisos completos. Google no recibe HGV y los puntos
guía no fijan su trazado.

Próxima P0: prueba alojada con proveedor real cuando existan medios de prueba
apropiados. Próxima P1: mantener identidad y avance al revisar/corregir el acceso
de descarga de una entrega cargada, exigiendo recalcular/revisar antes de navegar.
Normativa: recuperar decreto y consolidado estatal por separado de los lineamientos
municipales de Puebla, verificar transitorios/reformas/ámbito; retomar las tres
Gacetas históricas CDMX y sus actos posteriores antes de cambiar horarios. El
programa completo sigue abierto y se conserva la continuación existente activa.


## Cierre de ciclo · integridad al cargar accesos corregidos · 22-11-2026

### Diagnóstico y preservación de avances

Reconciliación GitHub/producción fresca del 22-11: Web main
56cef09c3a895a6126ac586a8b3f54b4a2a75be5, producción
6fc43e3f3bbf0fffd5019625c1a8c3ee0baccadb /dpl_CFySMhiKGLJ6dPEh69XoGpyKSzUP;
API main faf1a9d69cd85d1bf295e956047e75caa7309ca8, producción
46b5ec160d777399bb8b3fc36ac1a778ef01d133 /dpl_3ddjor55pNbutkjyzDtpfNq66DCv.
Ambos informes se leyeron desde main. API avanzó sólo data/mx/source-status.json
respecto a a601051; el reporte del bot se preservó. Sin AGENTS.md aplicable.
Se retomaron PR #39 y API #30 pendientes, comprobando sus resultados reales.

Defecto P0 reproducible: restoreSavedRoute obtenía las paradas actuales y
restauraba route_metadata.result sin contrastar sus puntos. Una corrección de
acceso, etiqueta, orden o lista podía mostrar formularios actuales junto a un
trazado, métricas y enlaces antiguos. Es un defecto observado en código y
reproducido con datos controlados; no se afirma un incidente real de un usuario.

### Implementación P0 y pruebas

readSavedRoutePoints lee primero todos los puntos sin alterar el planificador;
rechaza ubicación vacía, orden incompleto/duplicado/fuera de orden, lista ausente
o mayor que 48 intermedias. Conserva las 50 ocurrencias máximas, duplicados y
precisión numérica. Se aceptan secuencias históricas contiguas desde 0 o 1.
Direcciones antiguas sin coordenadas válidas permanecen editables/sin confirmar.
No se convierten strings numéricos en coordenadas verificadas.

savedCalculationMatchesPoints contrasta origen, destino y cada ocurrencia por
cantidad, orden, coordenadas exactas, etiqueta y tipo. Si coinciden conserva la
restauración previa; si difieren carga todos los puntos actuales pero retira el
cálculo, métricas, guardado y navegación hasta un cálculo nuevo exitoso. Muestra
un aviso específico de revisión/recalcular. No llama al proveedor por cargar ni
escribe el registro original, avance o historial. Un fallo de lectura deja el
borrador anterior intacto. Se mantienen las barreras de sesión y respuestas tardías.
Esto comprueba identidad de puntos, no actualidad/validez geométrica o legal.

Archivos: app/page.tsx, lib/saved-route-restore.ts,
test/saved-route-restore.test.mjs, test/session-isolation.test.mjs y
test/integration/authenticated.e2e.mjs. Sin API/SQL/dependencias/secretos nuevos.
next-env.d.ts generado por build se excluye de la publicación.

Verificación del candidato 9a2efcd24f3de14f407525eb30f25c607507eafa:
build, typecheck, 197 pruebas y auditoría de producción sin vulnerabilidades.
Cuatro casos de parser/comparación y dos de componente cubren acceso, precisión,
repeticiones, orden y recuperación al recalcular. CI
[44477198672](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/44477198672),
jobs 135400504466 y 135400504710, finalizó el 19-11 y se verificó al publicar el
22-11: 197 pruebas, 38 casos de navegador y once flujos autenticados locales.
El nuevo caso en 390/1365 px guarda 48 entregas vía REST real local, corrige sólo
la ocurrencia 2 de una dirección repetida, carga sus 48 entradas sin el resultado
viejo, calcula explícitamente una vez por la API local y comprueba coordenadas,
orden, preferencias y permanencia del cálculo original e historial. Auth/REST/SQL
son reales locales; el proveedor y geometría son sintéticos. No se equipara a ORS
real alojado, sesión privada de producción o Android físico; siguen pendientes.

### Publicaciones estables y recuperación

Web PR [#39](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/39),
merge **0f9722f83824e24dd6fd23da9f98e56fa7a14ce4**, deployment
**dpl_GPTZkhubmaP8esvp6khKLr9a1MiU**, READY/production; alias
https://route-planner-web-sand.vercel.app/ comprobado al mismo SHA.
Rollback conservado: **dpl_CFySMhiKGLJ6dPEh69XoGpyKSzUP** /6fc43e3.

API PR [#30](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/30)
añade overdue al agregado y cada fuente al superar el intervalo previsto de
seis horas; stale conserva dieciocho horas. Se usa reloj servidor; una fuente
antigua no queda oculta por un agregado reciente y un intento fallido reciente
puede estar a tiempo pero no disponible. Datos ausentes/incorrectos/futuros se
consideran pendientes. No se infiere causa del retraso ni vigencia. No cambian
reportes, hashes, disponibilidad, última descarga, normas, frecuencia o TTL.
Archivos API: lib/source-monitor.js y test/source-monitor.test.js.

API CI [44477838300](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/44477838300),
job 135402581022: 84 pruebas, build, migraciones/SQL/RLS/compartición/avance
desechables y auditoría aprobados el 19-11. Build, 84 pruebas y auditoría cero
vulnerabilidades se repitieron localmente el 22-11. Candidato
3024cbd9880e21ad6d41f3b2c0dbcac06dad9913; merge
**6cb81f3d78c4b2c9278d9441e1e66a96e31d6d42**, deployment
**dpl_DJMs3PfpE2EQRmfswdaJQb4xeJ1k**, READY/production; alias
https://route-planner-api.vercel.app/ al mismo SHA.
Rollback **dpl_3ddjor55pNbutkjyzDtpfNq66DCv** /46b5ec1.
El merge conservó el reporte faf1a9d de main; no se reemplazó por la copia anterior.

### Comprobaciones públicas y estado normativo

Después de publicar: salud/proxy, coordenadas 28.6353,-106.0889, Plus Code
completo 75XMRW22+22 y compuesto RW22+22 Chihuahua: 200/una sugerencia;
Aurrera Express con foco Chihuahua: 200/ocho. Validación 0/2/48 intermedias: 200;
49: 400; plan sin sesión: 401. No son cálculos autenticados reales. Supabase
alojado sólo leído: 3 rutas, 10 paradas, 1 vehículo, cero eventos y cero enlaces;
sin cuentas de prueba ni escrituras. Gestión y otros proyectos no se tocaron.
Sin servicios de pago, borrados o migraciones. Historial y ramas conservados.

Reporte público actual: checkedAt **2026-11-22T19:54:36.677Z**, stale=false,
overdue=false en la consulta. Se distingue de la observación del 19-11, cuando
se veía 2026-11-18T21:15:11.351Z y no se observó ejecución posterior entre los
últimos runs. La actualización posterior existe; no se afirma un scheduler roto
ni que esta mejora lo reparase. GitHub documenta retrasos/omisiones posibles:
https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
Es una posibilidad general, no la causa demostrada de este caso.

La aplicación aún no recibe ni verifica toda la normativa nacional. Siguen 15
municipios parciales y cero completos. Puebla continúa con cambio técnico,
Juárez y CDMX con comprobaciones no disponibles en el reporte; ninguno de esos
estados acredita una reforma, vigencia o ruta autorizada. No se agregan geometrías,
horarios ni permisos. Google no recibe HGV ni conserva obligatoriamente el trazado.

### Continuación concreta

P0 completado y publicado: retirada de cálculos que no corresponden a los puntos
cargados. API de intervalos publicada; interfaz de alertas en PR #40, candidato
fd30a64a802898101930e69947fe9887c39a73a7, con 199 pruebas/build/typecheck y
auditoría local aprobados, pendiente de CI de navegador/Auth antes de publicación.
La rama codex/source-interval-warning-20261122 conserva ese avance recuperable.
El programa maestro sigue abierto. Próximos: terminar esa verificación/publicación,
corroboración de acceso en Android y sesión/ORS reales con medios de prueba
apropiados; revisión íntegra de fuentes Puebla/CDMX, sus reformas y geometrías.

## Cierre de ciclo · aviso de comprobación fuera del intervalo · 22-11-2026

Este cierre completa la continuación de PR #40 que figuraba pendiente en el
checkpoint 05c3cef. La reparación P0 de carga de puntos (PR #39) y la marca del
servidor (API PR #30) siguen publicadas; no se reemplazaron avances de main.

### Problema, causa y comportamiento publicado

El intervalo programado es seis horas, pero la marca stale existente esperaba
dieciocho. Un intento fuera del intervalo podía aparecer sin aviso de retraso
durante ese período. API 6cb81f3 agrega overdue calculado con reloj servidor,
por reporte y fuente; no altera la evidencia ni atribuye una causa al retraso.
Web ahora consume esa marca opcional y muestra el aviso antes de desplegar el
detalle. Una fuente seleccionada antigua no queda escondida por un agregado
reciente. El aviso stale tiene prioridad; cambios detectados y errores de
disponibilidad siguen mostrando alertas independientes. Las respuestas antiguas
sin overdue conservan su comportamiento. No hay nuevas consultas periódicas,
dependencias, credenciales, cuotas, cambios de caché ni modificaciones del cron.

Archivos de este cierre Web: components/OfficialSourceMonitor.tsx,
test/official-source-monitor.test.mjs y test/geolocation.e2e.mjs. Informes
actualizados: docs/ENGINEERING-STATUS.md y docs/MEXICO-COVERAGE.md.
Los cinco archivos de la reparación de restauración y los dos archivos API
constan en el cierre anterior. Los ocho archivos Web y dos API de ambos ciclos
se compararon byte a byte con sus commits publicados: coincidencia completa.
next-env.d.ts generado durante el build se excluyó de los cambios.

### Pruebas y alcance de la evidencia

- Web local del 22-11: build, typecheck, 199 pruebas y auditoría con cero
  vulnerabilidades aprobados. API local: build/sintaxis, 84 pruebas y auditoría
  con cero vulnerabilidades aprobados. No hubo cambios de dependencias.
- CI Web [45091715876](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/45091715876),
  jobs 137422529214 y 137422528980, aprobado el 22-11 en Chihuahua (23-11 UTC):
  199 pruebas, build/typecheck, 38 casos de navegador y 11 flujos autenticados.
  Incluye alerta con detalle cerrado en pantalla móvil y coexistencia de cambio
  detectado y retraso, con respuestas controladas. Incluye restauración a 390 y
  1365 px con 48 paradas, visitas repetidas y un único acceso corregido.
  Auth/REST/Postgres son reales locales desechables; ORS es sintético.
- La evidencia API del CI 44477838300/135402581022 corresponde al 19-11 y se
  releyó el 22-11: 84 pruebas, build y migraciones/RLS/compartición/avance SQL
  desechables aprobados. No se presenta ese run histórico como ejecutado hoy.
- El lanzamiento local de Chromium no se pudo ejecutar por faltar el binario
  chromium_headless_shell-1234. Los casos de navegador anteriores sí se ejecutaron
  en CI; no se afirma que el intento local haya pasado.
- Smoke público después del último despliegue: proxy/salud 200; coordenadas
  28.6353,-106.0889, Plus Code completo 75XMRW22+22 y compuesto RW22+22 Chihuahua,
  200 con una sugerencia cada uno. Validación de 0/2/48 intermedias 200; 49 devuelve
  400, límite real de 50 puntos totales del cálculo actual. Plan sin sesión 401.
  La validación de entradas no equivale a cálculo real con ORS.
- CORS directo: OPTIONS desde el origen Web autorizado 204 con cabecera de
  origen correcta; desde https://untrusted.example 404 sin autorización CORS.
- Bodega Aurrera Express con foco explícito Chihuahua devolvió 200/ocho
  sugerencias, pero la primera estaba a 655570 m y devolvió NO_NEARBY_MATCHES.
  Es respuesta de búsqueda con advertencia, no evidencia de sucursales cercanas
  precisas. Ampliar cobertura local/corroboración sigue siendo P1 pendiente.
- Navegador público del deployment final: consulta municipal y seguimiento de
  fuentes abiertos correctamente, 15 municipios parciales/cero completos,
  fechas y avisos de cambios/no disponibilidad visibles. Reporte vigente al
  comprobar: 2026-11-22T19:54:36.677Z, stale=false y overdue=false. Por ello el
  aviso positivo de retraso se comprobó con reloj/fixtures en pruebas, no se
  simula haberlo observado activado en producción. La captura muestra el estado
  público real. No se inició sesión privada ni se escribió en Supabase alojado.
- Vercel: consulta de logs de producción de ambos proyectos, error/fatal y
  ventana de 30 minutos, sin grupos devueltos. Es una observación limitada a esa
  ventana/filtros; no prueba ausencia histórica de todos los errores.

### Publicación y recuperación

| Componente | Commit publicado | Deployment de producción |
| --- | --- | --- |
| Web, PR #39 y #40 | b0d5d5497fabb17b0553d4943beabbc9a5a22a54 | dpl_DnEo1RhBgTeiTQwPvAurQ6Z1jHis |
| API, PR #30 | 6cb81f3d78c4b2c9278d9441e1e66a96e31d6d42 | dpl_DJMs3PfpE2EQRmfswdaJQb4xeJ1k |

Ambos READY/production; los alias se consultaron y apuntaban a esos mismos SHA:
https://route-planner-web-sand.vercel.app/ y https://route-planner-api.vercel.app/.
PR Web [#40](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/40),
candidato fd30a64a802898101930e69947fe9887c39a73a7. Se fusionó sobre el checkpoint
documental más reciente con sus fuentes de aplicación verificadas en CI.

Rollback del segundo ciclo Web: dpl_GPTZkhubmaP8esvp6khKLr9a1MiU /0f9722f,
conserva la reparación P0. Rollback de ambos cambios Web: dpl_CFySMhiKGLJ6dPEh69XoGpyKSzUP
/6fc43e3. API: dpl_3ddjor55pNbutkjyzDtpfNq66DCv /46b5ec1. Son puntos
conservados, no rollbacks ejecutados. Ramas, commits y PR permanecen recuperables.
El cierre documental posterior no cambia el código de esos deployments.

### Estado y próxima prioridad

Completados y publicados: P0 de restauración coherente y seguimiento técnico
fuera del intervalo. Se mantuvieron GPS, vehículos, OCR con corroboración,
coordenadas/Plus Codes, mapa y enlaces Google consecutivos; sin límite artificial
de ocho entregas. No se tocaron Gestión, otros proyectos, políticas RLS, esquemas,
datos alojados, servicios de pago o variables de entorno. Supabase sólo se leyó:
3 rutas, 10 paradas, 1 vehículo, cero eventos y cero enlaces compartidos.

Parcial: búsqueda local de establecimientos y cobertura normativa. Permanecen
15 municipios con referencias parciales y cero con validación legal completa;
no se añadieron horarios, permisos, calles ni geometrías jurídicas en este ciclo.
El reporte conserva Puebla con cambio técnico y Juárez/CDMX no disponibles, sin
inferir reformas ni vigencia. Google no recibe restricciones HGV ni fija una ruta
exacta para camiones. El monitor comprueba documentos, no habilita vías legalmente.

Pendiente de medios adecuados: cálculo autenticado con ORS alojado y navegación
en Android físico. Próxima implementación P1: mejorar evidencia/cobertura de
sucursales cercanas cuando el proveedor devuelve NO_NEARBY_MATCHES, manteniendo
corroboración explícita de acceso. En paralelo queda revisar íntegramente fuentes
Puebla/CDMX y geometrías, reformas y jurisdicciones antes de aplicar restricciones.
El programa maestro no está finalizado. La continuación periódica permanece activa.

## Ciclo · coincidencias lejanas y centro del selector · 22-11-2026

### Diagnóstico y cambio

Se reconciliaron main Web 4e78526/API 6cb81f3 y los alias de producción antes
de editar. Se leyeron ambos informes de main; sin avances externos que sustituir.
La consulta real Bodega Aurrera Express con foco Chihuahua devuelve ocho puntos
lejanos y NO_NEARBY_MATCHES. A pesar de la advertencia, LocationInput publicaba
esos puntos en el mapa principal y usaba suggestions[0] como semilla del selector
antes que el origen. Así podía abrir el mapa en Monterrey a más de 650 km del
área solicitada. Enter también podía elegir el primer candidato lejano.

Ahora las coincidencias con ese aviso quedan cerradas bajo «Ver coincidencias
lejanas (N)». No se envían al mapa compartido ni se eligen con Enter antes de
mostrarlas. Al abrir el selector se conserva el origen, salvo que se haya elegido
un punto explícitamente. Mostrar/ocultar sólo cambia estado local; no genera
consultas al proveedor. Cada búsqueda nueva reinicia la elección. Los resultados
de otra ciudad especificada explícitamente se muestran con su confirmación normal.
Se preservan coordenadas y confirmación deliberada de cualquier candidato lejano.
El aviso ofrece dirección completa, coordenadas, Plus Code y selección en mapa.

Archivos de código: components/LocationInput.tsx, test/location-input.test.mjs y
test/geolocation.e2e.mjs. Documentación: este informe y MEXICO-COVERAGE.md.
Sin cambios API, SQL, dependencias, cuotas, variables, cron o políticas RLS.
No se amplió un índice de tiendas ni se sustituyó Express por Aurrera regular.

### Pruebas

Local: build/typecheck, 201 pruebas y auditoría de producción cero vulnerabilidades.
El intento local de navegador no pasó: Chromium abortó antes de abrir por
socket() failed: Operation not permitted; no se presenta como fallo funcional
ni se debilitó el entorno para eludirlo. La verificación de navegador queda en CI.

CI final [45121562794](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/45121562794), jobs 137516276107/137516275780: build/typecheck, 201 pruebas, 39 casos de navegador y 11 flujos Auth aprobados; auditoría cero vulnerabilidades. Se leyeron los logs completos. Auth/REST/Postgres son reales locales desechables (API fijada por el workflow a 772a6b2); ORS y geometrías son sintéticos. No son cálculos autenticados alojados ni navegación Android real.

El primer CI 45121028639 pasó 201 pruebas y 11 flujos Auth, pero el caso nuevo
de navegador contó las opciones de todos los selectores de la página (tres),
en lugar de sólo las sugerencias del destino. Se corrigió el alcance del selector
en commit 3e7bd14; no se cambió el código de aplicación para ocultar ese fallo.
El resultado final indicado arriba corresponde al candidato corregido.

La prueba nueva de navegador usa 390×844 y 1365×900: origen GPS simulado Chihuahua,
sin S1 lejano ni elección con Enter, selector centrado en el origen comprobado
mediante coordenadas enviadas al reverse, selección lejana sólo después de mostrar
y confirmar, destino Google exacto y ausencia de desbordamiento horizontal.
Dos pruebas de componente cubren publicación al mapa, foco/teclado, mostrar/ocultar,
confirmación, reinicio al cambiar texto y ciudad explícita. Datos de estos casos
son controlados; no equivalen a sucursales reales, GPS real ni Android físico.

Después de publicar: salud/proxy 200; coordenadas 28.6353,-106.0889, Plus Code
completo 75XMRW22+22 y compuesto RW22+22 Chihuahua: 200/una sugerencia cada uno.
Bodega Aurrera Express con foco Chihuahua: 200/ocho lejanos y NO_NEARBY_MATCHES.
Validación de 0/2/48 intermedias: 200; 49: 400 (50 puntos totales del motor),
plan sin sesión: 401. No se hicieron cálculos autenticados con ORS alojado.
CORS directo: origen autorizado 204 con cabecera correcta; origen ajeno 404.
Logs Vercel error/fatal de ambos proyectos, ventana 30 minutos: sin grupos;
no equivale a ausencia histórica de errores o a una auditoría completa de tráfico.

Navegador público real: antes de publicar, ocho coincidencias lejanas visibles
y S1 a 655.6 km en Monterrey. Después, aviso y «Ver coincidencias lejanas (8)»
sin lista ni S1 remoto; mapa principal en Chihuahua. Selector: elegir centro
mostró 28.635300,-106.088900 y SN Avenida Mirador, Chihuahua. Mostrar/ocultar
restituyó y retiró los ocho puntos sin confirmar destino. Capturas reales del
selector y estado cerrado; sin fixture en esta comprobación pública. No se
inició sesión ni se escribieron rutas/datos en Supabase alojado. Móvil físico
no disponible; los tamaños móvil/escritorio se verificaron en CI.

### Publicación y rollback

PR [#41](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/41),
commits 94ca288 (implementación) y 3e7bd14e18c4c1985169837ea5dc9128353569bf
(candidato final). Merge **dd1177169ff7b3768f6e0b9593de3989551ff6c5**;
deployment **dpl_4s4JaR1zaMjXxDs1UyXckevMiNe7**, READY/production. Se comprobó
el alias https://route-planner-web-sand.vercel.app/ al mismo SHA. Los tres archivos
publicados se compararon byte a byte con el código local probado: coincidencia.
La rama codex/nearby-search-boundary-20261122 y los commits se conservan;
next-env.d.ts generado no se incluyó. El cierre documental no modifica ese código.

La API permanece en 6cb81f3d78c4b2c9278d9441e1e66a96e31d6d42,
dpl_DJMs3PfpE2EQRmfswdaJQb4xeJ1k. No se redesplegó sin cambios.
Rollback Web conservado: b0d5d5497fabb17b0553d4943beabbc9a5a22a54,
dpl_DnEo1RhBgTeiTQwPvAurQ6Z1jHis. No se ejecutó rollback ni se borró historial.

### Cobertura y siguiente trabajo

Las tres consultas puntuales al Photon acotado a 50 km de Chihuahua (Express,
Bodega Aurrera, Aurrera) devolvieron los mismos tres negocios sin identificación
Express. No prueban que no existan más tiendas; sólo muestran lo recuperado por
ese índice. Se mantiene el filtro de formato y no se importaron coordenadas dudosas.
Photon documenta límites de uso razonable sin garantía de disponibilidad:
https://github.com/komoot/photon y https://github.com/komoot/photon/blob/master/docs/api-v1.md.
No se añadieron reintentos masivos, scraping o servicios de pago.

Se revisó como candidato el directorio primario
https://www.walmartmexico.com/conocenos/directorio-de-tiendas. El enlace «Ver la
lista de tiendas» dirige a directorio-consultorios-141122.pdf (ocho páginas,
formatos/días de servicio/direcciones). No es prueba de cobertura actual completa
de Express ni de accesos de descarga; se descartó importarlo automáticamente.
Siguiente P1: fuente primaria utilizable para identificar formato/sucursal y
corroborar acceso, con fecha, procedencia y política de uso, sin inferir coordenadas.

Siguen 15 municipios con referencias parciales y cero con validación legal
completa. Sin nuevas normas, horarios, permisos o geometrías legales. El reporte
consultado 2026-11-22T19:54:36.677Z tenía stale=false/overdue=true: se superaron seis
horas, sin demostrar causa del retraso o vigencia de documentos. No se cambió ni
se rejuveneció ese reporte. Google no recibe HGV ni fija una ruta exacta de camión.
Pendientes ORS autenticado alojado y navegación en Android físico. No se tocaron
Gestión, otros proyectos o datos alojados. El programa maestro sigue abierto.

## Ciclo · pegar búsquedas de Google Maps sin confirmar puntos · 23-11-2026

### Estado reconciliado y diagnóstico

Se consultaron GitHub, ambos alias y los dos informes de main antes de editar.
Web main d798612/prod dd11771, API main 17c9e0137775438e32f60284674a1d081ddf868b
/prod 6cb81f3. El cambio API externo sólo actualiza data/mx/source-status.json;
se conserva íntegro. No se atribuyó el desfase de commits a un fallo de publicación:
la API ya consulta el reporte remoto con caché. API directa, proxy y GitHub raw
devolvieron 2026-11-23T07:59:29.933Z, stale=false/overdue=false al consultar.
No se redesplegó API ni se cambió su monitor, cron, TTL, reporte o evidencia.

Un enlace de Maps se pegaba como texto de búsqueda y podía truncarse a 180
caracteres. Extraer cualquier coordenada visible tampoco sería correcto: center,
@ y viewpoint describen una vista, y un Place ID puede prevalecer sobre query.

### Implementación

El evento de pegado de LocationInput reconoce enlaces de búsqueda compatibles
de Google Maps (hosts .com/.com.mx declarados). Extrae una query/q única con
coordenadas, Plus Code o dirección y utiliza la búsqueda normal de sugerencias.
Las coordenadas conservan los decimales del texto; un código con + codificado
no pierde el signo. No importa Place IDs ni afirma identidad de sucursal.
Los enlaces query requieren api=1; se admite q de enlaces de búsqueda heredados.
Los cinco archivos de código se limitan a components/LocationInput.tsx,
lib/maps-location-paste.ts, test/maps-location-paste.test.mjs,
test/location-input.test.mjs y test/geolocation.e2e.mjs.

El enlace no se abre ni se descarga; sólo se procesa el texto pegado por el
operador. No hay SDK, secreto, permiso de lectura pasiva del portapapeles,
servicio de pago, dependencia ni solicitudes extra para resolver el enlace. Se consulta la API de
direcciones existente con el texto extraído. El resultado sigue sin confirmar
hasta que se elige y corrobora explícitamente. También funciona en las paradas
que reutilizan LocationInput; no modifica el OCR de manifiestos.

Los enlaces cortos maps.app.goo.gl/goo.gl/maps, rutas con varias ubicaciones,
Street View, vistas sin punto, URLs de ficha /place, identificadores que
prevalecen sobre query, múltiples query/q, coordenadas fuera de rango, credenciales,
puertos, controles o búsquedas mayores de 180 caracteres no se convierten en
puntos. Se ofrece copiar coordenadas, Plus Code o dirección completa desde Maps;
se conserva el borrador o punto confirmado anterior. Los demás textos conservan
su pegado normal. No se siguen redirecciones ni se interpreta una cámara como pin.

### Verificación y publicación

Local: build/typecheck y 207 pruebas aprobados; auditoría de producción cero
vulnerabilidades. Se repitieron build y pruebas tras el ajuste final del aviso;
next-env.d.ts generado queda excluido. Los tests de parser cubren precisión,
Plus Codes compuestos/completos, texto, dominios falsos, ambigüedad y casos
rechazados. Dos pruebas de componente verifican búsqueda y confirmación separadas,
preservación del punto anterior y ausencia de solicitudes a las URLs pegadas.

CI final [45161989326](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/45161989326), jobs 137649428934/137649428692: 207 pruebas, 40 casos de navegador y 11 flujos Auth aprobados; build/typecheck y auditoría cero vulnerabilidades. Se leyeron los logs completos. Auth/REST/Postgres son reales locales desechables y la API de integración está fijada por el workflow a 772a6b2; ORS/geometrías son sintéticos. No se presenta esa evidencia como cálculo real alojado o navegación Android.

El nuevo caso de navegador usa portapapeles real del Chromium desechable en
390×844 y 1365×900. Comprueba enlace corto que no borra el borrador, query precisa
que no confirma automáticamente, elección/confirmación y vista @ que conserva el
punto ya confirmado, sin peticiones a Google ni desbordamiento horizontal. Sus
respuestas de direcciones son controladas; no prueban una sucursal real ni Android.

Después del despliegue, salud/proxy: 200. Coordenadas 28.635300123,-106.088900456:
200/una sugerencia con lat/lng exactamente iguales; Plus Code completo 75XMRW22+22
y compuesto RW22+22 Chihuahua: 200/una. Express con foco Chihuahua: 200/ocho
lejanos/NO_NEARBY_MATCHES; se mantiene la protección del ciclo anterior. Validación
0/2/48 intermedias 200; 49 devuelve 400 (50 puntos totales del motor), sin restaurar
el límite de ocho. Plan sin sesión 401: no se presenta validación como cálculo real.
CORS directo autorizado 204 con origen correcto; ajeno 404 sin autorización.
Consulta Vercel error/fatal de ambos proyectos, ventana 30 minutos, sin grupos
retornados. Es una observación limitada a esa ventana y filtros.

Navegador público real del alias publicado: se pegó mediante el portapapeles un
enlace search con query 28.635300123,-106.088900456 y center=25,-100. El campo
conservó los nueve decimales de query, mostró la búsqueda extraída y quedó sin
confirmar; apareció SN Avenida Mirador, Chihuahua. La ficha de revisión enlazó
esas mismas coordenadas exactas. Sólo tras elegir y confirmar cambió a punto
confirmado. Al pegar maps.app.goo.gl/Example conservó la dirección confirmada
y mostró instrucciones, sin sustituirla por el centro del mapa. Captura real
del estado previo a confirmar. No se inició sesión ni se guardó ruta o dato en
Supabase alojado. Esta comprobación no valida una sucursal Express o entrada de carga.

PR [#42](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/42),
candidato 25282511a6fe82f66f9ae0c12dbc5393fc6d860c; merge
**8de78c1b2a5d3b798e353f9faf7601ed07c28491**. Deployment
**dpl_488q2LTnwqC7bL71sLQj74TSmZ8Y**, READY/production. Alias
https://route-planner-web-sand.vercel.app/ verificado al mismo SHA. Los cinco
archivos publicados coinciden byte a byte con los locales probados. Se conserva
la rama codex/maps-location-paste-20261123. El cierre documental no cambia el
código de ese despliegue; no hay cambios incompletos de aplicación publicados.

Rollback conservado: Web dd1177169ff7b3768f6e0b9593de3989551ff6c5,
dpl_4s4JaR1zaMjXxDs1UyXckevMiNe7. No se ejecutó rollback ni se borraron ramas,
historial o datos. API sigue en dpl_DJMs3PfpE2EQRmfswdaJQb4xeJ1k/6cb81f3.
Ninguna operación sobre Gestión u otros proyectos; sin escrituras alojadas,
migraciones, nuevas cuentas o cambios de autenticación.

### Fuentes, normativa y siguientes prioridades

La documentación primaria de Maps separa query de center y viewpoint y describe
el efecto de Place IDs. Se utiliza como referencia de compatibilidad:
https://developers.google.com/maps/documentation/urls/get-started.
No se garantiza compatibilidad con todas las URLs de Google ni navegación exacta HGV.

Se reintentaron directamente el 23-11-2026 la Gaceta CDMX 15-12-2021, el aviso
de la Autoridad del Centro Histórico y el decreto estatal Puebla 21-04-2026:
https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/0830deebda0a6b9e7fb44d6d2cef2ab0.pdf
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Aviso%20Carga%20y%20Descarga%2015122021.pdf
https://periodicooficial.puebla.gob.mx/media/k2/attachments/T_EV_21042026.pdf
Los tres intentos directos devolvieron HTTP 503; el buscador al abrir Gaceta y
decreto devolvió 502. No se obtuvieron bytes PDF, huellas nuevas ni cotejo visual.
Se conserva la investigación anterior y no se importan horarios por lectura
indexada o por la fecha de un intento. No se declara vigencia, reforma completa
o permiso de camión a partir de esas respuestas.

Siguen 15 municipios con referencias parciales y cero con validación legal
completa; ninguna geometría legal nueva. El reporte técnico reciente mantiene
Puebla con cambio y Juárez/CDMX no disponibles, no equivale a vigencia jurídica.
La cobertura comercial Express sigue incompleta: el pegado facilita corroborar
puntos por otro medio, no añade sucursales al índice. Próximo P1: fuente primaria
utilizable para identificar formato/sucursal y acceso con procedencia y fecha.
Pendientes de medios adecuados ORS autenticado alojado y navegación Android físico;
Google no recibe restricciones HGV ni fija una ruta exacta. El programa continúa.
