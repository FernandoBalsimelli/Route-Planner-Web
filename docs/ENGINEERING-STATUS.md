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
