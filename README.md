# ResearchPi

Harness de investigación para ML, AI y computer science basado en el SDK de Pi 1.0.0.

Requiere Node >=22.19 y Python 3.14 (entorno probado).

```sh
npm ci
npm run build
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock
npm run check
node dist/cli.js chat '[tool:project_status]'
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

Los hitos y sus comprobaciones están en [docs/status.md](docs/status.md).
La licencia MIT del código propio es una propuesta pendiente; Pi y las dependencias
mantienen sus licencias y atribuciones.
