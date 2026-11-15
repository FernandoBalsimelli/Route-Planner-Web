# Manifiestos: conservar pedidos y revisar puntos próximos

Revisión: 15 de noviembre de 2026. Exclusivamente Route Planner.

## Problema y corrección

El parser usaba un `Set` después de agrupar las direcciones. Eliminaba sin aviso
las entradas de texto idéntico: dos pedidos para una dirección se convertían en
una sola entrega. Ahora conserva multiplicidad y orden, también en foto/PDF una
vez extraído su texto. El operador puede excluir filas de forma explícita.

La revisión mantiene el texto de origen para avisar de filas repetidas incluso
cuando la confirmación sustituye la etiqueta por la dirección del proveedor.
Las filas excluidas siguen visibles y numeradas como en el manifiesto preparado.

## Corroboración

- Cada entrega conserva la selección y confirmación explícitas existentes.
- Los puntos confirmados e incluidos a **10 m o menos en línea recta** generan
  un aviso con números de entrega y un acceso para volver a revisar el punto.
- Nombres iguales en coordenadas distantes no disparan el aviso espacial.
- Editar un punto invalida su confirmación; excluirlo retira su comparación.
- Ni un texto repetido ni puntos cercanos eliminan, fusionan o bloquean pedidos.
  Pueden ser varias órdenes válidas o accesos distintos de un mismo predio.

La proximidad se calcula localmente, sin peticiones adicionales ni persistencia
del documento. No verifica entrada de descarga, sucursal real o accesibilidad
para camiones. Un resultado geocodificado sigue requiriendo corroboración.

## Límites y verificación

Se conservan los límites existentes del lector (30,000 caracteres, propuesta de
dirección acotada) y del proveedor: 48 paradas intermedias más origen y destino.
Las filas adicionales permanecen para revisión; no se restaura un límite de ocho.
La pantalla resume cinco grupos de texto y seis pares cercanos, mostrando cuántos
faltan; esos límites visuales no recortan las entregas ni las comprobaciones.

Las pruebas incluyen pedidos repetidos con orden original, más de ocho entregas,
exclusión y edición, puntos inválidos, umbral de 10 m sin redondeo, antimeridiano,
flujo de componente y flujo móvil de importación de dos pedidos coincidentes.
Los proveedores del caso móvil son controlados; no equivale a escanear un
manifiesto de producción ni a una prueba Android física.
