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
