# Harness de investigación sobre Pi: diseño inicial

Ámbito confirmado: machine learning, inteligencia artificial y computer science. Diseño preparado el 2 de octubre de 2026. Este documento propone una arquitectura y criterios de aceptación; no constituye un harness implementado ni validado.

Nombre propuesto: **ResearchPi**. Nombre del repositorio: `research-pi`. El repositorio remoto todavía no se ha creado.

## Reutilización y licencia de Pi

La licencia oficial revisada es MIT, con copyright de Mario Zechner. Permite uso, modificación y distribución, manteniendo los avisos de copyright y licencia en las copias o partes sustanciales distribuidas. No exige crear un fork ni publicar el código propio. Recomendación: repositorio independiente que use el SDK como dependencia; un fork se justifica si hay que cambiar el núcleo. La licencia del código original de ResearchPi puede elegirse por separado. [Licencia oficial](https://github.com/earendil-works/pi/blob/main/LICENSE), [condiciones MIT](https://choosealicense.com/licenses/mit/).

Al distribuir el producto, conserva el texto de licencia de Pi en los avisos de terceros correspondientes y revisa las licencias de las dependencias efectivamente incluidas. Los papers, datasets, pesos y otros documentos de la biblioteca tienen sus propias condiciones; la licencia de Pi no concede derechos sobre ellos.

## Objetivo

Construir un asistente que convierta una pregunta científica en un protocolo explícito, ejecute o coordine experimentos, conserve evidencias y ayude a redactar un paper trazable a esas evidencias. Debe aplicar las políticas del usuario, consultar documentación científica propia y adaptar sus procedimientos al tipo de estudio y publicación.

La base recomendada es el SDK de `@earendil-works/pi-coding-agent`, con herramientas y recursos seleccionados. Pi ya ofrece sesiones, modelos, extensiones y carga de recursos; nuestra aplicación aporta protocolos científicos y verificaciones. Una primera distribución como Pi package permite probar esos recursos antes de construir una interfaz propia. [SDK oficial](https://pi.dev/docs/latest/sdk), [Pi packages](https://pi.dev/docs/latest/packages).

## Cinco componentes

| Componente | Función | Artefacto verificable |
|---|---|---|
| Políticas | Reglas del laboratorio, requisitos de la publicación y criterios de finalización | Configuración versionada y registro de excepciones |
| Biblioteca | Fuentes primarias, notas propias, recomendaciones de expertos y perfiles de publicaciones | Documento con autor, fuente, fecha, alcance y versión |
| Protocolos | Pasos condicionales para cada tarea científica | Plan con entradas, supuestos, métodos y criterios de salida |
| Herramientas | Ejecución de experimentos, análisis, recuperación bibliográfica y escritura | Registros, datos, tablas y referencias |
| Verificación | Comprobaciones automáticas y revisión científica | Informe que separa cumplimiento mecánico y cuestiones pendientes |

Es una propuesta de diseño: las validaciones y herramientas de investigación se construirían sobre Pi; no vienen incluidas como un producto científico terminado.

## Políticas: distinguir qué se puede comprobar

Separar tres niveles:

1. **Reglas verificables por código:** número y unicidad de seeds, configuraciones compatibles, ejecuciones terminadas, referencias resolubles, existencia de resultados, tablas recalculables.
2. **Protocolos que requieren razonamiento:** selección de métricas, baselines pertinentes, identificación causal, calidad de una metodología y límites de generalización.
3. **Preferencias personales:** estilo, idioma, organización de carpetas y forma de presentar resultados.

El harness puede impedir que un artefacto obtenga el estado «verificado» si falla una regla mecánica. Un informe automático no certifica por sí mismo validez científica. Por ejemplo, comprobar que hay un campo llamado «supuestos» no demuestra que esos supuestos sean defendibles.

Las reglas del usuario y requisitos externos deben conservar su procedencia. Si entran en conflicto, se informa del conflicto; no se cambia una política de forma silenciosa. Los cambios aprendidos durante una sesión son propuestas hasta que el usuario los incorpore a la política estable.

## Regla de las 10 seeds

La política inicial solicitada es **10 seeds diferentes, predefinidas, por configuración experimental estocástica**. Debe aplicarse también a comparaciones principales con baselines cuando sean estocásticos. Si un análisis es teórico o determinista, debe registrar por qué esa regla no aplica, en lugar de fabricar diez repeticiones idénticas. Una reducción del número exigido necesita una excepción explícita del usuario.

El protocolo especifica qué cambia: inicialización, orden de minibatches, muestreo, entorno, split o combinación de estos factores. Distingue las seeds de entrenamiento de las del reparto de datos. Para comparaciones emparejadas deben conservarse condiciones y particiones comparables; compartir un entero no garantiza por sí solo ese emparejamiento.

Por ejecución se conservan seed, configuración, versión de código y datos, entorno, estado, métricas y artefactos. Se registran fallos y reintentos. El agregador informa cobertura de las diez seeds y no descarta fallos silenciosamente ni selecciona las mejores ejecuciones.

Las diez seeds son una política del usuario, no un requisito universal de todas las conferencias. La checklist de NeurIPS pide explicar variabilidad, incertidumbre y condiciones experimentales; no establece ese número fijo. Las repeticiones de entrenamiento tampoco equivalen a nuevas muestras independientes de la población: el intervalo debe indicar qué incertidumbre representa. [Checklist oficial](https://neurips.cc/public/guides/PaperChecklist).

Fijar seeds no garantiza resultados idénticos entre dispositivos, plataformas o versiones. El protocolo debe registrar librerías, hardware y operaciones no deterministas. [Reproducibilidad en PyTorch](https://docs.pytorch.org/docs/stable/notes/randomness.html).

## Protocolos iniciales

### Experimento de ML

Pregunta e hipótesis → datos y particiones → métrica principal → baselines y presupuesto comparable → diseño de las diez ejecuciones → validaciones previas → ejecución → agregación → ablations justificadas → interpretación y limitaciones.

La configuración queda congelada antes de la evaluación confirmatoria. Cambiar hipótesis, métricas o selección tras ver resultados se registra como análisis exploratorio. El test no se utiliza para elegir hiperparámetros; las transformaciones aprendidas se ajustan con los datos de entrenamiento correspondientes, también dentro de cada fold. [Prácticas de scikit-learn](https://scikit-learn.org/stable/common_pitfalls.html).

Las variantes cambian según el problema: clasificación, regresión, RL, LLMs, visión, NLP o sistemas. Diez seeds no sustituyen una elección correcta de datasets, unidades de evaluación, métricas ni controles.

### Análisis causal

Antes de elegir una librería o estimador:

1. Definir intervención o exposición, resultado, población, horizonte temporal y efecto objetivo.
2. Especificar diseño de estudio, conocimiento del dominio y supuestos; usar un DAG u otra representación cuando corresponda.
3. Determinar si el efecto puede identificarse con esos datos y supuestos.
4. Elegir estimación compatible, diagnosticar problemas del diseño y cuantificar incertidumbre.
5. Realizar análisis de sensibilidad y comprobaciones de robustez pertinentes.
6. Redactar conclusiones limitadas por los supuestos y la evidencia.

Este protocolo adapta la separación de modelar, identificar, estimar y refutar documentada por DoWhy. La automatización debe poder producir «no identificable con los supuestos disponibles», en vez de inventar una estimación causal. Superar pruebas de robustez no demuestra todos los supuestos. [DoWhy](https://www.pywhy.org/dowhy/main/user_guide/causal_tasks/estimating_causal_effects/index.html).

Para fundamentar los módulos, incorporar notas con citas de *Causal Inference: What If*, de Hernán y Robins, indicando qué capítulos y recomendaciones aplican a cada clase de estudio. [Página de los autores](https://miguelhernan.org/whatifbook).

### Paper y metodología

Crear una estructura adaptable: título, abstract, introducción, trabajo relacionado, formulación del problema, método, evaluación, discusión, limitaciones, conclusiones, referencias y apéndices. Es un perfil inicial para artículos empíricos de ML; artículos teóricos, de datasets, sistemas o surveys necesitan otros perfiles.

La metodología se construye desde el protocolo y registros reales: datos, preprocessing, splits, arquitectura o algoritmo, entrenamiento, búsqueda de hiperparámetros, selección, baselines, seeds, métricas, incertidumbre, recursos y pasos de reproducción. Lo planeado y lo ejecutado se distinguen.

Cada afirmación principal apunta a una tabla, figura, prueba o referencia. El harness detecta cifras sin respaldo y referencias pendientes; no rellena resultados que aún no existen. Una revisión editorial posterior examina si la pregunta, contribución y evidencias forman un argumento comprensible. Las recomendaciones de Mensh y Kording sirven como una fuente inicial de escritura, con su atribución y alcance. [Artículo de los autores](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005619).

## Biblioteca propia y expertos

Cada nota mantiene: autor, título, URL o DOI, edición/fecha, sección original, resumen propio, recomendación extraída, casos de uso, limitaciones, conflictos y última revisión. Distinguir texto de la fuente, interpretación propia y política del laboratorio.

Una pregunta como «¿cómo redactar la metodología de este experimento?» recupera las notas aplicables y las contrasta con el protocolo del estudio. No hace falta cargar toda la biblioteca en cada prompt. Empezar con búsqueda textual e índices por tema; añadir recuperación semántica cuando el volumen lo justifique. La carga bajo demanda de skills de Pi encaja con ese diseño. [Skills de Pi](https://pi.dev/docs/latest/skills).

El sistema incorpora nuevas fuentes como documentos atribuibles; no presenta sus consejos como citas de un experto si no se verificó el pasaje. No necesita entrenar un modelo nuevo para consultar esta biblioteca, aunque eso no garantiza que el modelo razone correctamente con ella.

## Conferencias y revistas

El catálogo inicial puede empezar por NeurIPS, ICML, ICLR, JMLR y TMLR, y ampliar después por subárea. Cada perfil debe separar publicación, edición/año, track y tipo de artículo.

Campos: alcance temático, audiencia, clases de contribución, plantilla oficial, extensión, anonimización, checklist, política de código/datos/artefactos, uso de IA, fechas, fuentes oficiales y fecha de verificación. Datos como deadlines, costes y reglas de envío se consultan de nuevo antes de recomendar o preparar una submission.

La recomendación de destino explica ajuste entre contribución y requisitos; no garantiza aceptación. La primera versión no necesita cubrir toda computer science: puede añadir familias de perfiles para teoría, sistemas y software conforme aparezcan proyectos. Fuentes iniciales contrastadas: [NeurIPS](https://neurips.cc/public/guides/PaperChecklist), [TMLR](https://jmlr.org/tmlr/author-guide.html), [política de artefactos ACM](https://www.acm.org/publications/policies/artifact-review-and-badging-current).

## Implementación recomendada

Un controlador TypeScript usa Pi; herramientas Python ejecutan los métodos científicos. Son decisiones de implementación propuestas, no requisitos de Pi.

Herramientas iniciales: buscar fuentes, recuperar notas, crear y validar un protocolo, planificar las diez seeds, lanzar o consultar ejecuciones, agregar métricas, comprobar referencias, crear un esquema del paper y generar el informe de verificación.

El launcher selecciona recursos y herramientas mediante el SDK. Para controles estrictos, las ejecuciones y sus recibos deben gestionarse fuera de la escritura libre del modelo: registros append-only o almacenamiento con permisos separados. Contar diez archivos que el propio agente puede inventar no prueba que se ejecutaron diez experimentos. Pi ofrece mecanismos de extensiones y configuración; esta integridad adicional debe implementarse en nuestra aplicación. [SDK](https://pi.dev/docs/latest/sdk), [seguridad de Pi](https://pi.dev/docs/latest/security).

Estado del proyecto: pregunta, literatura, protocolo, experimentos, resultados, manuscrito y auditoría. La aplicación conserva cada transición y su evidencia. Cambiar código, datos o protocolo invalida las comprobaciones afectadas.

## Primera versión y criterios de aceptación

Comenzar con un flujo empírico de ML, la política de diez seeds, un protocolo causal básico, una biblioteca inicial curada y dos perfiles de publicación contrastados. Mantener los módulos independientes para poder añadir RL, LLM evaluation, datasets y sistemas.

La primera versión debe demostrar que:

- Detecta nueve ejecuciones cuando se exigen diez y una seed duplicada.
- No mezcla configuraciones incompatibles ni silencia una ejecución fallida.
- Recalcula las tablas desde los registros y distingue tipos de incertidumbre.
- Exige declarar estrategia y supuestos antes de presentar una conclusión causal como respaldada.
- Distingue referencias verificadas de pendientes y cifras medidas de propuestas.
- Conserva protocolo y evidencias al reanudar o compactar una sesión.
- Detecta cambios que invalidan una auditoría anterior.

Se probaría con un pequeño estudio sintético reproducible y casos deliberadamente incompletos. La revisión científica seguiría siendo una actividad distinta de estos controles mecánicos.
