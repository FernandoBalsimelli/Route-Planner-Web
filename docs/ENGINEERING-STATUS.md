# Route Planner — estado de ingeniería

Fecha de revisión: 2026-11-10. Alcance: exclusivamente Route Planner.

Estado vigente: preferencias de carretera y revisión municipal publicadas; Web
5b2de70 y API cd6f2d3. Referencias parciales para 14 municipios; cero con validación
legal automática completa. Últimos resultados, rollback y próxima prioridad en
el cierre del 10 de noviembre al final. Las entradas anteriores son historial.

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
comprobación móvil integral se registran al cerrar el ciclo.

Archivos API: scripts/check-official-sources.mjs, lib/source-evidence.js,
lib/source-monitor.js, test/source-monitor.test.js, data/mx/source-status.json
y MEXICO-COVERAGE.md. Web: OfficialSourceMonitor.tsx, globals.css, pruebas de
monitor y geolocation.e2e, workflow e informes. El job de integración usa la
API 13e5858a. No se cambian migraciones ni configuración alojada de Supabase,
credenciales o planes; Gestión y otros proyectos no se consultan ni modifican.
La cobertura continúa en 14 referencias parciales y cero municipios con
validación automática completa. Pendiente verificar despliegue final, trazados
legales por sentido/horario/permisos y Android físico. El programa sigue abierto.
