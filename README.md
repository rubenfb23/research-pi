# ResearchPi

Harness de investigación para ML, AI y computer science basado en el SDK de Pi 1.0.0.

Repositorio independiente: https://github.com/rubenfb23/research-pi
Implementa los cuatro hitos del [encargo](docs/encargo-codex-research-pi.md).

Requiere Node >=22.19 y Python 3.14 (entorno probado).

```sh
git clone https://github.com/rubenfb23/research-pi.git
cd research-pi
npm ci
npm run build
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
npm run check
node dist/cli.js chat '[tool:project_status]'
npm run demo
node dist/cli.js audit
node dist/cli.js aggregate
node dist/cli.js search 'redactar metodología paper'
node dist/cli.js protocol causal
node dist/cli.js venues
node dist/cli.js outline --type theory
node dist/cli.js paper --venue tmlr-2026-journal
```

La configuración inicial usa un transporte simulado, identificado como OFFLINE TEST.
Para usar un proveedor real:

```sh
node dist/cli.js config --provider anthropic --model claude-sonnet-4-5
export RESEARCH_PI_API_KEY='tu-clave'
node dist/cli.js chat 'Ayúdame a diseñar un experimento de clasificación'
```

El modelo debe existir en el catálogo del SDK; las credenciales no se guardan en Git.
Cada llamada `chat` reanuda la conversación persistida del proyecto. `--compact` compacta
la conversación después de la respuesta (puede requerir una conversación suficientemente larga).
`--project <carpeta>` permite usar otro directorio de proyecto.

Protocolos, registros y evidencias se guardan en `.research-pi/`, fuera de la conversación.
La aplicación carga sus recursos explícitamente y no descubre extensiones ni instrucciones
del entorno. El agente no tiene herramientas de escritura libre ni terminal.

La demo ejecuta veinte entrenamientos en CPU: SGD logístico y random forest, diez seeds
por configuración. Guarda protocolo congelado, historial de intentos, predicciones,
versiones y fingerprints. `results.csv` contiene medias y SD muestral calculadas desde
las predicciones; `aggregate.json` enlaza las filas con recibos y hashes.
Las seeds de datos y split se mantienen fijas; no se calcula un IC poblacional.

Salidas locales (ignoradas por Git): `.research-pi/protocol.json`, `runs/`, `artifacts/`,
`journal.jsonl`, `aggregate.json`, `results.csv`, `audit.json`, `paper.md`, `paper-manifest.json`
y `paper-review.json`. El borrador incluye metodología, cifras enlazadas con recibos y
una lista de lo que falta revisar. La demo no descubre una contribución publicable.

`npm run demo` reanuda sin repetir ejecuciones completas. Para repetir todo desde cero
conservando evidencia anterior, usa un proyecto nuevo:

```sh
node dist/cli.js --project examples/replica-2 demo
```

El papel de cada seed y los límites de la incertidumbre se registran en el protocolo.
Las ejecuciones fallidas siguen en el historial; reintentar no borra el fallo.

Para un protocolo propio compatible con el runner: `freeze --file protocolo.json` y `run`.
Tras cancelar o fallar, usa `run --retry` explícitamente: el intento anterior se conserva.
Las configuraciones admitidas están en `src/protocol.ts`; el MVP solo ejecuta clasificación
sintética binaria con estos dos algoritmos. Los cambios de protocolo/código invalidan
la evidencia anterior. Usa otro `--project` para un nuevo estudio o versión; `freeze --replace`
es explícito y no convierte registros antiguos en evidencia válida del protocolo nuevo.

Los hitos y sus comprobaciones están en [docs/status.md](docs/status.md).
La licencia MIT del código propio es una propuesta pendiente; Pi y las dependencias
mantienen sus licencias y atribuciones.

Para comprobar un análisis causal incompleto o un manifest con cifras/referencias pendientes:

```sh
node dist/cli.js causal --file examples/causal-incomplete.json
node dist/cli.js review-manifest --file examples/manuscript-pending.json
```

Esos ejemplos deben salir con código 1 y explicar los faltantes. `ready_for_scientific_review`
solo significa que el protocolo causal está rellenado; el MVP no ejecuta estimadores causales.
Los perfiles empírico, teoría, dataset, sistemas y survey son esquemas editoriales extensibles.
El generador de resultados del MVP trabaja con los experimentos de clasificación admitidos.

Las pruebas usan Pi con transporte simulado y experimentos reales de scikit-learn; no
requieren credenciales ni APIs pagadas. La integración con un modelo real sigue pendiente
si no hay claves disponibles. El transporte simulado no responde preguntas científicas;
en pruebas se puede invocar una herramienta con `[tool:nombre] {"argumento":"valor"}`.

Consulta [el límite de integridad y dependencias](docs/integrity.md) y
[los avisos de terceros](THIRD_PARTY_NOTICES.md). Hay un aviso transitivo de Pi pendiente
de actualización upstream; no se declara `npm audit` limpio.

Para ampliar la biblioteca: añade JSON en `resources/library/` siguiendo una nota existente,
con autores, URL/DOI, sección revisada, fecha/edición, tipo de recomendación, interpretación,
alcance y límites. Revisa realmente el pasaje antes de marcar `verified`. No copies libros
o papers completos sin derechos. Añade perfiles de venues por año/track con fuentes oficiales,
fecha y campos por revalidar; no arrastres deadlines de otra edición.

El runner está concentrado en `src/protocol.ts`, `src/experiments.ts` y `python/experiment.py`.
Para admitir otro experimento: ampliar la validación acotada, el worker, predicciones/métricas
y las pruebas de incompatibilidad. `src/tools.ts` controla la autoridad del modelo; conceder
escritura libre o terminal rompe el límite de integridad actual.
