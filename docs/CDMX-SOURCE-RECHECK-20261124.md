# CDMX · comprobación documental del 24-11-2026

Alcance: evidencia técnica y revisión seleccionada de fuentes ya registradas.
No se modifica ninguna regla, umbral, geometría, permiso o cobertura del motor.
Se conserva la distinción entre Perímetro A, alcaldía Cuauhtémoc y toda CDMX.

## Descargas comprobadas

- Guía oficial de la Autoridad del Centro Histórico, enero de 2024:
  https://www.autoridadcentrohistorico.cdmx.gob.mx/storage/app/media/Que_Si_y_Que_NoCH_2024.pdf
  HTTP 200, 541032 bytes, 12 páginas, SHA-256
  ce23f9fd52cacb2c8693aca7d6ce08857da323222023f9b2792ca65f33aa283d.
  Se extrajo texto y se revisaron visualmente las páginas PDF 2–3.
- Ficha del registro:
  https://regulaciones.cdmx.gob.mx/mejora/public/regulacionPdf/1679
  Dos descargas directas HTTP 200, una página, 258303 bytes cada una.
  SHA-256 primera: eb979cc68d8b1f36aba2d8c205fff72fb03c51853895f9cde0bcbe10e495c920.
  SHA-256 segunda: 32475dc25c488902bbab6bc36c2fb58a149f5eb212e02142cfaf5382e2c9558b.
  Las extracciones con pdftotext -layout son idénticas, 1875 bytes:
  1e00498a81d4f143946d80607fd00cd416829f23bbb54fbca1657c8a2f509a5a.
  Los metadatos CreationDate/ModDate difieren (01:05:47 y 01:06:58 CST).
  Son hashes distintos con el mismo texto extraído; no demuestra una reforma,
  ni que todos los componentes internos del PDF sean iguales.
- El checker previo de las 07:02:52.496Z observó otra huella de la ficha:
  1042b243f0680cccac5d1e522a833e965efd162b6892e0c392ae8510dc64b945.
  Ese intento conserva su huella real: no se reemplaza por las descargas posteriores.

## Distinciones que siguen pendientes

La guía separa circulación y maniobras de carga/descarga, con condiciones
vehiculares, excepciones, permisos y tramos principales específicos. Un horario
de circulación no equivale a autorización para descargar. Su pie remite a la
Gaceta del 15-12-2021. No se infiere que las toneladas del folleto equivalgan
al campo de peso bruto de un perfil, ni se geocodifican nombres de vías como
polígonos legales.

La ficha generada el día de consulta identifica publicación/inicio el
20-09-2019 y folio I-01-1679-2024. Su fecha de generación en 2026 no cambia
esa fecha jurídica ni verifica modificaciones posteriores. Enlaza la Gaceta:
https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/0ae3f94a9e7087db1246bc1c7c581d18.pdf
El intento directo devolvió HTTP 503; no se obtuvieron bytes o huella del acto.
Es una pista de 2019, no reemplazo demostrado de la Gaceta de 2021 registrada.

La Gaceta 15-12-2021 que ya vigila el monitor continúa HTTP 503:
https://data.consejeria.cdmx.gob.mx/portal_old/uploads/gacetas/0830deebda0a6b9e7fb44d6d2cef2ab0.pdf

## Continuación

Recuperar y cotejar ambos actos, transitorios y modificaciones; delimitar
ámbito, naturaleza del peso, excepciones y permisos. Validar tramos/sentidos y
geometrías por separado antes de convertirlos en restricciones ejecutables.
El monitor conserva hashes binarios como señales técnicas; una descarga
reciente o una ficha recién generada no certifica vigencia. Este ciclo no cambia
su algoritmo, cron, registro de URLs o estados de revisión jurídica.
