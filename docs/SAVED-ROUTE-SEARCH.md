# Buscar y recuperar rutas guardadas

Revisión: 16-11-2026. Sólo Web; sin migraciones ni cambios de permisos.

«Mis rutas» permite buscar por fragmentos del nombre, sin distinguir mayúsculas
y minúsculas según la comparación de PostgreSQL. El filtro se aplica en Supabase
antes del límite de resultados; puede encontrar una ruta que no esté entre las
primeras veinte. Al cambiar el texto se reinicia la cantidad mostrada. «Cargar
más rutas» conserva el filtro y la ordenación por fecha e identificador.
No se afirma búsqueda por destinos o por las direcciones intermedias.

La misma búsqueda se conserva al abrir la papelera. Se puede recuperar una ruta
y volver a verla entre las activas; eliminar continúa siendo archivado reversible,
sin borrar puntos ni geometría. Limpiar la búsqueda vuelve al listado inicial.

Cada consulta mantiene owner_id explícito y las políticas RLS existentes. Sólo
solicita los campos resumidos: geometría e indicaciones se cargan al abrir la ruta.
No se descarga toda la colección para filtrarla en el dispositivo, ni se hace
una consulta de conteo global en cada pulsación. No se añade un índice o servicio
de búsqueda ni se atribuyen cifras de rendimiento sin medirlas.

Se usa imatch con todos los metacaracteres de expresión regular escapados. Así,
%, _, *, paréntesis, corchetes, comillas y barras forman parte del nombre, en vez
de convertirse en comodines o expresiones. No se concatena SQL ni una expresión
OR de PostgREST. La columna y el operador son fijos; el cliente codifica el valor.
La entrada está limitada a 120 caracteres y usa debounce de 300 ms.

Editar, cambiar de vista/cuenta o desmontar cancela la consulta anterior. Las
respuestas tardías se descartan aunque ignoren abort. El campo sigue editable
mientras llega una consulta; cargar/eliminar/recuperar esperan a que termine.
Un temporizador de 30 s libera el listado si la petición queda detenida. Los
fallos tienen reintento y no se presentan como una colección vacía.

La paginación conserva el modelo existente de ampliar el límite solicitado y el
máximo de respuesta configurado en Supabase; este ciclo no implementa cursores
ni garantiza colecciones arbitrariamente grandes. La búsqueda se aplica antes
de ese máximo. No cambia el límite de puntos de una ruta ni los enlaces Google.

La lista se consulta al entrar en «Mis rutas» y se actualiza al volver. No se
precarga mientras está oculta; salir invalida cargas de detalles/paradas pendientes,
sin reabrir el planificador por una respuesta tardía.

Pruebas: siete casos de componente/helper con transporte controlado; el plazo
se acorta sólo en el caso unitario. Una regresión adicional cubre salir durante la restauración. La integración usa
Auth/REST/Postgres locales
reales con RLS activa y dos cuentas, nombres con signos, una ruta fuera de la
primera página, papelera/recuperación y vistas 390/1280 px. No es navegación
Android física ni acceso autenticado a datos de producción. Resultados exactos,
commits, despliegue, límites y rollback en ENGINEERING-STATUS.md.

Referencias técnicas primarias consultadas el 16-11-2026:
https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators
https://supabase.com/docs/reference/javascript/filter
