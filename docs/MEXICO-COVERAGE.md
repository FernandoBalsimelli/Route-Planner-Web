# Cobertura municipal mexicana y navegación

Revisión: 2026-11-18. Exclusivamente Route Planner. El programa general sigue abierto.

## Qué existe realmente

| Capa | Cobertura de esta versión | Efecto en el cálculo |
| --- | --- | --- |
| Catálogo y límites INEGI | 32 entidades y 2,478 municipios/demarcaciones; límites oficiales de diciembre de 2025 simplificados y versionados | Identifica aproximadamente qué jurisdicciones toca la polilínea; no es una lista de calles permitidas |
| Monterrey, código 19039 | 38 renglones de red troncal y 19 renglones de horarios extraídos de los anexos 1–3 del reglamento oficial | Referencia consultable con página y sentido; no exclusión geométrica |
| Otros municipios | Nuevas referencias parciales y estados pendientes; ver ciclo nacional más abajo | Ninguna validación legal añadida |
| Motor ORS / OSM | Parámetros de dimensiones y peso existentes | Aplica los datos disponibles del proveedor; cobertura incompleta |
| Navegación interna | GPS e indicaciones sobre la polilínea del cálculo, sin sustituirla | Conserva ese trazado; no acredita legalidad |

**Cero municipios tienen validación automática completa.** La respuesta de cada
ruta declara `regulatoryCoverage.status = not_verified`. Desde este ciclo sí
identifica jurisdicciones aproximadas, separando «referencia cargada» de «reglas
pendientes», pero no aplica esas referencias al motor. Fuera de México no hay catálogo incorporado.
No se garantiza evitar infracciones, cierres, señalización nueva ni permisos locales.

## Fuentes y reproducción

API `scripts/sync-mx-catalog.py` consulta exclusivamente el servicio INEGI:
https://gaia.inegi.org.mx/wscatgeo/v2/mgee y `/mgem/{entidad}`.
Valida las 32 entidades, unicidad de códigos y presencia de Monterrey; guarda
fecha y URL. No descarga polígonos ni convierte límites geográficos en permisos.
Documentación: https://www.inegi.org.mx/servicios/catalogounico/.

API `scripts/sync-mx-boundaries.py` descarga desde el servicio vectorial oficial
las 2,478 áreas geoestadísticas municipales del Marco Geoestadístico de diciembre
de 2025. Valida que sus claves coincidan exactamente con el catálogo, simplifica
los límites con tolerancia de 0.0005 grados (aproximadamente 56 m) y los codifica
en un índice local reproducible. La API intersecta la polilínea con ese índice;
no depende de que INEGI esté disponible durante un cálculo ni transmite la ruta.
La aproximación puede clasificar con incertidumbre un trayecto pegado al límite.

API `scripts/import-monterrey.py RUTA_PDF` utiliza pdfplumber y las tablas de las
páginas 163–167 del PDF oficial consolidado:
https://www.monterrey.gob.mx/pdf/portaln/reglamentos/Reglamento%20de%20Transito%20y%20Vialidad%20del%20Municipio%20de%20Monterrey.pdf
El JSON conserva el SHA-256 del archivo, fecha de consulta, página y anexo. El
9 de noviembre de 2026 se comprobó que el PDF consolidado incluye la reforma
publicada el 24 de abril de 2026 y conserva los artículos 37–43 y anexos 1–3;
no se publica una copia del documento. Exige 38 renglones troncales y 19 de horarios.
Se conservan duplicados de la fuente. Los horarios incluyen America/Monterrey.
La relación entre el artículo 39, excepciones por ejes y anexos de fin de semana
requiere revisión: los registros correspondientes lo advierten. No aplicar esa
interpretación automáticamente. Revisar reformas y vigencia antes de activarla.

Los nombres de una vialidad no bastan para excluir toda la calle. Cada futuro
registro aplicable deberá tener geometría y sentido validados, jurisdicción,
fuente oficial/versionada, vigencia, vehículo/carga, horarios y zona horaria,
excepciones y permisos. Una fuente faltante o dudosa conserva estado pendiente.
La Red Nacional de Caminos y Sakbé de INEGI son fuentes a evaluar; no se han
integrado como motor ni como certificación legal nacional en esta versión.

## API pública de consulta

- `GET /v1/regulations/municipalities?state=19&limit=600`: catálogo paginado,
  estados, procedencia y cobertura real. Filtro `q`, `offset`, límite hasta 600.
- `GET /v1/regulations/municipalities/19039`: referencia de Monterrey.
- Códigos conocidos sin fuente devuelven `not_loaded`, listas vacías y advertencia;
  códigos desconocidos devuelven 404. Los parámetros inválidos devuelven 400.
- `POST /v1/routes/plan`: `regulatoryCoverage.municipalitiesIdentified` ordena
  aproximadamente las jurisdicciones tocadas, con clave INEGI, entidad y estado
  de cobertura. `municipalGeometryEnforced` continúa en `false`.

## Navegar el trazado

Después de calcular, «Iniciar navegación en la app» solicita seguimiento GPS.
Para camiones exige reconocer que se revisaron accesos/permisos y que falta
cobertura municipal. No cambia la polilínea ni pide recalcular al desviarse.

- Proyección sobre el trazado con progreso acotado para evitar saltos a futuros
  cruces o puentes. Las maniobras usan los índices de geometría del proveedor.
- Lecturas con precisión peor que 80 m no avanzan las instrucciones. Posiciones
  antiguas, permiso denegado o falta de GPS ocultan la guía; un desvío avisa y
  exige revisar el recorrido, sin inventar maniobras para reincorporarse.
- GPS/voz se detienen al cambiar el recorrido, cuenta, sección o desmontar.
  Ocultar la app pausa el seguimiento; volver reinicia la adquisición.
- Voz opcional del dispositivo y solicitud de pantalla encendida cuando el
  navegador lo permita. Requiere la app visible; no ofrece navegación en segundo
  plano ni mapas sin conexión. No se guarda ni transmite el seguimiento GPS.
