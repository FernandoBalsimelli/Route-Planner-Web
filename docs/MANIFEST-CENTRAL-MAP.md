# Corroborar entregas del manifiesto en el mapa central

Revisión: 15 de noviembre de 2026. Exclusivamente Route Planner.

Las sugerencias de la entrega activa aparecen como S1, S2… en el mismo mapa del
planificador, conservando el orden del buscador y su referencia de proximidad.
El operador abre un marcador, consulta dirección/distancia y avisos de número
aproximado o acceso de descarga, y pulsa «Usar como Entrega N del manifiesto».
Se confirma esa fila y se avanza a la siguiente. Tras la última, el foco vuelve
al botón de importación para no recorrer otra vez una lista larga. Se mantiene la selección desde
la lista y el selector de punto individual existentes.

Los puntos siguen en revisión: no cambian origen, destino ni paradas hasta
«Añadir entregas confirmadas». Un recorrido calculado permanece con sus métricas
y geometría durante la revisión; importar sí invalida el resultado para calcular
con las nuevas entregas. Las sugerencias pueden verse sobre la ruta anterior.
La navegación GPS activa se detiene al mostrar esta revisión y no se reinicia
automáticamente al cerrarla.

## Integridad y límites

- Cada lote del mapa tiene identificador propio, fila y consulta de origen.
- Sólo se acepta un punto del lote vigente para la entrega activa e incluida.
- Editar, excluir, cambiar de fila/referencia/sección, cerrar o preparar otro
  manifiesto retira el lote; un evento anterior no confirma otra entrega.
- Se usa el objeto original del proveedor, conservando coordenadas, Plus Code
  y avisos. La ubicación confirmada por el operador no certifica una sucursal
  exacta ni un acceso apto para camiones.
- Se reutilizan las sugerencias existentes, debounce y abortado de búsquedas.
  No hay búsqueda masiva adicional, servicio nuevo ni carga del documento al servidor.
- Los pedidos repetidos y el máximo de 48 intermedias permanecen intactos.

Las pruebas distinguen el modelo puro de selección, el componente con eventos
atrasados y el navegador móvil con mapa/lista/importación. El caso con recorrido
previo verifica conservación y detención del GPS usando proveedor/posición
controlados. Esas pruebas no son navegación Android física ni ruteo real de
producción. Los resultados, commit, despliegue y rollback están en el cierre
correspondiente de ENGINEERING-STATUS.md.

Este cambio no amplía la normativa mexicana: siguen 15 municipios con referencia
parcial y ninguno con validación legal automática completa. No altera el trazado
de Google Maps ni transmite restricciones HGV a ese navegador.
