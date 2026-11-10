# Comparación del vehículo con referencias municipales

Revisión: 10 de noviembre de 2026. Es una ayuda de lectura, no un motor de autorización ni de exclusión de calles.

La guía recibe los datos actuales del planificador en modo Camión. Las referencias y su jurisdicción siguen viniendo de la API; la comparación se ejecuta localmente, sin enviar más consultas al editar la unidad ni persistir resultados de supuesta legalidad. En Reparto no se reutilizan los datos del camión.

## Comparaciones disponibles

- Puebla: capacidad nominal frente a comparadores estrictos; medidas y peso bruto frente al cuadro de la configuración citada; longitud frente al umbral de autorización del Centro Histórico. La anchura de la carga queda desconocida: no se sustituye por anchura del vehículo.
- Monterrey: contraste del número de ejes con el criterio de la excepción horaria del artículo 39, exclusivamente en el contexto de red troncal. Se conserva la advertencia sobre discrepancias de días en los anexos.

No se asignan horarios, permisos o rutas por coincidir un dato. El caso exactamente 3.5 t conserva el estado «igual al umbral» en ambos comparadores de capacidad; no se redondea ni se elige una ventana. Se rechazan también números con precisión adicional extremadamente próximos al umbral, sin usar tolerancias que los coloquen de un lado u otro. No se sustituye capacidad nominal por peso bruto. Un dato ausente, no finito, fuera de rango o con precisión no admitida queda pendiente. Una configuración contradictoria con sus ejes no se usa para inferir una excepción.

Las referencias de una configuración no se trasladan a otra. Todos los textos originales siguen visibles, incluso si un dato no coincide; la app no oculta disposiciones ni declara circulación libre. Valores que no superan un límite sólo reciben esa descripción numérica, sin estado «autorizado», «seguro» o «ruta legal».

## Fuentes y límites

Contraste del texto consultado el 10-11-2026:
- [Puebla, RES. 2021/49, Decimoprimero](https://gaceta.pueblacapital.gob.mx/publicaciones/minutas/item/847-res-2021-49-dictamen-por-virtud-del-cual-se-reforman-y-derogan-diversas-disposiciones-de-los-lineamientos-para-la-operacion-del-transporte-de-carga-y-distribucion-de-mercancias-en-el-municipio-de-puebla-publicado-en-el-periodico-oficial-del): capacidad, dimensiones y autorización por longitud. Mantiene vigencia actual, ámbito, publicación exacta y actos posteriores pendientes.
- [Monterrey, reglamento, artículo 39, página 20](https://www.monterrey.gob.mx/pdf/portaln/reglamentos/Reglamento%20de%20Transito%20y%20Vialidad%20del%20Municipio%20de%20Monterrey.pdf#page=20): excepción limitada a sus restricciones horarias en red troncal. No exceptúa acceso general a vías restringidas ni otros requisitos.

La consulta documental no prueba vigencia exhaustiva. La descarga directa del PDF de Monterrey respondió 403 en esta ejecución, aunque el servicio de consulta pudo recuperar su texto; no se inventa un hash nuevo ni se cambia la fecha de verificación de la API. Puebla respondió 200, con hash HTML 1a67a805c0445f99285181b27afadb12dac2d69a5ab3d8b815fa18b695c24aa6; un hash de HTML distinto no demuestra una reforma.

Permanecen 14 municipios con referencias parciales, cero con validación legal completa y sin geometrías municipales aplicadas al motor de rutas. No se determinan entrada en zona, dirección de circulación, días/horas, disponibilidad de permisos ni excepciones específicas de la operación. No cambia Directions ni enlaces de Google Maps.

## Verificación y recuperación

Pruebas de fronteras numéricas, datos desconocidos, configuraciones contradictorias y campos distintos; pruebas de componente para jurisdicción y cambios de perfil; navegador móvil para ambos casos y aislamiento al cambiar a Reparto. El flujo con Auth/REST local comprueba que una ruta recuperada usa su perfil histórico en la guía. El proveedor de rutas en CI es simulado.

Sin migraciones, cambios de políticas, funciones o datos alojados. Recuperación: restaurar el despliegue Web anterior; API y Supabase no requieren rollback.