- «Reubicar mi avance» conserva el trazado y reinicia su proyección. Evita
  manipular la app conduciendo; revisar el recorrido en un lugar permitido.
- Las rutas guardadas antiguas sin índices muestran el trazado y GPS, pero
  requieren recalcular para instrucciones ligadas a las maniobras.

Google Maps sigue recibiendo puntos; recalcula con su propio motor y no recibe
la polilínea ORS, dimensiones HGV ni permisos municipales. Maps URLs no permite
prometer esa transferencia exacta. La navegación interna implementa la opción
solicitada de conservar el recorrido. Documento oficial:
https://developers.google.com/maps/documentation/urls/get-started.

## Próximo avance del programa nacional

1. Revisar vigencia e interpretación municipal y georreferenciar los tramos de
   Monterrey por sentido/acceso; pruebas de intersección y vehículos/horarios.
2. Incorporar reglamentos y corredores de otros municipios desde sus portales y
   publicaciones oficiales, con versiones y geometrías verificadas. No extrapolar
   el reglamento de Monterrey a toda la zona metropolitana ni al país.
3. Usar las jurisdicciones ya identificadas para priorizar fuentes faltantes e
   integrar exclusiones al motor solo cuando su geometría y aplicación estén comprobadas.
4. Verificar GPS, voz, consumo, pantalla y accesos reales en Android físico antes
   de considerar navegación de campo validada. Pendientes generales adicionales
   siguen en ENGINEERING-STATUS.md; el prompt maestro no se declara terminado.

## Validación y recuperación

Se usan rutas, sesión de autenticación y posiciones sintéticas en pruebas;
ninguna prueba de navegador se presenta como ensayo de un camión real.
CI compila con configuración pública ficticia de Supabase, interceptada en E2E;
no usa credenciales ni cuentas de producción. Producción conserva su configuración.
Datos nuevos son JSON versionados. No hay migración de base de datos ni
modificaciones a Gestión, planes, credenciales o servicios contratados. Recuperar
los despliegues anteriores de Web/API revierte esta versión.

## Ciclo nacional y enlaces con puntos guía · 9 de noviembre de 2026

El recuadro destacado de Monterrey se retira. El catálogo comienza sin entidad
preseleccionada; estados y municipios se ordenan por nombre antes de paginar.

La API incorpora referencias **parciales para 13 municipios**, contando Monterrey:
9 del AMG comparten una referencia del polígono metropolitano de Jalisco;
Guachochi (arts. 89–91), Juárez (documento histórico de 2003) y Cuauhtémoc
(sólo perímetro A del Centro Histórico). No se afirma vigencia consolidada de
las nuevas referencias ni cobertura de toda su superficie. El portal actual de
Jalisco distingue C2/C3, remolques/sencillos y dobles; no aplicar el horario
06:00–09:00 de dobles indiscriminadamente a todos los vehículos. La guía CDMX
conserva 6 ejes de prohibición de maniobras y 15 vías principales con tramos;
prohibición de descarga no equivale a prohibición de circulación.

`data/mx/national-references.json` versiona fuente, ámbito, revisión, condiciones
vehiculares, zona horaria, interpretación y geometrías pendientes. Los horarios
con días no confirmados mantienen `days: null`. Ninguna referencia nueva altera
el cálculo ni autoriza automáticamente la ruta; siguen **0 municipios con
validación legal completa** y 2,465 municipios sin referencia cargada.

`official-sources.yml` comprueba cinco fuentes oficiales cada seis horas, también
al cambiar su registro/script en main. Sólo utiliza un runner público estándar
y el token temporal del propio repositorio. No instala servicios ni activa pagos.
Guarda hashes, última descarga correcta y errores; mantiene evidencia previa
cuando falla una consulta. En páginas SPA comprueba también el bundle principal;
en Juárez y CDMX vigila además la publicación/registro relacionado. Cambios,
indisponibilidad o más de 18 h sin ejecución se muestran separadamente de la
vigencia jurídica. El monitor **no descubre automáticamente todos los decretos**,
no convierte cambios en reglas aplicables y no garantiza actualización en tiempo
real. La actualización de estado usa una condición SHA para no pisar otra edición.
`GET /v1/regulations/source-status` lee el reporte público versionado con caché
15 min y fallback local; no transmite recorridos, cuentas ni ubicaciones.

Los resultados incluyen `waypoints[].geometryIndex` sólo si el mapeo completo
que entrega ORS es válido y monotónico. La Web prepara puntos guía 25 m después
de maniobras y cada 1.5 km en tramos largos, conservando cada entrega exacta,
incluso en bucles/paradas repetidas. Los enlaces mantienen límites 9/3 y 2048
caracteres, compartiendo extremos y mostrando etiquetas Guía/Entrega. Las rutas
antiguas sin mapeo piden recalcular para habilitar guías. El usuario puede
quitar las guías. `dir_action=navigate` solicita navegación cuando Google la
soporta y el origen coincide con la posición; en otro caso puede abrir vista previa.

**Límite de integración confirmado:** los enlaces de Google Maps no aceptan una
polilínea externa, dimensiones ni permisos de camión. Los puntos guía influyen
pero no bloquean el trazado ni garantizan las calles entre ellos. Google tiene
Large Vehicle Routing limitado a clientes provisionados y cobertura declarada en
los 48 estados contiguos de EE. UU. y Japón; no México. El token se consume en
Navigation SDK dentro de una app integrada, no transfiere ORS a la app de Google
Maps. No se activó ningún producto comercial. Fuentes técnicas primarias:
https://developers.google.com/maps/documentation/routes/lvr-routes-etas
https://developers.google.com/maps/documentation/navigation/android-sdk/large-vehicle-navigation
https://developers.google.com/maps/documentation/urls/get-started

Pendiente obligatorio del programa: cobertura nacional legal/geométrica completa,
validación de vigencia, excepciones y permisos por jurisdicción, acuerdos nuevos
y cierres temporales. No se encontró una fuente oficial única mantenida que
resuelva todos esos campos para los 2,478 municipios. INEGI/RNC no sustituye a
los reglamentos. Priorizar las jurisdicciones de los recorridos reales y revisar
cada fuente antes de activar una exclusión. No declarar finalizado el prompt maestro.


