# Opciones de ruteo de camión sin nuevas contrataciones

Consulta de documentación primaria: 10-11-2026. Investigación técnica; no se ha integrado otro proveedor ni contratado infraestructura.

| Opción | Capacidad documentada | Decisión con los recursos autorizados |
| --- | --- | --- |
| OpenRouteService actual | Perfil HGV y restricciones cartográficas; Directions alojado admite hasta 50 puntos, contando extremos. Alternativas tienen límites adicionales. | Mantener la integración existente y sus 48 intermedias. Las cuotas de la cuenta se comprueban por separado; no se supone consumo ilimitado. |
| ORS autohospedado | El proveedor remite a una instancia propia para superar límites alojados. | Requiere evaluar máquina, memoria, almacenamiento, mapas y actualización. No se aprovisiona otro servicio ni se presupone gratuito ejecutarlo. |
| Valhalla autohospedado | Modelo truck, medidas, peso, carga y número de ejes; licencia MIT. | Candidato técnico para una evaluación aislada futura, sujeto a infraestructura autorizada y ensayos con restricciones conocidas. No es un respaldo desplegado. |
| Google Maps URLs | Direcciones, puntos intermedios y preferencias de evitación documentadas. | Conservar enlaces consecutivos. El contrato no documenta campos HGV ni importación de la polilínea: se infiere que el enlace no puede fijar el trazado especializado ni transferir los atributos del camión. |

En Valhalla, `hgv_no_access_penalty` por debajo de 43200 permite vías sin acceso HGV con penalización; una integración futura no debe rebajarlo para obtener una ruta. `use_truck_route` sólo expresa preferencia y no garantiza vías designadas. Sus capacidades no demuestran cobertura completa de restricciones en México ni sustituyen reglas municipales, permisos o geometrías verificadas.

Software abierto no equivale a alojamiento gratuito, operación gratuita o garantía legal. No se seleccionó un endpoint público de demostración como respaldo de producción: siguen pendientes condiciones de uso, cuotas, disponibilidad y soporte de los parámetros requeridos. Ninguna de estas consultas prueba navegación real en México.

Las URLs de Google admiten hasta tres intermedias en navegadores móviles y nueve en los demás casos documentados, con límite de 2048 caracteres; hay productos que ignoran puntos intermedios. El código existente fracciona enlaces por cantidad y longitud, conserva extremos consecutivos y permite guías, sin prometer que Google mantendrá la misma carretera.

Fuentes:
- [Restricciones alojadas de ORS](https://giscience.github.io/openrouteservice/hosted-api-restrictions).
- [API Valhalla, opciones truck](https://valhalla.github.io/valhalla/api/route/api-reference/).
- [Licencia de Valhalla](https://github.com/valhalla/valhalla/blob/master/COPYING).
- [Google Maps URLs, contrato y límites](https://developers.google.com/maps/documentation/urls/get-started).
