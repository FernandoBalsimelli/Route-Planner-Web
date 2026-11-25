# Cobertura municipal mexicana y navegación

Revisión: 25 de noviembre de 2026, Chihuahua; ciclos R30–R31. Sólo Route Planner. **El programa nacional sigue incompleto:16 municipios con referencia parcial y cero con validación legal automática completa.**

El historial anterior íntegro, incluidas fuentes, decisiones y limitaciones de cada ciclo, se conserva sin modificar un byte en [MEXICO-COVERAGE-HISTORY-THROUGH-R29.md](MEXICO-COVERAGE-HISTORY-THROUGH-R29.md), blob Git `2f7cf155f0762d9d664b8ad03def1fe00c9dba54`. Pruebas/publicación actuales: [ENGINEERING-STATUS.md](ENGINEERING-STATUS.md). No interpretar cifras históricas como cobertura actual ni descargas como validación jurídica.

## Qué existe y qué efecto tiene

| Capa | Cobertura de esta versión | Efecto real |
| --- | --- | --- |
| Catálogo INEGI |32 entidades y2,478 municipios/demarcaciones | Nombres/códigos, orden alfabético y selección sin entidad preseleccionada; no permisos |
| Límites municipales | Marco Geoestadístico de diciembre2025, simplificado/versionado | Identifica aproximadamente jurisdicciones tocadas por la polilínea; incertidumbre cerca de límites; no corredores autorizados |
| Monterrey19039 |38 renglones de red troncal y19 de horarios, anexos1–3 | Fuente/página/sentido consultables; no exclusión geométrica automática; revisar vigencia/excepciones por ejes |
| Delicias08021 | Tres fichas de copia histórica municipal2016 más un aviso estatal2011 con procedencia propia | Cuatro referencias consultables, no horario autorizado ni restricción ejecutable |
| Otras referencias parciales | Chihuahua, Guachochi, Juárez; Cuauhtémoc/CDMX (perímetroA); nueve municipios del AMG/Jalisco; Puebla | Ámbito y límites específicos; no extender una regla a todo el municipio, estado o configuración de camión |
| ORS/OSM HGV | Datos cartográficos del proveedor sobre accesos, peso y dimensiones | Se envían medidas/peso declarados; cobertura incompleta y sin consolidación municipal propia |
| Google Maps | Puntos confirmados y preferencias compatibles en enlaces consecutivos | Recalcula con su motor; no recibe HGV, permisos ni polilínea ORS fija |
| Navegación interna | Sigue la polilínea calculada con GPS e indicaciones | Conserva ese trazado; no acredita vigencia/legalidad ni ha sido validada en Android físico |

La respuesta de ruta conserva `regulatoryCoverage.status=not_verified` y `municipalGeometryEnforced=false`. Fuera de México no hay catálogo incorporado. Una referencia consultable o coincidir con una condición vehicular no autoriza circulación, maniobra o descarga.

## Delicias — aviso localizado en este ciclo

