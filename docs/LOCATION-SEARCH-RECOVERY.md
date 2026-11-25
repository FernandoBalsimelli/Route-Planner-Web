# Recuperación de búsquedas de ubicaciones

Revisión: 24-11-2026 (historial original: 16-11-2026). Sólo Web; sin cambios de proveedor, API o datos alojados.

## Causa y comportamiento

LocationInput tenía debounce y cancelación al editar, pero no un límite de espera
en el navegador. El proxy espera hasta 25 segundos para ubicaciones, sin acotar
una conexión cliente-proxy que no llegue a completarse. Se añade un plazo de
30 segundos desde el inicio de cada petición, incluyendo lectura del cuerpo.
No cambia el presupuesto del cálculo de rutas, que es independiente.

lib/location-search.ts distingue fallo de transporte, tiempo agotado, rechazo HTTP
y respuesta JSON/contrato inválido. Conserva código y mensaje del proveedor y
estado HTTP cuando existen. Una lista vacía válida sigue significando que no
hubo coincidencias; un cuerpo inválido no se presenta como una búsqueda vacía.
No se registran consultas/direcciones ni se muestran detalles crudos del transporte.

El plazo cancela fetch y permite terminar la espera aun si la implementación
no respeta abort. Editar, cambiar referencia, abrir mapa/favoritos o desmontar
cancela la petición anterior sin mostrarla como un fallo de tiempo.
Cada petición libera temporizador y listener; las respuestas tardías se descartan.

Un error muestra «Reintentar búsqueda» para ese campo. El reintento conserva el
texto y su referencia de cercanía, devuelve el foco al campo para teclado/mapa,
cierra selectores alternativos, conserva debounce y necesita acción del usuario:
no hay bucles de reintento ni peticiones adicionales automáticas por un fallo.
Elegir una sugerencia sigue requiriendo corroboración/confirmación explícita.
También se puede continuar escribiendo o elegir sobre el mapa.

## Verificación y límites

Las pruebas de helper cubren red, HTTP/proveedor, JSON, lista vacía, fetch/cuerpo
bloqueados y cancelación. Las pruebas de componente comprueban texto conservado,
reintento y confirmación. Los casos de navegador móvil/escritorio recorren fallo
de red → rechazo 503 → JSON inválido → recuperación; otro caso móvil espera el
plazo real de 30 segundos y reintenta. Se usan proveedores y red controlados.

El entorno local no estaba disponible en este ciclo: las ejecuciones y resultados
concretos de GitHub CI, publicación, alias, logs y sondas públicas deben constar
en el último cierre de ENGINEERING-STATUS.md. No se declara navegación Android
física ni cálculo autenticado real de producción a partir de estas pruebas.

No cambian GPS, OCR, cuotas, límites de entregas, orden, normativa ni enlaces Google.
La cobertura municipal sigue incompleta y los puntos guía no fijan rutas HGV.

Referencias técnicas consultadas el 16-11-2026:
https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch


## Descartar candidatos también cancela la búsqueda · 24-11-2026

En el campo de dirección, Escape retira la lista y S1/S2… del mapa, cancela el debounce de 320 ms y aborta
la solicitud en curso. Una respuesta tardía no repone el punto descartado. Se
conservan texto, entregas y puntos ya confirmados; Escape no borra una ruta.
Para buscar otra vez, pulsa Enter, vuelve a enfocar el campo o edita el texto.

Abrir favoritos o el selector, comenzar GPS y confirmar una sugerencia también
retiran los candidatos públicos anteriores. El selector conserva la propuesta
como centro de revisión antes de vaciar la lista; elegir el centro y confirmar
siguen siendo acciones explícitas. Un GPS denegado conserva el origen escrito,
sin confirmar el candidato antiguo ni reactivar la consulta al cerrar el mapa.
La pausa afecta al buscador, no cancela una selección externa o su protección
frente a una lectura GPS tardía.

El componente compartido conserva coordenadas/Plus Codes y selección explícita;
no incorpora negocios públicos, nuevas normas, límites de entregas o garantías
HGV. Regresiones y publicación exacta en el último ciclo de ENGINEERING-STATUS.


## Entrada durante la carga inicial · 24-11-2026

Se confirmó el caso pendiente: con scripts retenidos, el campo del HTML inicial
aceptaba teclado real antes de conectar React, y después quedaba vacío.
La regresión previa conservó 48 casos aprobados y falló únicamente por perder
28.635300123,-106.088900456 al arrancar. No era sólo un llenado demasiado temprano
de la comprobación anterior; también se reprodujo mediante SSR/hidratación local.

Los controles de cada ubicación se sirven en un fieldset nativo deshabilitado,
con aviso de preparación y ayuda si JavaScript está desactivado. Se habilitan al
conectar los manejadores; no se espera al mapa, geocodificador, cuenta o red.
Se distinguen snapshots de servidor/cliente: los campos que se crean después
dentro de la app están listos inmediatamente y conservan el enfoque automático
de revisión del manifiesto. Una espera por useEffect en cada montaje afectaba
ese enfoque; las pruebas lo detectaron y se corrigió antes de publicar.