## Puebla · referencia parcial revisada el 10 de noviembre de 2026

Se añade Puebla (INEGI 21114): 14 municipios con alguna referencia parcial y
2,464 sin referencia; siguen cero municipios con validación legal automática.
La fuente es RES. 2021/49 en la Gaceta municipal, aprobada el 28-12-2021.
La ficha del Orden Jurídico Poblano ofrece texto consolidado, pero su descarga
respondió 503 en la revisión local; no se inventa un hash del PDF ni se declara
comprobada la publicación o vigencia actual de todas sus disposiciones.

Se conserva una advertencia explícita sobre la derogación de Octavo, Noveno y
Decimotercero: los horarios de esos apartados de 2020 no se activan como reglas.
La referencia distingue capacidad de carga menor/mayor de 3.5 t de peso bruto,
ventanas de maniobras con cruce de medianoche y días desconocidos, condiciones
de instalaciones, autorizaciones, límites C2 de Zona de Monumentos Históricos
y longitud de Centro Histórico. El caso exactamente 3.5 t queda sin resolver.
Ningún límite se extiende a todo el municipio ni al estado. No hay geometrías
legales, sentido, excepciones ni permisos individuales verificados para enrutar.

Se incorpora una sexta fuente al monitor: reforma municipal, página COREMUN y
ficha OJP. Vigilar documentos no descubre todos los acuerdos ni certifica vigencia.
Los datos y comparadores son sólo referencia; no se incorporan a Directions.
Fuente primaria y enlaces de contraste quedan versionados en national-references.

La Web ofrece «Revisar» en cada municipio identificado del recorrido. Abre el
directorio en esa jurisdicción, conserva el resto del plan y muestra el estado
técnico de su fuente sin tener que desplegar el detalle. Al cambiar de municipio
se cancelan respuestas obsoletas; no se muestra otra fuente como si fuera local.
Un municipio sin referencia conserva su aviso y ninguna certificación de acceso.


## Evidencia separada por documento · 10 de noviembre de 2026

El monitor anterior agrupaba descarga principal y enlaces en un único try/catch:
un fallo vinculado descartaba la comprobación nueva del principal. Ahora conserva
por documento URL, tipo, hash inicial/actual, intento, última descarga correcta,
cambio técnico y error. Se consultan los enlaces declarados aunque falle el
principal. Un bundle SPA no descubierto se marca pendiente, no como cambiado.
No se eliminan respuestas correctas por otro documento no disponible.

La API añade documents, availability (available/partial/unavailable), changeDetected,
changeKinds, relatedSetChanged y fechas de comprobación individuales al contrato
existente; mantiene los estados antiguos para compatibilidad. lastSuccessAt es
la última comprobación completa satisfactoria; primaryLastSuccessAt corresponde
sólo al principal. Reportes anteriores conservan sus hashes y quedan sin desglose
hasta la siguiente ejecución, sin inventar una descarga nueva.

La UI muestra simultáneamente cambio y fallo; cada documento enlaza su propia
fuente y última descarga. Un reporte global reciente no vuelve reciente una
fuente individual antigua. Los enlaces públicos del desglose se restringen a
los declarados y al bundle de la misma fuente; errores de red se redactan.

No se extraen ni activan nuevas reglas en este ciclo: siguen 14 municipios con
referencias parciales y cero con validación legal automática completa. Los hashes
de HTML pueden variar por formularios, menús u otras publicaciones; el monitor
no los convierte en reformas. Faltan geometrías/sentidos y revisión legal de
vigencia, excepciones y permisos. El fallo se demuestra con respuestas simuladas
controladas y se contrasta con descargas oficiales reales por separado.

Contraste real del 10 de noviembre: en Puebla se recuperaron el principal y
COREMUN mientras la ficha vinculada de OJP respondió 503; ahora se conserva la
evidencia nueva y el fallo exacto. En Juárez cambió la página vinculada de Gaceta,
no el hash del documento principal. Son comprobaciones técnicas de esa ventana,
no declaraciones de reformas ni de disponibilidad futura.

Una respuesta remota retrasada de CDN no sustituye el reporte incorporado más
reciente. Se conserva la comprobación con fecha más reciente y se comparten
consultas simultáneas, manteniendo el límite de caché y tiempos de espera.


## Perfil operativo sin ampliar la cobertura legal · 10 de noviembre de 2026

