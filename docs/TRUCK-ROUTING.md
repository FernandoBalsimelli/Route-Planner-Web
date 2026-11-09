# Camiones: alcance real de Route Planner

Revisión: 9 de noviembre de 2026. Esta guía describe el código actual; no es una
certificación de una ruta concreta. La sección «Guía camión» lo explica al usuario.

## Solicitud al proveedor

`Route-Planner-API/index.js` envía `driving-hgv`, `vehicle_type: hgv` y los valores
indicados por el usuario en `options.profile_params.restrictions`:

| Perfil de la app | Parámetro ORS | Unidad |
| --- | --- | --- |
| Altura cargada | height | m |
| Ancho cargado | width | m |
| Largo total | length | m |
| Peso bruto | weight | t |
| Carga por eje | axleload | t |

Confirmar la ruta no convierte los valores iniciales del formulario en datos
reales del vehículo. Se debe registrar la unidad cargada. No se envía el número
de ejes ni se valida la configuración legal de ejes contra una tabla federal.

## Qué vías se consideran

El proveedor puede excluir vías incompatibles con el vehículo según sus datos:
accesos por tipo de vehículo y límites de altura, ancho, largo, peso y carga por
eje. La documentación de HeavyVehicle describe etiquetas OSM como maxheight,
maxwidth, maxlength, maxweight y maxaxleload. La aplicación no conoce una lista
exhaustiva de calles excluidas, ni recibe del proveedor todos los descartes.
No presenta restricciones inferidas como verificadas.

Una señal ausente del mapa, un puente mal etiquetado o una modificación reciente
pueden no reflejarse en el cálculo. No se garantiza la interpretación dinámica de
horarios municipales o permisos. No hay catálogo municipal cargado en la base.
El orden de entregas se conserva en camión porque la optimización VROOM integrada
para reparto no aplica aquí las dimensiones de la unidad.

No se activan avoid_features para peajes o autopistas. No hay datos de tráfico
actual, inventario completo de puentes, validación de carga peligrosa ni cálculo
de autorizaciones especiales. Google Maps y las exportaciones no reciben las
restricciones del vehículo como reglas de navegación.

## Normativa mexicana

El catálogo de la Secretaría de Economía indica que NOM-012-SCT-2-2017 está
vigente. Su alcance es federal; las tablas de pesos y dimensiones dependen de la
configuración vehicular, ejes y clase de camino ET/A/B/C/D. Route Planner aún no
cruza el trazado con las tablas ni clasifica jurídicamente cada carretera.

Las vías urbanas requieren además comprobar reglas estatales/municipales y las
condiciones de acceso de descarga. No se deben extrapolar horarios de una ciudad
a otra. La señalización y las autorizaciones operativas se comprueban antes de
circular. Un programa de modificación de una NOM no sustituye por sí mismo el
texto vigente publicado oficialmente.

## Fuentes primarias

- [Vigencia en el catálogo oficial](https://platiica.economia.gob.mx/normalizacion/nom-012-sct-2-2017/)
- [DOF: NOM-012, tablas y campo de aplicación](https://sidof.segob.gob.mx/notas/docFuente/5508944)
- [ORS: opciones y unidades HGV](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/routing-options)
- [ORS: HeavyVehicle y etiquetas](https://giscience.github.io/openrouteservice/run-instance/configuration/engine/profiles/build#heavyvehicle)
- [ORS: filtrado de vías](https://giscience.github.io/openrouteservice/technical-details/tag-filtering)
