# Centro cartográfico al cambiar de sección

Revisión: 15 de noviembre de 2026. Exclusivamente Route Planner.

Estado: corrección en PR #19, pendiente de CI y publicación. No declarar verificada
hasta completar navegador y producción.

Durante la comprobación visual de producción apareció un desplazamiento del
mapa al abrir el planificador desde una sección donde su contenedor estaba
oculto. El `ResizeObserver` actualizaba Leaflet con `pan: false`: esa opción
omite la compensación entre el tamaño anterior y el nuevo. No era una coordenada
incorrecta devuelta por geocodificación.

Se restaura `pan: true` con animación desactivada. Leaflet compensa el cambio de
píxeles conservando el centro geográfico; no se recalculan rutas ni se fuerza de
nuevo el encuadre de todas las paradas. El operador conserva su centro actual.

La regresión de navegador confirma un origen, comprueba el marcador respecto
al centro del mapa, cambia de sección, redimensiona mientras el mapa está oculto
y regresa. Cubre escritorio y orientación móvil mediante tamaños de viewport;
no representa una prueba Android física. Las comprobaciones usan cajas DOM
visibles, sin leer estado privado de Leaflet.

Referencia técnica: [Leaflet 1.9.4 · invalidateSize](https://leafletjs.com/reference-1.9.4.html#map-invalidatesize).
Se contrastó además el método de la dependencia 1.9.4 fijada en el proyecto.
Sin dependencias, migraciones, peticiones de geocodificación ni servicios nuevos.