El perfil puede registrar configuración, número total de ejes y capacidad nominal
de carga. El selector usa nomenclatura y ejes de la Tabla B-2 de la
[NOM-012-SCT-2-2017](https://sidof.segob.gob.mx/notas/docFuente/5508944),
consultada el 10-11-2026. Capacidad nominal, peso bruto cargado y carga por eje
son conceptos distintos; se almacenan sin inferir uno del otro. Un campo vacío
sigue desconocido. La precisión de capacidad se limita a tres decimales sin
redondear silenciosamente un valor a través del umbral de 3.5 t.

La selección completa los ejes y verifica su consistencia interna. No verifica
neumáticos, clase de carretera, límites de peso de la NOM, permisos o excepciones.
Tampoco resuelve el caso exactamente 3.5 t de la referencia poblana ni activa
horarios o calles evitadas. ORS no recibe estos campos nuevos como restricciones.
Las rutas guardan el perfil histórico para su revisión; editar la unidad después
no cambia los datos de aquel cálculo. Véase VEHICLE-OPERATING-PROFILE.md.

Permanecen 14 municipios con referencia parcial y cero con validación legal
completa. No se incorporan geometrías ni municipios nuevos en este ciclo.

## Comparación de datos de la unidad · 10 de noviembre de 2026

La consulta municipal contrasta los datos actuales del planificador con los
comparadores estructurados existentes de Puebla y el criterio de ejes del
artículo 39 de Monterrey. Sólo describe coincidencias o diferencias numéricas;
no asigna una ventana, certifica permisos ni determina las calles transitables.
Conserva los ámbitos y todas las disposiciones visibles, incluso al no coincidir.

Capacidad nominal y peso bruto se comparan por separado. El umbral exacto de
3.5 t queda sin ventana asignada. Configuración/ejes contradictorios y valores
inválidos quedan pendientes. Ancho de carga no se infiere del ancho del camión.
Al cambiar a Reparto se retira el contexto del camión, sin mostrar una supuesta
exención anterior. Detalle y fuentes: MUNICIPAL-VEHICLE-REVIEW.md.

No aumenta el número de municipios cubiertos: siguen 14 referencias parciales y
cero validaciones legales completas. No se agregan geometrías ni exclusiones al
cálculo. Continúan pendientes vigencia, ámbito, permisos, días y excepciones.


## Alternativas con la misma cobertura pendiente · 10 de noviembre de 2026

Cada alternativa conserva su geometría y su propia identificación aproximada de
municipios. Cambiar de opción actualiza la consulta del recorrido mostrado;
no copia la jurisdicción de la primera opción ni acredita autorización por sus
referencias. Las alternativas conservan las restricciones cartográficas de HGV,
pero no añaden geometrías municipales verificadas al cálculo. Siguen 14 municipios
con referencias parciales y cero con validación legal automática completa.

La investigación y el cambio no hacen que Google Maps reciba el trazado exacto
ni los atributos del vehículo. Detalle de límites y contrato: ROUTE-ALTERNATIVES.md.

## Chihuahua capital · 11 de noviembre de 2026

Se incorpora 08019 como referencia parcial: artículo 66 de la ley estatal
consolidada al 08-08-2026 y propuesta MO-4.4 del programa metropolitano publicado
el 05-07-2025. Las horas citadas como ejemplos de planeación no se convierten
en ventanas vigentes. La interfaz identifica documento, jurisdicción y fechas,
y enlaza la página correcta de cada fuente.

El seguimiento técnico incluye ambos documentos, preservando los reportes de
las otras fuentes. Detalle, huellas, ámbito y pendientes:
[CHIHUAHUA-CAPITAL-REFERENCE.md](CHIHUAHUA-CAPITAL-REFERENCE.md).

El total pasa a **15 municipios con referencia parcial**, siete fuentes principales
y **cero con validación legal automática completa**. Aldama y Aquiles Serdán no
ganan cobertura por aparecer en el programa metropolitano. No se incorporan
geometrías, permisos ni nuevas exclusiones automáticas de circulación.


## Puebla · vigilar el PDF de COREMUN, no sólo su página · 15-11-2026

El enlace municipal de COREMUN carga un visor con
`file=/media/k2/attachments/COREMUN.pdf`. El monitor sólo comprobaba la página
HTML; un cambio del PDF tras ese visor podía pasar inadvertido. Se añade la URL
HTTPS del PDF al mismo registro de Puebla y a sus enlaces de consulta, sin
nuevo proveedor, cron, cuota ni servicio. Se conserva el hash independiente,
el estado sin revisión legal y la comprobación existente de enlaces oficiales.

Descarga real del 16-11-2026 04:23 UTC (15-11, Chihuahua): HTTP 200, 8,017,957 bytes,
SHA-256 `b8015929109522726f95e0d9278564592757bcd2a690abe0a326e898ae1c891f`.
La portada declara consolidación al 10-12-2025 y carácter informativo; remite al
Periódico Oficial como fuente original. Se localizaron artículos 298/299 en
páginas PDF 158–160 y 323 Quindecies/Sexdecies en página 176 para la próxima
revisión. No se ha revisado íntegramente el código ni actos posteriores; no se
modifican horarios ni umbrales a partir de esa localización. La referencia de
2021 mantiene sus advertencias de vigencia, jurisdicción y geometrías pendientes.

El informe real de esta comprobación conserva evidencia por documento: el PDF
nuevo queda `unreviewed`, las páginas municipales con cambios y la ficha OJP
respondió 503. Esa caída no oculta la descarga válida del PDF. CDMX siguió sin
comprobación completa; Juárez respondió y quedó con cambios pendientes de
revisión. Ninguno de esos estados equivale a una reforma legal confirmada.

La prueba nueva usa contenidos controlados para verificar que cambiar sólo el
PDF tras páginas idénticas se refleje públicamente como cambio y nunca como
aprobación legal. La descarga real se informa separadamente. Se mantienen
15 municipios con referencia parcial, cero validaciones legales completas y
ninguna geometría municipal aplicada a Directions.

Fuente directa: https://gaceta.pueblacapital.gob.mx/media/k2/attachments/COREMUN.pdf
Página/visor de origen: https://gaceta.pueblacapital.gob.mx/coremun
La programación existente solicita comprobación cada seis horas; GitHub puede
demorar las ejecuciones. El reporte marca evidencia antigua a las 18 horas.
No garantiza vigilancia en tiempo real ni actualiza automáticamente normas.

Comprobación posterior: el monitor automático recuperó de nuevo el PDF a las
04:27:52 UTC del 16-11-2026 y conservó el mismo hash. OJP volvió a responder;
las páginas de Puebla siguen con cambios y el PDF queda sin revisión legal.
La API publicada es 1e3482b, PR #16; detalles de CI, alias y rollback en el cierre
correspondiente de ENGINEERING-STATUS.md.

La comprobación pública de API/proxy aún sirvió el snapshot 04:23:34 UTC,
con el PDF recuperado y OJP 503. La recuperación de OJP a las 04:27:52 consta
en GitHub; no se declara ya reflejada en el endpoint, que usa caché de 15 min.


## Puebla · alcance de maniobras y estacionamiento · 15-11-2026

Se incorporan cuatro disposiciones seleccionadas de COREMUN (298 I–III, 299
I–III, 323 Quindecies y Sexdecies), separando circulación, maniobras y
estacionamiento rotativo. Cada una conserva fuente, páginas, hash, fecha de
consulta y ámbito específico. La consolidación indicada es 10-12-2025; faltan
cotejo completo con el Periódico Oficial y actos posteriores.

No se asigna el tonelaje ambiguo de Sexdecies a peso bruto/capacidad ni se crea
un horario de circulación. Los 30 minutos de maniobras no anulan prohibiciones
de estacionamiento. No se añaden geometrías o exclusiones a Directions.
Detalle, fuentes y pendientes: [PUEBLA-OPERATIONS-REFERENCE.md](PUEBLA-OPERATIONS-REFERENCE.md).

Siguen 15 municipios con referencia parcial y cero con validación automática
completa. Los resultados y publicación del ciclo se registran en el informe
de ingeniería de Web; este apartado no declara completa la cobertura.


## Puebla · ventanas citadas en el acta 14-08-2025 · 15-11-2026

Tres nuevas referencias parciales de los arts. 11–13 distinguen capacidad hasta
3.5 t inclusive de capacidad mayor, ventana nocturna con cambio de día, permiso
previo y duración de maniobras en corredores del estacionamiento rotativo. La
comparación inclusiva no altera los comparadores estrictos de otras fuentes.
Fechas del acto, ámbitos y enlace a página 70 quedan separados de COREMUN.

Días, excepciones, permisos individuales, publicación y vigencia posterior,
corredores y geometrías continúan por comprobar. No se aplican estas ventanas
a Directions. PDF oficial añadido al monitor existente; detalle y hash en
[PUEBLA-OPERATIONS-REFERENCE.md](PUEBLA-OPERATIONS-REFERENCE.md). Continúan
15 municipios con referencia parcial y cero validaciones legales completas.


Publicación y pruebas de los dos ciclos de Puebla: Web PR #21/#22 y API
PR #17/#18. Web final b0cab98, API 7510d45; 117 pruebas Web, 28 casos de
navegador, 69 pruebas API y tres flujos con Auth local aprobados. Consulta
pública de las 12 fichas y comprobación de compatibilidad con una pestaña
anterior, sin crear rutas o vehículos alojados. Detalles, límites, despliegues
y rollback en el cierre de ENGINEERING-STATUS.md. Continúan cero municipios
con validación automática completa; siete nuevas fichas no son siete municipios.


## Puebla · corredores citados del estacionamiento · 15-11-2026

Se incorporan los 128 registros del Anexo Único del acta C26/11 (páginas 80–88),
con calles, extremos, seis etiquetas de polígono, horarios de operación y página
por registro. Se conservan dos grupos de duplicados y la discrepancia 5/6 de
San Alejandro–Ortopedia. El registro 124 mantiene sus dos páginas. Los horarios
no son ventanas de maniobras ni permisos para camiones; «No aplica» en domingo
no se convierte en autorización.

El Transitorio Primero supedita la entrada en vigor a publicación en Gaceta;
la fecha concreta y la vigencia posterior siguen pendientes. Sin sentidos ni
geometrías verificadas, los registros no afectan Directions. La consulta Web
permite filtrar calle/cruce y polígono sin fusionar registros. El importador se
detiene si cambia el hash del PDF oficial. Evidencia y reproducción en
[PUEBLA-PARKING-CORRIDORS.md](PUEBLA-PARKING-CORRIDORS.md). Permanecen 15 municipios
con referencia parcial y cero con validación legal automática completa.


## Publicación y precisión de la consulta · 16-11-2026

API PR #19 (241b966) y Web PR #23/#24 (final 6c6be58) publicaron la consulta
de los 128 registros del anexo. En producción se verificaron búsqueda por
cruces, duplicados, ausencia de resultados y recuperación del total. «29 A
Norte» selecciona sólo el registro 124, con páginas 87/88: números y sufijos
no coinciden dentro de otro número o palabra. No cambian los datos oficiales.

CI final: 70 pruebas API y RLS en Postgres desechable; 121 pruebas Web, 29
casos de navegador y tres flujos Auth locales, aprobados. Producción pública
y fixtures se documentan por separado en ENGINEERING-STATUS.md, junto con
alias y rollback. Siguen 15 municipios parciales, cero con validación legal
completa y ninguna geometría municipal nueva aplicada a Directions.


## Puebla · distinguir publicación y cambios de sanciones · 16-11-2026

Cuatro páginas oficiales corroboran la publicación histórica de RES. 2025/148
en Gaceta del 14-08-2025 y el acto posterior RES. 2025/162, publicado el
18-09-2025. El segundo cambia la fecha citada de sanciones del Polígono 5
San Alejandro–Ortopedia de 01-10 a 01-11-2025. La interfaz muestra la fecha
sustituida y el cambio con fuentes propias, sin declararlos vigentes hoy.

La publicación íntegra de las reglas/anexo, todos los actos posteriores de
2026 y la discrepancia 5/6 siguen pendientes. La evidencia se añade por separado
del snapshot del PDF y se vigilan las cuatro páginas en el monitor ya existente.
No cambia ninguna geometría, permiso o exclusión de ruteo; continúan 15 municipios
parciales y cero con validación legal completa. Véase
[PUEBLA-PUBLICATION-HISTORY.md](PUEBLA-PUBLICATION-HISTORY.md).


Publicación del ciclo de historial: API PR #20 (b21e389) y Web PR #25 (b0fdba8),
ambos READY en producción con alias comprobados. CI: 71 pruebas API/RLS,
122 pruebas Web, 30 casos de navegador y tres flujos Auth locales aprobados.
El monitor descargó las cuatro páginas nuevas y el endpoint público reflejó
el reporte técnico de las 19:12:43 UTC del 16-11-2026. La consulta real mostró
fechas, ámbitos y fuentes sin respuestas inyectadas. Evidencia, límites y
rollback en ENGINEERING-STATUS.md. La cobertura legal nacional sigue incompleta.


## Juárez · vigilancia documental de 2026 · 16-11-2026

API PR #21 añade un documento al grupo existente y un aviso de revisión, sin
añadir reglas al cálculo ni ampliar la validación legal. El intento automático
05:26:32 UTC del 17-11-2026 recibió HTTP 403; se conserva separado de la descarga
directa 200. Fuente, huella y límites:
[JUAREZ-OPERATIONS-MONITOR.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/JUAREZ-OPERATIONS-MONITOR.md).
Permanecen 15 municipios parciales y cero con validación legal completa.


## Copias compartidas y vigencia documental · 17-11-2026

Compartir puntos no transmite la polilínea ni la cobertura normativa del cálculo.
El receptor revisa las ubicaciones, conserva el orden y calcula de nuevo con los
parámetros recibidos o corregidos. Coincidir con medidas, capacidad, ejes o una
referencia municipal sigue sin acreditar circulación, permisos, horarios o acceso.
Los enlaces a Google Maps conservan sus limitaciones: no reciben restricciones
HGV ni bloquean su trazado mediante puntos guía. No se amplía la cobertura legal.

El último reporte automático de main consultado en este ciclo corresponde a
08:18:41 UTC del 17-11-2026. Juárez continúa `unavailable` por respuestas HTTP 403;
se conserva la evidencia anterior y el aviso operativo de 2026 pendiente de revisión.
Este seguimiento técnico no sustituye la comprobación de vigencia, actos posteriores
ni geometrías. Permanecen 15 municipios con referencias parciales y cero con
validación legal automática completa. No se afirma cobertura nacional completa.


## Juárez · seguimiento de la misma obra y reanudación · 17-11-2026

Se vinculan y vigilan por separado los comunicados municipales del 07-09 y
18-09-2026 sobre Juan Pablo II/Valle del Sol, junto al ya incorporado del 08-09.
El primero describe un desvío para autos chicos, excluyendo carga pesada; el
segundo menciona cierre hasta enero. Duración de obra y cierre no se equiparan:
no se calcula una fecha de reapertura ni un desvío autorizado para camiones.
Contenido, ámbito, fechas y límites de revisión en
[JUAREZ-OPERATIONS-MONITOR.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/JUAREZ-OPERATIONS-MONITOR.md).

La descarga directa de las dos URLs devolvió 403. El monitor de GitHub volvió a
intentarlas en su comprobación de 17-11-2026T15:14:30.013Z (09:14 Chihuahua) y
también registró HTTP_403, sin huellas ni descargas correctas inventadas. La tarea
terminó correctamente como comprobación técnica, no como validación de las fuentes.
Siguen 15 municipios parciales y cero con validación automática completa. No se
cambian reglas, geometrías, horarios, pesos, permisos ni exclusiones del motor.

La opción Web **Retomar desde** usa la entrega original elegida y conserva todos
los puntos posteriores y sus guías, incluso con coordenadas repetidas. No cambia
la ruta guardada ni declara entregas realizadas. Los enlaces Google siguen sujetos
a sus límites reales y recalculan: esta mejora de orden no transmite restricciones
HGV ni garantiza el trazado exacto, seguridad o autorización de circulación.


## Avance manual de entregas y límites legales · 17-11-2026

Web c69d4ce y API cd8c852 añaden avance privado por ruta/cuenta con historial y
control de conflictos. Marcar una visita como completada es una declaración del
operador: no certifica llegada, entrega, acceso autorizado o cumplimiento municipal.
Cambiar puntos u orden invalida la selección anterior sin borrar su historial.
El avance no omite puntos automáticamente ni modifica la ruta o Google Maps.

Se verificó en el endpoint público el reporte técnico de
2026-11-17T15:14:30.013Z (09:14 Chihuahua), sin obsolescencia en esta consulta.
Los cinco documentos vigilados de Juárez siguen HTTP_403/unavailable. No se
cambiaron fuentes, cron, reglas, geometrías, sentidos, horarios, pesos, permisos
o exclusiones del motor. Permanecen **15 municipios con referencias parciales y
cero con validación legal automática completa**. El catálogo, la disponibilidad
de un documento y las entregas declaradas no equivalen a cobertura legal.

Los puntos guía orientan Google pero no bloquean el trazado ni transmiten medidas
o restricciones HGV. No se afirma ruta exacta para camiones, segura/legal o cobertura
nacional completa. Las verificaciones autenticadas locales de este ciclo y sus
límites alojados/Android se detallan en ENGINEERING-STATUS.md. El seguimiento
existente permanece activo y las fuentes bloqueadas requieren corroboración
oficial sin eludir controles.


## Adjuntos oficiales de Puebla y revisión de navegación · 17-11-2026

Se localizaron y descargaron los dos PDF enlazados en RES. 2025/148: el anexo de
corredores (7 páginas, 339465 bytes) y las reglas de operación (18 páginas,
340080 bytes). API PR #25 añade ambos al monitor existente como documentos
independientes, sin reemplazar el snapshot de 128 registros extraído del acta.
URLs, fecha de consulta y SHA256 en
[PUEBLA-ATTACHMENTS-MONITOR.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/PUEBLA-ATTACHMENTS-MONITOR.md).

El intento real del monitor de 2026-11-18T01:06:33.575Z (17-11, 19:06 Chihuahua)
descargó ambos con las mismas huellas directas, status unreviewed. Falta comparar
versiones y resolver documentalmente la discrepancia 5/6, publicación íntegra,
reformas posteriores de 2026, vigencia, permisos, sentidos y geometrías. Una
primera descarga o un cambio técnico de huella no equivale a revisión legal ni
actualiza normas. Juárez permanece HTTP_403/unavailable. No se cambia programación,
cuotas ni límites del monitor. La caché pública previa de 15 minutos se distingue
del intento nuevo. Tras publicar el checkpoint, el endpoint público sirve
el reporte de 01:06:33.575Z con ambos PDF unreviewed y huellas contrastadas.
Deployment, pruebas y recuperación en ENGINEERING-STATUS.md.

Web PR #32 permite revisar pendientes y proponer dónde retomar desde el avance
guardado, únicamente mediante elección explícita. Conserva todas las visitas
posteriores incluso repetidas o marcadas fuera de orden, y advierte si se dejan
pendientes antes del inicio elegido. No modifica entregas guardadas por navegar.
La revisión utiliza puntos, sin transferir el trazado/guías del cálculo, peso,
dimensiones o permisos HGV a Google. No acredita entrega, circulación segura/legal
ni trazado exacto. **Siguen 15 municipios con referencias parciales y cero con
validación legal completa**; ninguna regla o geometría nueva se aplica al motor.


## Contraste por registro entre acta y adjunto de Puebla · 18-11-2026

Web PR #33 y API PR #26 añaden una comparación reproducible de los 128 registros
del acta C26/11, páginas 80–88, con el adjunto de RES. 2025/148, páginas 1–7.
Números, etiquetas, nombres, extremos y horarios citados coinciden después de
normalizar espacios y guiones según el método documentado. No se declara identidad
literal de archivos: 29 registros tienen diferencias tipográficas en los nombres
extraídos, conservadas en la evidencia. Se verificaron los PDF reales y sus hashes.

Cada registro mantiene sus datos y enlaces del acta, y ofrece la contraparte del
adjunto; el 124 corresponde a acta 87/88 y adjunto 7. Se preservan los 128 registros,
duplicados 10/15 y 126/128 y las ocho etiquetas 5/cuatro etiquetas 6 para San
Alejandro–Ortopedia. La ambigüedad sigue en ambos documentos y no se renumera.
Fuentes, huellas, extracción y límites en
[PUEBLA-ANNEX-COMPARISON.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/PUEBLA-ANNEX-COMPARISON.md).

La comparación sólo cubre esos campos seleccionados del anexo. No acredita
publicación íntegra/consolidación de las reglas, cadena de cambios posterior de
2026, vigencia actual, permisos, horarios de maniobras, sentidos o geometrías.
No cambia source.entryIntoForce.publicationDate del snapshot, reglas o exclusiones
del motor. **Siguen 15 municipios con referencias parciales y cero con validación
legal completa**. Google continúa sin recibir restricciones HGV ni garantizar
el trazado exacto. La igualdad de campos no constituye autorización vial.

No se modifica el monitor existente ni sus fuentes, frecuencia o límites. El
reporte observado sigue 2026-11-18T01:06:33.575Z, no obsoleto en la consulta,
con Juárez HTTP_403/unavailable. El contraste no convierte unreviewed en aprobación
legal. La búsqueda dirigida no demuestra ausencia de actos posteriores. Resultados
CI, verificación pública de filtros/enlaces, commits, deployments y rollback en
ENGINEERING-STATUS.md. Próximo paso: contrastar los artículos de maniobras de las
reglas adjuntas con el acta y sus reformas, sin inferir permisos o vigencia.


## Contraste de disposiciones de maniobras · 18-11-2026

Web PR #34 y API PR #27 añaden evidencia delimitada a los artículos 11–13 de las
reglas del estacionamiento rotativo: acta C26/11 página 70 frente a reglas adjuntas
de RES. 2025/148 página 7. Se descargaron e inspeccionaron ambos PDF y se comprobó
igualdad del texto seleccionado normalizando sólo espacios y saltos de línea.
Huellas, método reproducible, alcance y pendientes en
[PUEBLA-LOADING-COMPARISON.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/PUEBLA-LOADING-COMPARISON.md).

Las tres fichas originales conservan capacidad, horarios, permiso previo,
duración, fuente y ámbito. Añaden un contraste plegado con ambas páginas, fecha
y límites; no sustituyen los lineamientos de 2021 ni COREMUN. Hasta 3.5 t sigue
siendo inclusivo sólo en la referencia 2025, capacidad no es peso bruto y los
20+10 minutos no acreditan permiso ni eliminan otras prohibiciones. No se modifica
ninguna regla del motor ni se añade una geometría por comparar textos.

Faltan publicación íntegra/consolidación, actos posteriores de 2026, vigencia,
autoridad/permiso actual, días, sustancias, zonas, calles/sentidos y geometrías.
**Siguen 15 municipios parciales y cero con validación legal completa**. Google no
recibe restricciones HGV ni garantiza el trazado exacto. No se alteran las 128
filas ni la ambigüedad 5/6 de los anexos. El monitor mantiene fuentes/frecuencia
previas; reporte 2026-11-18T07:49:38.924Z no obsoleto al consultar, Juárez HTTP_403
y CDMX Centro NETWORK_OR_TIMEOUT. La coincidencia textual no convierte cambios
técnicos o documentos unreviewed en aprobación legal. Resultados reales, CI,
commits, producción, límites de prueba, rollback y continuación en ENGINEERING-STATUS.md.


## Vista de trazado y avance sin ampliar validación legal · 18-11-2026

Web PR #35 añade Ver trazado guardado dentro de la revisión de entregas: cálculo
completo bajo demanda, lista original con marcas manuales y rechazo de cambios
en el avance o los puntos. No recorta, recalcula, modifica Google ni certifica
entrega/circulación. Sus distancias y tiempos son estimaciones del cálculo
almacenado. Prueba funcional con Auth/REST/PostgreSQL locales reales y geometría
sintética, diferenciada de Android o sesión alojada; resultados en el cierre de
ENGINEERING-STATUS.md. No incorpora una norma o geometría legal nueva.

Pista oficial de continuación: OJP y la tabla de reformas del Reglamento de la Ley
de Transporte del Estado de Puebla citan 21/abr/2026. El PDF mantiene un nombre de
2024; la fecha de contenido no se deduce del archivo:
https://ojp.puebla.gob.mx/media/k2/attachments/Reglamento_de_la_Ley_de_Transporte_del_Estado_de_Puebla_T5_11112024_1.pdf
Su jurisdicción es estatal y no se mezcla con reglas municipales del programa de
estacionamiento. Falta revisión íntegra, publicación/cadena de cambios y evaluación
de su alcance antes de incorporar reglas o vigilancia. No se declara vigencia
por esta localización ni ausencia de otros actos. Continúan 15 municipios con
referencias parciales y cero completos, sin restricciones HGV transmitidas a Google.


## Validación de respuestas y discrepancias documentales por corroborar · 18-11-2026

API PR #28 comprueba estimaciones, trazado e índices completos/ordenados también
en rutas normales y de camión. Es integridad estructural del resultado, no
validación geográfica o normativa. No se añaden calles prohibidas, horarios,
permisos o geometrías legales y siguen 15 municipios parciales/cero completos.
Web PR #36 prueba el error con Auth/REST/PostgreSQL locales reales y ORS sintético;
no es Android ni cálculo autenticado con proveedor real en producción.

Pista oficial CDMX que requiere corroboración: Maniobras_info.pdf y la guía enero
2024 del mismo organismo describen horarios de maniobras distintos para Perímetro
A en sus lecturas indexadas. Las descargas directas actuales devolvieron 503;
no hay nuevas huellas, cotejo visual ni vigencia comprobada. No se reemplaza el
snapshot previo por inferencia o se elige el horario más permisivo. Recuperar
ambos y el aviso de Gaceta 15-12-2021, sus reformas, ámbitos y excepciones:
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Maniobras_info.pdf
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Que_Si_y_Que_NoCH_2024.pdf
El monitor existente y los datos municipales quedan intactos. No se encontró en
la búsqueda dirigida una fuente que certifique y actualice toda la geometría
legal nacional; tampoco se afirma que no pueda existir. Google sigue sin recibir
restricciones HGV o conservar obligatoriamente el trazado. Resultados reales,
commits, despliegue, rollback y punto de reanudación en ENGINEERING-STATUS.md.


## Gaceta histórica CDMX bajo seguimiento independiente · 18-11-2026

API PR #29 / merge 46b5ec160d777399bb8b3fc36ac1a778ef01d133 incorpora la
publicación histórica de Consejería citada por la guía 2024 de Perímetro A:
https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/0830deebda0a6b9e7fb44d6d2cef2ab0.pdf
La ficha Cuauhtémoc 09015 muestra el enlace y aviso fechado. El ámbito sigue
siendo sólo Perímetro A, no toda la alcaldía ni CDMX. Se conservan exactamente
las cinco reglas/ventanas/citas/tramos previos; ninguna aplica automáticamente
al trazado y no se incorpora geometría legal. Las diferencias de horarios entre
folletos y los umbrales de la lectura indexada no se resuelven por inferencia.

Los intentos directos de Gaceta, Maniobras_info.pdf, guía 2024 y regulacionPdf/1679
devolvieron HTTP 503 el 18-11-2026. No se verificaron bytes, hashes nuevos, páginas,
texto íntegro ni reformas posteriores. La lectura indexada sirve para localizar
la fuente, no para aprobar vigencia. Documento de investigación reproducible:
[CDMX-GACETA-2021-SOURCE.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/46b5ec160d777399bb8b3fc36ac1a778ef01d133/docs/CDMX-GACETA-2021-SOURCE.md).

El monitor existente ejecutó 44399465966 tras el cambio: checkedAt
2026-11-18T21:15:11.351Z. La nueva Gaceta aparece por separado como unavailable,
NETWORK_OR_TIMEOUT, sha256 y lastSuccessAt nulos. La API pública sirve ese
reporte con stale=false. No se confunde este fallo del monitor con el HTTP 503
del intento directo ni se inventa una descarga anterior correcta. El seguimiento
no aprueba reglas, no cambia horarios y conserva su periodicidad y límites.
82 pruebas/build/SQL/RLS y auditoría aprobados; los nuevos tests de documento
son simulados y no se presentan como bytes oficiales recuperados. La consulta
pública se verificó visualmente en producción. No se activan servicios de pago.

Próxima revisión: recuperar íntegramente esas fuentes, cotejar tablas/artículos,
permisos, excepciones, sentidos y reformas antes de alterar las reglas; continuar
publicación/reformas y geometrías de Puebla. Se mantienen 15 municipios con
referencias parciales y cero completos; catálogo geográfico o fuente localizada
no equivalen a cobertura legal nacional. Tampoco el enfoque visual de entregas
del Web PR #37 ni el avance manual validan circulación o transmiten HGV a Google.
Los puntos guía orientan y Google puede recalcular. Resultados y rollback en el
último cierre de ENGINEERING-STATUS.md.


## Procedencia estatal de Puebla y revisión visual de puntos · 18-11-2026

Se localizó la publicación oficial del decreto de 21/abr/2026 que modifica el
Reglamento de la Ley de Transporte del Estado de Puebla:
https://periodicooficial.puebla.gob.mx/media/k2/attachments/T_EV_21042026.pdf
OJP identifica publicación base 02/jun/2022 y reforma 21/abr/2026:
https://ojp.puebla.gob.mx/legislaciondelestado?catid=242&start=20
El buscador permitió leer el sumario y relación de artículos del PDF paginado
de 20 páginas. Es ámbito estatal; no sustituye lineamientos municipales de carga,
reglas de estacionamiento o permisos de maniobras. Faltan revisión íntegra de
transitorios, cotejo de consolidación y actos posteriores. No se incorporan reglas.

El intento directo 19-11-2026 01:59 UTC (18-11 Chihuahua) al decreto, al consolidado
OJP ya identificado y al aviso histórico CDMX devolvió 503. La lectura posterior
del final del decreto por buscador devolvió 502. No se obtuvieron bytes, hashes
nuevos ni revisión visual/íntegra; los textos indexados no se presentan como
descargas verificadas. El aviso de CDMX relaciona Gacetas de 20/sep/2019,
18/dic/2019 y 15/dic/2021, pendientes de recuperación y cotejo:
https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Aviso%20Carga%20y%20Descarga%2015122021.pdf
Los hallazgos no resuelven por sí solos las diferencias de horarios entre folletos.

Web PR #38 ofrece enlaces explícitos para revisar el punto seleccionado en Google
Maps/Street View antes de confirmar y desde el trazado guardado. Usan coordenadas
exactas y no cambian identidad de visita, avance, orden o enlaces de navegación.
La imagen puede ser antigua, cercana o no existir; no acredita un acceso de carga,
restricción actual o permiso. Sin SDK, clave o servicio de pago; sólo abre Google
al pulsar. Documentación primaria:
https://developers.google.com/maps/documentation/urls/get-started

Se conserva el catálogo y monitor anteriores: 15 municipios con referencias
parciales, cero con validación legal completa y ninguna geometría legal nueva.
Google no recibe dimensiones/peso HGV ni conserva obligatoriamente el trazado.
Pruebas, producción y rollback en el último cierre de ENGINEERING-STATUS.md.
