# Navegación: opciones y límites comprobables

Fuentes primarias consultadas el **15 de noviembre de 2026**. Sin contratar,
instalar ni activar productos de pago. Esta investigación no sustituye pruebas
Android ni validación de circulación municipal.

| Opción | Disponible o investigada | Conservación y límites |
| --- | --- | --- |
| Google Maps | Enlaces consecutivos existentes, con entregas en orden | Maps URLs documenta 3 intermedias en navegador móvil y hasta 9 en otras plataformas, 2,048 caracteres y productos que pueden ignorar paradas. Sus modos y parámetros no incluyen dimensiones/peso HGV ni una polilínea bloqueada. Puntos guía orientan; no imponen el camino exacto. |
| Navegación interna | GPS/voz sobre la polilínea calculada, ya implementados | Conserva el trazado y avisa de desvíos; no recalcula automáticamente. Requiere app visible; el navegador puede suspender GPS/voz. No acredita permisos ni cobertura legal. |
| OsmAnd para Android | Candidato para probar con el GPX que ya exporta Route Planner | Admite importar GPX y navegar tracks. Un track geométrico ofrece guía básica; seguir puntos de ruta o ajustar a carreteras puede recalcular. El perfil de vehículo requiere sus propios parámetros; el GPX exportado no los transmite. Compatibilidad de este archivo concreto pendiente de prueba física. |

La tabla oficial de OsmAnd distingue navegación e importación GPX gratuitas de
funciones de pago. La edición gratuita limita las descargas/actualizaciones de
mapas regionales a siete; no implica actualizaciones legales municipales ni
mapas ilimitados. No se promete que todas sus funciones o plataformas sean gratis.

## Ensayo propuesto sin compras

1. Exportar GPX de una ruta controlada y revisar en Android el track llamado
   **Trazado calculado por OpenRouteService**, separado de los puntos del recorrido.
2. Comparar visualmente la geometría importada y el orden de entregas. Configurar
   el vehículo en el navegador si se solicita un cálculo independiente.
3. Probar ajuste a carreteras y desvíos con supervisión: cualquier recálculo requiere
   contrastar nuevamente el trazado y las restricciones. No asumir conservación.
4. Registrar versión, mapas, ajustes, diferencias y pruebas; no promover esta
   alternativa como integración terminada antes de ese contraste.

Ninguna opción completa las geometrías, vigencia, excepciones, horarios o permisos
faltantes de México. Google sigue disponible en la aplicación con estas limitaciones.

## Fuentes oficiales

- Google: https://developers.google.com/maps/documentation/urls/get-started#directions
- OsmAnd, navegación GPX: https://www.osmand.net/docs/user/navigation/setup/gpx-navigation/
- OsmAnd, parámetros del vehículo: https://www.osmand.net/docs/user/navigation/guidance/vehicle-parameters/
- OsmAnd, edición Android y funciones gratuitas: https://www.osmand.net/docs/user/purchases/android/
