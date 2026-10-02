# Inicio y conexiones

Los [paquetes nativos](installation.md) y `npm run install:cli` permiten invocar
`repi` desde cualquier carpeta. Los comandos de esta guía también funcionan con
`repi` en lugar de `./research-pi`. En los paquetes nativos las conexiones y Python
usan el directorio de datos del usuario; el checkout mantiene su ubicación anterior.

Ejecuta `./research-pi` desde el checkout (Linux/macOS; Windows puede usar WSL).
Necesitas Node >=22.19 y npm instalados. El lanzador instala el lock de npm si falta,
compila si cambia el código y abre un chat interactivo. `npm start` hace lo mismo.
No instala Node, Python ni paquetes del sistema, y no usa sudo. Python 3.14 con venv
solo es necesario para `demo`, `run` o la herramienta de experimentos del chat:
ResearchPi crea `.venv` e instala `requirements.lock` cuando hace falta.
Puedes prepararlo antes con `./research-pi setup --experiments`.

## Claude

`./research-pi connect claude` ofrece modelos de Anthropic y pide una API key sin
mostrarla. Puedes obtenerla en [Claude Console](https://platform.claude.com/settings/keys).
Las llamadas se facturan a esa clave. No se verifica la validez por red durante el alta:
la primera respuesta comprueba autenticación, saldo y acceso al modelo.
También se admite `ANTHROPIC_API_KEY` o `RESEARCH_PI_API_KEY` para ejecución sin
guardar la clave; para ese caso conserva `config --provider anthropic --model <id>`.
El asistente puede reutilizar credenciales que Pi detecte en el entorno.

ResearchPi no ofrece login con la suscripción Claude Pro/Max ni extrae tokens de
Claude Code. La [política de Anthropic](https://code.claude.com/docs/en/legal-and-compliance)
indica que una aplicación propia debe utilizar API keys o un proveedor cloud admitido.

## Codex / OpenAI con ChatGPT

`./research-pi connect codex` usa **Sign in with ChatGPT**, implementado por Pi 1.0.0
en el proveedor `openai`. Se abre un navegador y, al completar la autorización, se
reanuda el terminal. Si no funciona la apertura automática, abre el enlace mostrado.
Si el callback local no llega (por ejemplo, una sesión remota), pega la URL completa
de redirección cuando se solicite; esa entrada tampoco se muestra.

Pi gestiona PKCE, estado OAuth, intercambio, almacenamiento y renovación de tokens.
ResearchPi aporta un identificador estable de instalación. El callback local usa
`127.0.0.1:1455`; si está ocupado, el SDK ofrece la alternativa de pegar la URL.
No se lee ni se copia `~/.codex/auth.json`. Esta conexión utiliza los modelos de
OpenAI a través de Pi y la Responses API: no integra las herramientas ni el proceso
CLI de Codex. La opción `codex` es un acceso sencillo al proveedor, no un segundo harness.
El SDK muestra su propio nombre Pi en el flujo de autorización.

La disponibilidad depende de la autorización, plan y modelo. El catálogo se usa
para seleccionar modelos, no como prueba de acceso. Una respuesta terminada correctamente
es la comprobación real. Consulta [Sign in with ChatGPT](https://developers.openai.com/siwc/)
y [modelos e inferencia](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).
La integración autenticada en vivo permanece pendiente si no se completa un login real.

`./research-pi connect openai` permite usar una API key de OpenAI, con facturación de API,
como alternativa. Las dos opciones comparten el proveedor `openai` y su entrada de
credenciales: conectar otra cuenta o método sustituye esa entrada.

## Uso cotidiano

`./research-pi` reanuda el chat. `chat '<pregunta>'` envía una pregunta y termina.
`models claude` o `models codex` lista los modelos; `model <id>` cambia el modelo
sin borrar el historial. `connect <opción> --model <id>` evita el selector de modelo.
`connection` muestra la selección y si hay credenciales configuradas; no envía una
pregunta ni acredita una respuesta del proveedor. `disconnect claude` o
`disconnect codex` elimina la credencial guardada localmente, sin revocarla en el proveedor.
Las variables de entorno siguen activas hasta que el usuario las retire.

Cada proyecto conserva su modelo y conversación en `<proyecto>/.research-pi/`.
Un proyecto nuevo hereda la conexión predeterminada de la instalación. Cambiar de
proveedor mantiene el historial, que puede enviarse al nuevo proveedor con la próxima
pregunta. El protocolo y los resultados científicos se guardan por separado.

Las credenciales están en `<checkout>/.research-pi/connections/auth.json`, excluidas
de Git y con permisos 0600 en POSIX; la carpeta se crea con 0700. Son secretos locales
sin cifrado. No aparecen en los argumentos, el chat ni los artefactos científicos;
el modelo no recibe una herramienta para leerlos. Las credenciales antiguas guardadas
por proyecto continúan funcionando con la configuración avanzada sin `authMode`.
Si copias o clonas el repositorio, tendrás que conectar esa nueva instalación.

Para CI, usa variables de entorno y configuración explícita; la introducción de claves
por una tubería se rechaza. `chat --offline` y `--offline` permiten probar sin servicios.
Las pruebas mock no equivalen a autenticación ni inferencia reales.

Si una conexión falla o se cancela, no se guarda una nueva selección de modelo.
Prueba `connect` de nuevo y revisa la autorización en el navegador. Si una respuesta
falla, comprueba el acceso al modelo, saldo y red; usa `models` para elegir otro modelo.
Los errores de login no imprimen respuestas con tokens del proveedor.

Al actualizar código, usa un proyecto nuevo para la demo, por ejemplo:
`./research-pi --project examples/demo-v2 demo`. El protocolo anterior seguirá
guardado y su auditoría indicará incompatibilidad con la nueva huella del código;
el lanzador no elimina ni reescribe evidencias para ocultarla.

Fuentes consultadas el 2026-10-02: [proveedores de Pi](https://pi.dev/docs/latest/providers),
[autenticación de Codex](https://developers.openai.com/codex/auth),
[Sign in with ChatGPT y app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server),
y [uso de credenciales de Claude](https://code.claude.com/docs/en/legal-and-compliance).