Fuente oficial [Periódico Oficial n.º67,20-08-2011, página1](https://chihuahua.gob.mx/atach2/po067_2011_baja.pdf#page=1). El sumario anuncia el Acuerdo126 relativo al Reglamento de Vialidad y Tránsito del Municipio de Delicias y remite a un **folleto anexo**. Texto e imagen de página1 cotejados; archivo18,329,182bytes/60páginas, SHA-256 `a67c91838dfbc2e3374d89b72e9befe7d5882d802972c19c7c824c6b4f7c65e1`.

| Evidencia | Qué acredita | Qué sigue sin acreditar |
| --- | --- | --- |
| Aviso estatal2011, sumario/página1 | Existe un anuncio de aprobación con referencia a anexo | Texto íntegro/identidad del anexo, fecha efectiva deducible y vigencia posterior |
| [Copia municipal15-12-2016](https://municipiodelicias.com/images/transparencia/gacetaMunicipal/Gaceta%20Municipal%202016/Gaceta-Municipal-de-Delicias-Diciembre.pdf), pp29/44 | Contenido histórico consultado en R29; arts108/109 y transitorios | Que la fecha de la copia sea publicación original; consolidación actual o permiso para la entrega |
| Hashes/tamaños/fechas de consulta | Trazabilidad de los archivos observados | Actualización legal automática o aprobación de las reglas |

La copia municipal mide1,567,327bytes/52páginas, SHA-256 `31da346d9f92756cbf2aaea759f30915530d5cfcc15cbe1d927e9bf4c58efdea`. Conserva `copyPublishedAt=2016-12-15`; no se incorporan `publishedAt`, `effectiveFrom` ni `consolidatedThrough` inferidos a esa fuente. El aviso tiene tipo`official_gazette_notice` y revisión`notice_only_annex_not_verified`.

Las cuatro fichas identifican jurisdicción/ámbito, página, enlace, día de consulta25-11-2026 y huella. Todas conservan `legalValidityVerified=false`, `routingEnforced=false`, `geometry=null`; `timeRules` y `trunkSegments` vacíos. La hora22:00–07:00 de la copia se muestra como referencia histórica de maniobras en un supuesto de vía pública/zona centro, **sin crear una ventana ejecutable**. Condiciones de carril/carga/abanderamiento no se transforman en veto municipal o límite general de toneladas. No hay zonas/carriles/sentidos, configuración vehicular, permisos o acuerdos actuales corroborados para aplicar al motor.

Se renombra la ficha de entrada en vigor para distinguir el aviso localizado del cotejo íntegro pendiente. La Web ya muestra las cuatro fichas y enlace correcto al PO#page=1; se comprobó la guía pública del deployment actual. El [informe de revisión API](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/DELICIAS-HISTORICAL-REFERENCE-20261125.md) detalla el alcance. No se presenta como revisado el informe municipal de sindicatura cuyo tamaño bloqueó su apertura web en el ciclo anterior.

## Seguimiento periódico: disponibilidad, cambios y revisión jurídica

`data/mx/national-references.json` registra fuentes; `scripts/check-official-sources.mjs` y el workflow`official-sources.yml` mantienen el reporte técnico. Conservan huellas y última evidencia correcta ante errores. Se comprueban ocho grupos y **30 documentos/URLs**, incluyendo HTML, PDF y bundle SPA cuando corresponde; no son30 reglamentos validados ni cobertura nacional. El PO67 entra como URL relacionada de Delicias. Sin servicios nuevos, ampliación de cuota, mayor frecuencia ni presupuesto de descarga.

La ejecución programada existente es cada seis horas y al cambiar su registro/script en main; no promete puntualidad, descubrimiento exhaustivo de nuevas publicaciones ni actualización jurídica en tiempo real. Fechas vencidas/cambios de documento/fallos se muestran por separado. El reporte usa actualización condicionada por SHA para preservar cambios ajenos. API lee la copia pública con caché15min y fallback local; no transmite rutas, cuentas o ubicaciones. `reportRefresh` informa lectura del reporte, no ejecución de un nuevo checker.

| Observación de este ciclo (UTC) | Resultado técnico |
| --- | --- |
| Checker local25-11-2026T08:38:36.252Z |28/30 descargas; dosHTTP503, Consejería CDMX portal_old y OJP Puebla2396 |
| Reporte automático posterior08:44:48.976Z, preservado |21/30 descargas; cuatro`NETWORK_OR_TIMEOUT` CDMX y cinco`HTTP_403` Juárez; Puebla disponible |
| API/proxy leyeron ese reporte a08:49:52.153Z | `stale=false`, `overdue=false`, `reportRefresh.status=available`; no cambia la fecha de comprobación documental |

No se atribuye una causa de red/403 no demostrada ni se eluden controles. `available` en la recuperación no significa que todas las fuentes se descargaron. `changed` o `unreviewed` no aprueban vigencia: un portal puede cambiar su HTML sin reforma normativa. El estado técnico de descarga y la revisión puntual de una página deben seguir separados. La fecha fresca del reporte no elimina los nueve fallos.

## Procedencia geográfica y requisitos para reglas ejecutables

Catálogo: `scripts/sync-mx-catalog.py`, servicio oficial INEGI https://gaia.inegi.org.mx/wscatgeo/v2/mgee y`/mgem/{entidad}`; validación de32 entidades y unicidad de códigos. Documentación https://www.inegi.org.mx/servicios/catalogounico/.

Límites: `scripts/sync-mx-boundaries.py`,2,478 áreas del Marco Geoestadístico diciembre2025, coincidencia exacta de claves y simplificación0.0005grados (aproximadamente56m). La API intersecta el índice local sin consultar INEGI o transmitir la ruta durante cada cálculo. El límite estadístico no es un polígono legal de restricción.

Monterrey: `scripts/import-monterrey.py RUTA_PDF`, páginas163–167 del [reglamento oficial](https://www.monterrey.gob.mx/pdf/portaln/reglamentos/Reglamento%20de%20Transito%20y%20Vialidad%20del%20Municipio%20de%20Monterrey.pdf);38/19 renglones, duplicados preservados, huella y página. La revisión histórica de09-11-2026 constató reforma24-04-2026. No sustituye una comprobación actual de vigencia. Horarios usan America/Monterrey; la relación art39/excepciones por ejes/anexos de fin de semana requiere interpretación pendiente, sin aplicación automática.

Cada futura regla que influya en el cálculo necesita fuente oficial/versionada y vigencia; jurisdicción/ámbito; tipo/configuración/ejes/carga/dimensiones/peso aplicables; horario/días/zona horaria; excepciones y permisos; calles/tramos/sentidos/accesos y geometría cotejada. Después, pruebas de intersección y casos límite. Un nombre de calle, catálogo, PDF o sumario no satisface esos requisitos. Las reglas con días no corroborados conservan`days:null`, sin inventarlos. La Red Nacional de Caminos/Sakbé y otros proveedores gratuitos siguen sujetos a evaluación de licencia/capacidad; no están integrados como certificación HGV nacional.

## Consulta y navegación

- `GET /v1/regulations/municipalities?state=08&limit=600`: catálogo paginado, filtros`q`/`offset`, cobertura real; estados y municipios alfabéticos.
- `GET /v1/regulations/municipalities/08021`: cuatro fichas de Delicias;19039: Monterrey. Códigos conocidos sin referencia devuelven`not_loaded`; desconocidos404, parámetros inválidos400.
- `GET /v1/regulations/source-status`: reporte técnico y recuperación; no legislación consolidada.
- `POST /v1/routes/plan`: sesión requerida, jurisdicciones aproximadas del recorrido, cobertura`not_verified`; no aplica estas referencias como exclusiones geométricas.

Los enlaces Google conservan orden/entregas en tramos consecutivos, puntos guía y límites reales de Maps URLs (hasta9 waypoints en entorno compatible,3 móviles y2048caracteres); no obligan a conservar una polilínea. El cálculo actual admite50 puntos totales/48 intermedios por el proveedor; no hay límite artificial de ocho. Para más puntos se requieren etapas, con sus límites de cuotas/optimización explícitos. Documentación oficial https://developers.google.com/maps/documentation/urls/get-started.

La navegación interna sigue el trazado calculado, proyecta progreso y usa índices de maniobra validados. GPS impreciso (>80m), antiguo o desvío detiene/advierte sin inventar reincorporación. Puede usar voz/pantalla encendida cuando el dispositivo lo permita; requiere app visible y no ofrece mapas sin conexión o navegación en segundo plano. Paradas repetidas/cruces conservan progreso acotado. Cambiar ruta/cuenta/sección detiene seguimiento. Android físico y acceso vial real siguen pendientes. Google y navegación interna no certifican seguridad/legalidad para el camión.

## Validación y siguiente prioridad

API PR37: build/98 pruebas/auditoría cero, nueva regresión de aviso/copia y ausencia de efectos inferidos. Tras el checkpoint automático de sólo disponibilidad se repitieron98 locales. Producción API`fe2639c8a365510e774c4f7f7cd20fde17fbf598`, READY; Web`390a8d62336b72712539b8c240016542dbe3934c`, READY. Sondas públicas Delicias API/proxy200, cuatro fichas y catálogo16/0; guía pública y enlaces por página verificados. CI Web de este ciclo:243 unitarias/53 navegador/14 integraciones locales autenticadas con APIc2b2f09; proveedores externos sintéticos. No es prueba de cálculo HGV alojado real, cuenta del propietario o Android físico.

Próximo: localizar el folleto íntegro anunciado por PO67/2011, cotejarlo con2016 y revisar reformas/acuerdos operativos vigentes antes de interpretar horarios, carriles o permisos de Delicias. Continuar fuentes oficiales de otros municipios y geometrías por sentido; no extrapolar Monterrey a Nuevo León ni el AMG a todo Jalisco. Mantener las limitaciones visibles y los cambios pequeños/verificables. El prompt maestro y la continuación existente permanecen abiertos.
