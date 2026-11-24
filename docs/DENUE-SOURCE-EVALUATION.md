# Evaluación de DENUE para sucursales · 23-11-2026

Estado: investigación técnica comprobada; **sin índice incorporado al runtime**.
Fuente: INEGI, Directorio Estadístico Nacional de Unidades Económicas (DENUE)
05/2026. No acredita vigencia comercial, formato Express actual o acceso de carga.

## Descarga obtenida mediante el flujo público

Se leyó https://www.inegi.org.mx/app/descarga/ y su JavaScript público:
sources/js/desMasiva-cc.min.js?v=5.0.2. La función IniciarDescargaMasivaApp
publica los filtros en el endpoint de listado de descarga. Se solicitó sólo
DENUE/Chihuahua (tipoInformacion=6, areaGeografica=8; demás filtros 0,
datosAbiertos=3, ingles=0). Se recibió un ZIP temporal del flujo oficial,
HTTP 200, 602403 bytes. Se inspeccionó únicamente XML y leeme; **no se ejecutó
DescargaMasivaApp.exe**. No se utilizó la descarga de unidades seleccionadas que
requiere reCAPTCHA ni una clave de API ajena.

El XML incluye el URL oficial actual de Chihuahua:
https://www.inegi.org.mx/contenidos/masiva/denue/denue_08_csv.zip

El 23-11 Chihuahua / 24-11 UTC se descargó por ese URL, HTTP 200.
No se descargaron otras entidades o ediciones históricas. Huellas SHA-256:

| Elemento | Bytes | Huella |
| --- | ---: | --- |
| ZIP Chihuahua | 13749250 | d946462adfa8fc4a5697e0f99ccf42a86bca88ee77bf1c14b5c24ba612c72e05 |
| conjunto_de_datos/denue_inegi_08_.csv | 76680193 | bd889a169d5ed4a7f4938aea2cf752e93b12af5ffc61188c61cec6ce2f988a1f |
| metadatos/metadatos_denue.txt | 1210 | bf05c821f1562fdbebb8ae1d38e091bb8e5b72d12fb671117fb256b819cc7894 |
| diccionario_de_datos/denue_diccionario_de_datos.csv | 10159 | 53619afc3424522a2bb1587adc34b45b9660728df2d2f49326a4299362f95c0e |

CSV leído con csv.DictReader de Python, codificación CP1252; metadatos UTF-8 BOM.
142295 filas. Filtro de evaluación: nom_estab contiene aurrer sin distinguir
mayúsculas. Resultado: ocho registros, uno con EXPRESS en el nombre: id 12328100,
BODEGA AURRERA EXPRESS CIUDAD CUAUHTEMOC, municipio Cuauhtémoc, punto
28.40177462, -106.89418516. Su clasificación publicada es 464111 (Farmacias sin minisúper); hay que
corroborar esta aparente discrepancia antes de usarla para identificar una sucursal.
No se infiere identidad por razón social ni se rebautizan otros supermercados.

Los metadatos identifican MEX-INEGI.EEC2.05-DENUE-2026, edición 05_2026,
Modified/Temporal 2026-05-20 y periodicidad ANUAL. fecha_alta es alta en
DENUE, no fecha de verificación comercial o de precisión de coordenadas.
No hay coincidencia Express en Chihuahua capital mediante ese filtro;
esto no demuestra que no existan tiendas ni completa cobertura.

## Términos y correcciones

Se leyó el documento oficial:
https://www.inegi.org.mx/contenidos/inegi/doc/terminos_info.pdf
HTTP 200, 69195 bytes, SHA-256
8900206bbe4a2b8cf461e7e7ff111564cf4de2f863c7cd00b99ac19a4b925d62.
Permite extraer/adaptar y usar comercialmente, con atribución, preservación
de metadatos y aviso de transformaciones; no debe sugerirse aval de INEGI.
No se contrató servicio ni creó cuenta.

También se descargó la nota de corrección, HTTP 200, cuatro páginas, 193164 bytes:
https://www.inegi.org.mx/app/mapa/denue/nota.pdf
SHA-256 2537e1dac93cf24b34d8df77ec746f6011d804b6fb70a66c7721c66bbe92d448.
El texto actual menciona 13 registros y cambios de 29-05 y 01-07-2026,
limitados a nombre/razón social. Esto resuelve la diferencia entre snippets
anteriores para **esta copia**, sin certificar qué cambios incluye cada ZIP
ni atribuir precisión de acceso a las coordenadas.

## Punto de reanudación

1. Diseñar ingestión reproducible que conserve id/CLEE, dirección y coordenadas
originales, edición, URL, hashes, diccionario y metadatos. No conservar contactos
innecesarios. Validar tamaños, codificación, esquema y coordenadas.
2. Corroborar nombres/formato, clasificación y duplicados; no completar Express
por inferencia. Contrastar cobertura en otras ciudades y una fuente del operador.
3. Antes de integrar, probar búsqueda por ciudad/calle/número, prioridad cercana,
deduplicación conservadora y fallback. Mostrar atribución y fecha; no sustituir
silenciosamente las coordenadas guardadas de clientes.
4. Obtener evidencia del acceso de entrega por separado. Una ubicación estadística
no acredita entrada de camión, permiso municipal ni ruta legal.

No hay nuevo endpoint, proveedor runtime, cron, regla jurídica o geometría.
El índice público de Express sigue pendiente y se conserva NO_NEARBY_MATCHES.

Observaciones extraídas y metadatos originales conservados en
[evidence/denue-chihuahua-202605-observations.json](evidence/denue-chihuahua-202605-observations.json).
Las ocho filas son evidencia de evaluación, no un catálogo de sucursales verificadas.

## Contraste posterior · 24-11-2026

Se documentaron directorios candidatos del operador y sus límites de alcance en
[STORE-DIRECTORY-RESEARCH-20261124.md](STORE-DIRECTORY-RESEARCH-20261124.md).
Siguen pendientes cotejo de identidad/acceso y condiciones de reutilización;
no se incorpora un catálogo runtime ni se sustituye la evidencia DENUE anterior.
