# Encargo para Codex: implementar ResearchPi

Construye ResearchPi, un harness de investigación para machine learning, inteligencia artificial y computer science, en el repositorio propio `research-pi`. Usa `diseno-harness-research.md`, adjunto a este encargo, como especificación del producto. Guarda ambos documentos en `docs/` para que el proyecto conserve su especificación.

Entrega software ejecutable y probado, trabajando por hitos. El diseño general describe el destino; los hitos siguientes definen el orden de implementación. Documenta el estado real de cada capacidad y cualquier limitación que impida completar un criterio.

## Antes de implementar

Inspecciona la carpeta y las instrucciones existentes del repositorio. Conserva el trabajo del usuario. Si el repo todavía no existe, prepara una carpeta local `research-pi`; la creación y publicación en GitHub dependen del acceso de la sesión y de la visibilidad elegida por el usuario. No presentes un repo local como publicado.

Usa Pi mediante el SDK `@earendil-works/pi-coding-agent` en un repositorio independiente. Consulta la documentación correspondiente a la versión publicada elegida, fija esa versión y registra el lockfile. Implementa control y extensiones en TypeScript; utiliza Python para experimentos y análisis científicos cuando corresponda.

Pi tiene licencia MIT. Conserva avisos de copyright y licencia de cualquier código copiado y de Pi cuando se redistribuya. Documenta atribuciones en los avisos de terceros. Conserva una licencia ya elegida para ResearchPi; si todavía no tiene, registra MIT como propuesta sin confundirla con una obligación impuesta por Pi. Si falta una capacidad del SDK, explica el caso concreto antes de convertir el producto en un fork del núcleo. [Licencia](https://github.com/earendil-works/pi/blob/main/LICENSE), [SDK](https://pi.dev/docs/latest/sdk).

## Hito 1: integración real con Pi

Implementa una CLI propia, configuración de proveedor/modelo, carga explícita de recursos científicos y sesiones persistentes. Separa el estado científico del proyecto de la conversación: una compactación no debe perder protocolos, ejecuciones ni evidencia.

Entrega un README con instalación, configuración, ejemplo de uso y comandos de comprobación. Las pruebas por defecto usan un proveedor simulado; documenta por separado la comprobación con un proveedor real, si hay credenciales disponibles. No inventes un resultado de integración en vivo si no pudiste ejecutarla.

Finalización: CLI arrancable, recurso científico cargado y una sesión reanudable que conserva el estado del proyecto. La prueba simulada debe pasar; la comprobación real se marca como realizada o pendiente con su causa.

## Hito 2: un experimento de ML completo

Implementa un protocolo estructurado con pregunta, hipótesis, datasets y particiones, métricas, métodos, hiperparámetros, presupuesto, diez seeds distintas y plan de incertidumbre. Congela la versión del protocolo antes de ejecutar.

Construye un runner, registro de ejecuciones y agregador. Conserva configuración, seed, versión de código/datos/entorno, estado, métricas y artefactos. Representa los fallos y reintentos de forma explícita. Verifica diez seeds por configuración estocástica y que los resultados pertenezcan al mismo protocolo. Para tareas donde las seeds no apliquen, registra la razón. Una reducción del número exigido requiere una excepción explícita del usuario.

Incluye una demo pequeña de clasificación con datos sintéticos, particiones reproducibles y dos métodos estocásticos ejecutados diez veces cada uno en CPU. Calcula métricas, dispersión y tablas desde las ejecuciones reales. Explica qué variabilidad se mide; cualquier intervalo debe tener un método y supuestos adecuados documentados.

Finalización: una demo de veinte ejecuciones reales produce registros, tabla agregada e informe de cumplimiento recalculables sin depender de texto generado por el modelo.

## Hito 3: biblioteca científica y protocolos

Añade documentos propios con autor, URL/DOI, fecha, alcance y sección de origen; búsqueda textual y recuperación por tema; protocolos para diseño experimental, metodología y análisis causal. Distingue política del usuario, requisito de publicación y consejo de una fuente.

El protocolo causal debe requerir efecto objetivo, supuestos, identificación, estimación y robustez. Produce una conclusión limitada o un estado de información insuficiente cuando corresponda. Distingue completar campos del protocolo de justificar científicamente su contenido.

Finalización: consultas de prueba recuperan fuentes pertinentes con procedencia; una solicitud causal incompleta señala requisitos faltantes antes de presentar un resultado como respaldado.

## Hito 4: paper, publicaciones y trazabilidad

Implementa perfiles extensibles por tipo de paper y publicación/año/track. Empieza con dos perfiles cuyas instrucciones se hayan contrastado con páginas oficiales. Registra fecha de verificación y marca datos susceptibles de quedar desactualizados.

Genera esquema y metodología a partir del protocolo y de lo realmente ejecutado. Vincula cifras y afirmaciones principales con tablas, figuras, pruebas o referencias. Una referencia sin verificar queda pendiente; resultados aún inexistentes se presentan como trabajo pendiente.

Finalización: la demo genera un borrador con metodología y resultados trazables, junto a un informe de faltantes. El informe diferencia controles automáticos de revisión científica pendiente.

## Pruebas obligatorias

- Nueve seeds, seed duplicada y ejecución fallida no obtienen el estado completo.
- Configuraciones incompatibles o protocolo cambiado invalidan la agregación o auditoría correspondiente.
- Tablas recalculadas coinciden con los registros originales.
- Referencias pendientes y cifras sin evidencia aparecen como pendientes.
- Reanudar y compactar conserva el estado científico persistido.
- Cancelar una ejecución deja un estado recuperable, sin marcarla como terminada.
- La biblioteca preserva la procedencia de las recomendaciones.

Para integridad estricta, el runner debe generar registros que el modelo no pueda alterar con escritura libre; documenta el límite de protección real. Una carpeta de resultados editable por el agente no constituye evidencia resistente a manipulación.

## Entrega

Tras cada hito, ejecuta las comprobaciones aplicables y corrige fallos antes de avanzar. Mantén `docs/status.md` con resultados de verificación, decisiones y trabajo pendiente. Usa CI para comprobaciones locales sin credenciales ni consumo de APIs pagadas. Mantén claves, datasets privados y resultados voluminosos fuera de Git.

Al terminar, entrega los comandos para reproducir la demo, resumen de capacidades verificadas, limitaciones y estado de publicación en GitHub. No des por implementada una capacidad solo porque exista una instrucción o una pantalla que la mencione.

Este encargo concreta hitos y evidencias siguiendo la orientación de la documentación oficial de OpenAI para tareas largas. [OpenAI: trabajo por hitos y validaciones](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex).