No se recupera ni confirma un texto por adivinar la intención: se evita aceptar
entrada cuando todavía no se puede procesar. Al estar listo, se conserva el
borrador y la precisión; elegir sugerencia y confirmar siguen siendo explícitos.
No cambian cuotas, proveedores, límites de entregas, datos de cuenta o normativa.

Se añadieron pruebas de servidor/hidratación, scripts iniciales lentos a
390/1280 px con teclado real y navegación sin JavaScript. Los resultados concretos,
commit, producción, alias, logs y rollback constan en ENGINEERING-STATUS.
Esto no es navegación Android física ni cálculo ORS autenticado en producción.
Referencia técnica: https://react.dev/reference/react/useSyncExternalStore


## Búsqueda manual en Maps y retorno para corroborar · 24-11-2026

El buscador ahora ofrece «Buscar esta ubicación en Google Maps» cuando falla,
no encuentra puntos o sólo hay coincidencias lejanas. Con resultados normales
la alternativa se puede abrir desde «¿No es la sucursal? Buscar por otra vía».
Es necesaria también cuando un HTTP200 omite sucursales o devuelve otra ciudad:
se observó públicamente esa respuesta para Express en Chihuahua. No se presenta
la ayuda como una corrección del índice ni de la validación geográfica del proveedor.

La URL usa Maps Search, api=1 y query codificada con el texto literal y ciudad;
no añade coordenadas de referencia ni promete sesgo espacial no documentado.
No hay consulta Google previa al clic, SDK, clave, importación automática o coste
añadido. Rechaza borradores menores de dos caracteres, mayores de 180, controles
y texto con URL. El dominio es fijo; nueva pestaña con noopener/noreferrer.
La ayuda se retira mientras carga, en favoritos/mapa o tras proponer/elegir punto.
El resumen y el enlace conservan áreas táctiles de al menos 44 px.

El operador comprueba nombre/ciudad en Maps y vuelve a pegar coordenadas o
Plus Code completo/con ciudad. Elegir sugerencia y confirmar siguen siendo pasos
explícitos; también debe corroborar el acceso de entrega. El enlace no transmite
restricciones HGV, no acredita acceso de camión y no fija una ruta de Google.
Los fallos del proveedor conservan código y mensaje propios más su reintento.

Build, TypeScript, cinco regresiones nuevas de helper/componente y dos casos
nuevos de navegador a 390/1280 px; conteos finales, CI, despliegue y comprobación
pública en ENGINEERING-STATUS. Proveedores/GPS de CI controlados; no se ejecutó
una búsqueda dentro de Google ni navegación Android física por verificar la URL.
Referencia primaria consultada: https://developers.google.com/maps/documentation/urls/get-started


## Coincidencias sin localidad corroborada · 24-11-2026

Para búsquedas Aurrera/Express/Mi Bodega con localidad separada por coma o punto
y coma, la API prioriza ese calificador usando su metadata locality. Si los
candidatos no lo corroboran (también cuando falta ese dato), devuelve
LOCALITY_NOT_VERIFIED. Un nombre de ciudad en label o en el negocio no basta.
Normalización de tildes, Ciudad [de] y CDMX; otras formas y direcciones numeradas,
estado/país quedan fuera de este reconocimiento acotado. No acredita identidad
actual, entrada de descarga, precisión de la cartografía o permiso de camión.

Web muestra el motivo y la búsqueda manual en Maps, y oculta lista/marcadores.
«Ver coincidencias sin localidad corroborada» permite revisarlas y volver a
ocultarlas; Enter no elige resultados ocultos ni el selector usa su punto como
centro inicial. Editar/cancelar limpia el estado. Elegir y confirmar permanecen
explícitos. Se mantienen NO_NEARBY_MATCHES y compatibilidad con una API anterior.

Pruebas nuevas: comparación estricta con locality y localidad ausente, ciudad en
nombre comercial/estado, alias, selección correcta, caché sin consultas adicionales;
componente y navegador a 390/1280 px para revelación/ocultación, teclado, mapa,
texto literal y confirmación. Ver conteos, CI, despliegue y comprobaciones HTTP
reales en ENGINEERING-STATUS. Sin entorno local/navegador manual en esta segunda
etapa; no se presenta el ensayo público de R26 como comprobación manual del aviso
nuevo, ni los proveedores controlados como navegación Android o cálculo ORS real.


## Forma natural «en localidad» · 25-11-2026

API #35 interpreta también nombre Aurrera/Express/Mi Bodega en localidad, usando
el calificador antes de una entidad separada al final. Mantiene el texto enviado
al proveedor y al enlace Maps; no añade búsquedas ni cuotas. Estado/país y texto
numerado conservan sus exclusiones. La localidad del proveedor debe coincidir;
si falta o no coincide se mantiene LOCALITY_NOT_VERIFIED y revisión explícita.
No cubre toda dirección libre ni acredita identidad, acceso o permiso HGV.
La variante natural reprodujo cinco coincidencias de otras entidades sin aviso;
tras publicar, navegador y API/proxy comprobaron aviso y candidatos ocultos.
Resultados concretos, CI, límites y rollback en ENGINEERING-STATUS.
