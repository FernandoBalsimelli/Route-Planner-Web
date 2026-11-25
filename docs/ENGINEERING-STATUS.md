# Route Planner — estado de ingeniería

Revisión: 25 de noviembre de 2026, Chihuahua. Ciclos R30–R31. El programa general continúa abierto. Los timestamps terminados en Z son UTC.

Este documento resume el estado comprobado y el punto de reanudación. El informe anterior completo se conserva **sin modificar un byte** en [ENGINEERING-HISTORY-THROUGH-R29.md](ENGINEERING-HISTORY-THROUGH-R29.md), blob Git `939c5c28d05e4242e8230409e7c029c4e29ee208`. Los resultados históricos no deben interpretarse como nuevas ejecuciones. La cobertura vigente se resume en [MEXICO-COVERAGE.md](MEXICO-COVERAGE.md); su historial íntegro está en [MEXICO-COVERAGE-HISTORY-THROUGH-R29.md](MEXICO-COVERAGE-HISTORY-THROUGH-R29.md), blob `2f7cf155f0762d9d664b8ad03def1fe00c9dba54`.

## Recursos autorizados y producción comprobada

| Recurso | Estado de este ciclo |
| --- | --- |
| GitHub Web | FernandoBalsimelli/Route-Planner-Web; Next.js / React; PR [55](https://github.com/FernandoBalsimelli/Route-Planner-Web/pull/55) fusionado |
| GitHub API | FernandoBalsimelli/Route-Planner-API; Fastify / Zod; PR [37](https://github.com/FernandoBalsimelli/Route-Planner-API/pull/37) fusionado |
| Vercel equipo | team_kYiVllaYmy38U443lcX7xymg |
| Web producción | https://route-planner-web-sand.vercel.app/ · prj_sbuLeCkEuxAwxr9N8kHTy6HkxO67 |
| API producción | https://route-planner-api.vercel.app/ · prj_FhoaKKMQcPJCNad826fBz9BlXF09 |
| Web runtime | `390a8d62336b72712539b8c240016542dbe3934c` · `dpl_6rAWNuw2QJdJqie2nWFp92qUCeiK` · READY/production, alias y SHA exactos |
| API runtime/main al comprobar | `fe2639c8a365510e774c4f7f7cd20fde17fbf598` · `dpl_CJLFjcgJHirVppLuBgiQZH7bcib4` · READY/production, alias y SHA exactos |
| Supabase | Sólo Route Planner `pakhlscjbjvwnheeyjxd`: ACTIVE_HEALTHY; consulta de estado, sin escrituras/migraciones en este ciclo |

El cierre documental posterior en main Web no requiere otro build: no cambia aplicación, workflow, pruebas ni dependencias del runtime indicado. Revisar siempre ambos main y alias antes de continuar; no asumir que main y runtime coinciden después de commits documentales o del monitor.

No hubo operaciones sobre Gestión u otros proyectos, contratación, habilitación de funciones pagadas, cambios de secretos o borrado de datos. La continuación existente se comprobó habilitada; no se creó otra ni se deshabilitó. El programa completo aún no está verificado.

## R30 — integrar las comprobaciones con la API publicada

**Problema y causa:** el job autenticado de integración Web todavía descargaba API `772a6b2ba6bc56f79c3ac3adfbbfe149e9679e07`, anterior a las correcciones recientes de localidad y referencias. El frontend público funcionaba, pero esa CI no comprobaba la combinación actual de servicios. No se presenta como una nueva función de interfaz o una regresión de red observada en producción.

**Implementado:** se fija la integración reproducible al checkpoint API publicado al iniciar, `c2b2f0921a199f3233743ad7ae595116d486b137`. Se añade un caso de origen con nueve decimales, búsqueda «Bodega Aurrera Express en Chihuahua», candidatos de otra localidad ocultos, Enter sin falsa confirmación, revisión explícita de lista/mapa, recuperación por coordenadas, confirmación y plan de camión autenticado. Comprueba preservación de ambos puntos, respuesta municipal no verificada, métricas y destino exacto en enlace Google, en vistas de 390/1280 CSS px.

La cadena navegador → proxy Next.js → API real local → Auth/REST/Postgres locales sí se ejecuta. Solamente los servicios externos de geocodificación y ORS se sustituyen por respuestas sintéticas en la infraestructura de CI; no hay `page.route` para simular la búsqueda o el proxy en ese caso. La infraestructura rechaza hosts externos inesperados y usa configuración de prueba local. No consume cuotas de ruteo real ni crea cuentas de producción.

**Archivos Web:** `.github/workflows/checks.yml`, `test/integration/ors-fixture.mjs`, `test/integration/authenticated.e2e.mjs`.

**Pruebas:** build, TypeScript y 243 unitarias locales aprobadas; `node --check` de ambos scripts y auditoría npm de producción con cero vulnerabilidades conocidas. CI [45577637113](https://github.com/FernandoBalsimelli/Route-Planner-Web/actions/runs/45577637113): build/TypeScript/243 unitarias, **53 pruebas de navegador y 14 integraciones autenticadas aprobadas**, auditoría cero. Logs de jobs `139079404410` / `139079403849` leídos; verifican checkout de c2b2f09 y aprobación del caso nuevo. No se ejecutó Chromium local; se utilizó el runner compatible de CI. La fixture no equivale a geocodificación comercial completa, cálculo ORS alojado real o navegación Android física.

**Git y publicación:** candidato `50e49faa56017ba1b74877980f302dd20f22a27a`, PR55, merge `390a8d62336b72712539b8c240016542dbe3934c`. Los tres archivos se cotejaron con el merge. Deployment Web `dpl_6rAWNuw2QJdJqie2nWFp92qUCeiK` READY; build Vercel completado en 25 s y alias exacto comprobado. R31 no cambia el código de geocodificación/ruteo/autenticación del checkpoint API usado por esta CI: cambia referencias documentales y su reporte. La pin sigue siendo c2b2f09; no se afirma que las 14 integraciones se ejecutaran con las cuatro fichas nuevas de R31.

## R31 — aviso estatal de Delicias y seguimiento de su procedencia

**Hallazgo verificado:** el [Periódico Oficial de Chihuahua n.º 67 del 20-08-2011](https://chihuahua.gob.mx/atach2/po067_2011_baja.pdf) anuncia en el sumario, página 1, el Acuerdo 126 relativo al Reglamento de Vialidad y Tránsito de Delicias y remite a un folleto anexo. Se descargaron **18,329,182 bytes, 60 páginas**, SHA-256 `a67c91838dfbc2e3374d89b72e9befe7d5882d802972c19c7c824c6b4f7c65e1`; texto e imagen de la página 1 cotejados. No se ha cotejado el texto íntegro del anexo ni su identidad con la copia municipal de 2016, reformas, acuerdos operativos o vigencia actual.

**Implementado:** cuarta ficha de Delicias con enlace propio a página 1, jurisdicción, ámbito, día de consulta, huella y tamaño. Se distingue el aviso estatal de 2011 de la copia municipal de 15-12-2016. Se conserva `copyPublishedAt` para la copia; no se inventan `publishedAt`, `effectiveFrom` ni `consolidatedThrough`. Todas las fichas conservan `legalValidityVerified=false`, `routingEnforced=false`, `geometry=null`; `timeRules`/`trunkSegments` siguen vacíos. No se activa un horario de 22:00–07:00 como permiso actual ni se crea una prohibición general de circulación a partir de condiciones de maniobra/carril.

El aviso entra al seguimiento técnico de fuentes como URL relacionada del grupo existente de Delicias, sin modificar frecuencia, presupuesto de descarga, timeouts, cuotas o servicios. Su estado técnico `unreviewed` permanece diferenciado de la revisión puntual de contenido, y no representa consolidación jurídica. Catálogo: **16 municipios con referencia parcial; cero con validación legal automática completa**.

**Archivos API:** `data/mx/national-references.json`, `data/mx/source-status.json`, `test/municipal-regulations.test.js`, [docs/DELICIAS-HISTORICAL-REFERENCE-20261125.md](https://github.com/FernandoBalsimelli/Route-Planner-API/blob/main/docs/DELICIAS-HISTORICAL-REFERENCE-20261125.md). No se almacenaron PDFs de terceros en el repositorio.

**Pruebas:** build y **98 pruebas API aprobadas**, auditoría producción cero, locales y CI [45578607834](https://github.com/FernandoBalsimelli/Route-Planner-API/actions/runs/45578607834). Logs job `139082665776` leídos: también aprueban comprobaciones Postgres de rutas/paradas, papelera/recuperación, compartición, metadatos de descarga y aislamiento RLS. La regresión nueva comprueba procedencia de las cuatro fichas, distinción aviso/copia y ausencia de efectos operativos inferidos.

**Git y despliegues:** candidato `8b27b4b9be1009a84d501891c156ac8a986b2618`, PR37, merge `bbb3be63e4025396d414b84658da09d8d4603caf`, cotejado byte a byte. Primera publicación `dpl_Ei9KpVnz3dNceeEqwJBg8ijDcQne` READY. Main avanzó independientemente a `fe2639c8a365510e774c4f7f7cd20fde17fbf598`; el diff posterior sólo contiene `data/mx/source-status.json`. Se conservó ese avance, se repitieron las 98 pruebas locales con resultado correcto y se publicó el checkpoint final `dpl_CJLFjcgJHirVppLuBgiQZH7bcib4`, READY/production, build 5 s y alias al SHA exacto. No se atribuye una nueva CI al commit automático `[skip ci]`.

## Comprobaciones reales después de publicar

Sondas públicas terminadas **2026-11-25T08:51:13.580730Z**:

- API y proxy Web: health200; Delicias200/cuatro fichas, huella/enlace de aviso correctos, sin reglas o geometrías ejecutables; catálogo16 parciales/0 completos.
- Búsqueda natural200/`LOCALITY_NOT_VERIFIED`, cinco candidatos sin localidad corroborada; no se atribuyen a Chihuahua por el texto comercial.
- Coordenadas de nueve decimales preservadas; Plus Code completo `75XMRW22+22` y compuesto `RW22+22 Chihuahua`200. Son ejemplos independientes: el compuesto recupera `75WMRW22+22`, no se afirma que ambos representen el mismo punto.
- Validación de0/2/48 paradas intermedias200 y49→400. Son pruebas de entradas; no cálculos autenticados ORS reales de esos recorridos. No se restaura el límite artificial de ocho: el proveedor permite50 puntos totales en el cálculo actual.
- Plan sin sesión401/`AUTH_REQUIRED`; CORS autorizado204/Allow-Origin correcto, ajeno404/sin permiso. HTML inicial200 con campos bloqueados antes de hidratación y ayuda noscript.

Navegador público del despliegue Web390a8d6/API final: origen por coordenadas con propuesta y confirmación explícita; frase natural en destino con aviso, cinco coincidencias inicialmente ocultas, Enter sin propuesta/confirmación y enlace Google que conserva la consulta literal. Guía: entidad inicial vacía, orden alfabético, Chihuahua/Delicias, cuatro fichas con ámbitos, fecha25/11/2026, copia histórica y enlace nuevo al PO#page=1. Sin desbordamiento horizontal a1363 CSS px. Captura JPEG real1348x926 inspeccionada y verificada, sin edición. Los fallos iniciales de localizador de la sonda manual se corrigieron leyendo los controles reales (`text`/botón); no fueron errores de la aplicación. No se abrieron Google ni se guardaron rutas/cuentas/favoritos. Los ensayos móviles automatizados son Chromium con viewport móvil; **Android físico sigue pendiente**.

Consultas Vercel posteriores a ambas publicaciones: ventana30min, error/fatal, agrupadas por requestPath, sin grupos en ambos proyectos. Es observación acotada, no garantía de ausencia de errores futuros ni monitoreo permanente.

## Estado técnico de fuentes, separado de vigencia

Checker local **2026-11-25T08:38:36.252Z**:8 grupos/30 documentos,28 descargados y dosHTTP503 (Consejería CDMX portal_old y OJP Puebla2396). El checkpoint independiente posterior **08:44:48.976Z**, conservado en main y producción, obtuvo **21/30 descargas**; cuatro`NETWORK_OR_TIMEOUT` en CDMX y cinco`HTTP_403` en Juárez. No se infiere causa del bloqueo ni se eluden respuestas; se conserva la evidencia previa correcta.

API/proxy sirven el reporte posterior con `stale=false`, `overdue=false`, `reportRefresh.status=available`; recuperación observada **08:49:52.153Z**. Esa recuperación no vuelve a descargar los30 documentos ni acredita vigencia. `checkedAt` documental y fecha de lectura del reporte son hechos distintos. Los estados `changed`/`unreviewed` requieren revisión; un hash cambiado puede corresponder al portal, no a una reforma.

## Recuperación

| Objetivo | Commit / deployment preservado |
| --- | --- |
| Web anterior al ciclo de integración | `5902f99ba27f6b1fd3702adaca292694f9702488` / `dpl_Aye1LCSoowDCykqNybAk5kX82n6M` |
| API anterior a añadir aviso estatal | `c2b2f0921a199f3233743ad7ae595116d486b137` / `dpl_27SXS2YBBMS6SbuFniohtztkjZ1x` |
| API R31 anterior al checkpoint automático | `bbb3be63e4025396d414b84658da09d8d4603caf` / `dpl_Ei9KpVnz3dNceeEqwJBg8ijDcQne` |

Restaurar únicamente el deployment de su proyecto autorizado o revertir mediante un commit nuevo. No se ejecutó rollback. No hay cambios de datos que revertir. Las ramas de PR55/37 y todo el historial se conservan. Los archivos históricos de este cierre reutilizan exactamente los blobs previos; la compresión del informe activo no elimina evidencia.

## Estado del programa y siguiente trabajo

| Prioridad | Estado actual | Próximo paso verificable |
| --- | --- | --- |
| P0 red/búsqueda/confirmación | Reparaciones previas conservadas; sondas públicas correctas; integración actualizada | Reproducir cualquier fallo concreto nuevo; mantener pruebas actuales y errores específicos |
| P1 direcciones y sucursales | GPS, mapa, coordenadas/Plus Codes, revisión, recientes/favoritos y sesgo de cercanía implementados; catálogo Express incompleto | Evaluar datos comerciales gratuitos con licencia compatible y confirmar accesos/sucursales; no sustituir Express por otra marca/localidad |
| P1 vehículos/manifiesto | Perfiles y selección; OCR local/texto y corroboración secuencial disponibles; no se confía automáticamente en OCR | Ensayar permisos/cámara y manifiestos reales autorizados en Android físico; tablas/PDF complejos siguen parciales |
| P1 rutas y navegación | Orden manual, guardado/papelera recuperable, enlaces compartidos/exportaciones y Google por tramos implementados en ciclos anteriores | Verificar cuenta alojada y cálculo ORS real autenticado sin crear datos o aceptar condiciones de cuenta sin autorización específica; Android físico pendiente |
| P1 camiones/normativa | ORS HGV aplica sólo sus datos;16 municipios parciales/0 completos; sin geometrías legales ejecutables nuevas | Localizar/cotejar anexo íntegro de Delicias, reformas y acuerdos actuales; jurisdicción, vehículo/carga, horarios/zona, permisos, tramos y sentidos antes de aplicar una exclusión |
| P2 mantenibilidad | Informe activo resumido, historia íntegra preservada, CI autenticada de14 casos | Seguir ciclos pequeños con main fresco, CI, producción y reporte; investigar fuentes inaccesibles sin eludir controles |

Google recibe puntos y preferencias compatibles; **no recibe dimensiones/pesos HGV, permisos municipales ni una polilínea bloqueada**. Los puntos guía y tramos consecutivos no aseguran conservar el trazado exacto. La navegación interna conserva la polilínea calculada y requiere pruebas de campo; ninguna opción certifica legalidad nacional. No declarar finalizado el prompt maestro, cobertura municipal completa o una ruta segura/legal sin evidencia suficiente.
