# Estado de implementación

H1: integración con Pi verificada mediante `npm run check`: compilación TypeScript,
llamada real a herramienta en el SDK con transporte simulado, sesión persistida,
reanudación y compactación real del SDK. El estado científico permanece intacto.
No se ha realizado todavía una llamada a un proveedor real.

H2: `npm run check` pasa 7 pruebas, incluyendo 20 entrenamientos reales en CPU,
cancelación con registro terminal y reintento explícito. Se verifican cobertura,
duplicados, fallos, incompatibilidad de configuración/protocolo/datos, manipulación
de recibos y artefactos, bloqueo de concurrencia y recálculo de métricas/tablas.
La dispersión es SD muestral de entrenamiento sobre datos/split fijos; no un IC poblacional.

H3: `npm run check` pasa 11 pruebas. Biblioteca con seis notas atribuibles,
búsqueda bilingüe por texto/tema y recuperación real por herramientas del SDK.
Protocolos experimental, metodología y causal cargables. Solicitudes causales
incompletas devuelven faltantes; ninguna comprobación de campos certifica causalidad.
La nota Hernán/Robins es un recurso de lectura: capítulos específicos aún no curados.

H4: generación de metodología y resultados desde evidencia real, manifest de
afirmaciones/referencias, informe de faltantes, cinco perfiles editoriales y dos
perfiles de publicación contrastados con fuentes oficiales. NeurIPS 2026 aparece
con ventana de submission pasada; TMLR es un snapshot de guía, no una edición anual.

## Comprobación final local (2 de octubre de 2026)

- `npm ci`: instalación desde lockfile completada.
- `npm run check`: TypeScript y 17 pruebas pasan. Incluye fallos reales de startup,
  cancelación/reintento, veinte fits, reanudación/compactación con evidencia real,
  datos/configuración/entorno incompatibles, manipulación, faltantes causales y papers.
- `npm run demo`: veinte fits reales en CPU, diez seeds por configuración, sin fallos.
- `node dist/cli.js audit`: estado completo recalculado; cobertura 10/10 en cada método.
- `aggregate` recalcula métricas desde predicciones y produce CSV/JSON con recibos.
- `paper` produce metodología, tabla, enlaces a cada recibo y revisión de faltantes.
- La CI comprueba instalación, tests, demo y auditoría sin claves ni consumo de APIs.

Accuracy media ± SD de la demo local: SGD logístico 0.610400 ± 0.034160;
random forest 0.772800 ± 0.032703. Log loss: 0.676731 ± 0.022002 y
0.510471 ± 0.019127, respectivamente. Variación de entrenamiento en datos/split
fijos; estas cifras no demuestran superioridad general ni una contribución nueva.

Protocolo de demo: `bd19be3f8defac9d724049c9abde705a6cc73f7ad565c306ab5d235a2289bb7c`.
El code/table/evidence hash y cada recibo quedan en la salida local o artefacto de CI,
no en un número escrito manualmente por el modelo. Resultados completos ignorados por Git.

## Pendiente y límites

- Llamada y razonamiento con proveedor LLM real: no se encontraron claves de API
  en las variables soportadas. El transporte simulado verifica el SDK, no razonamiento.
- Estimadores/identificación causal automáticos: fuera del MVP; protocolo y gates sí implementados.
- Runner de datasets reales, RL, LLM evaluation, teoría y métodos deterministas:
  extensiones futuras. El MVP admite los dos métodos de clasificación sintética documentados.
- La reducción de diez seeds no está habilitada; requiere extender una excepción humana
  explícita, sin conceder esa facultad al modelo.
- Biblioteca curada pequeña, sin búsqueda semántica o verificación universal de referencias.
  Los capítulos del libro Hernán/Robins todavía necesitan curación específica.
- Los perfiles de publicación son parciales y requieren reconsulta oficial antes de enviar.
- El auditor de manuscript opera sobre manifest estructurado, no analiza todas las
  afirmaciones de un documento arbitrario; validez científica y revisión editorial pendientes.
- Integridad frente al modelo limitada a herramientas acotadas; host/usuario de OS de confianza.
  No hay firma externa ni un almacén con identidad separada. Ver `docs/integrity.md`.
- `npm audit`: aviso alto transitivo de brace-expansion fijado en el shrinkwrap de Pi 1.0.0,
  pendiente de upstream. El override esbuild sí se aplicó. No se afirma audit limpio.
- La licencia del código propio sigue sin elegir; MIT queda como propuesta.
  Pi MIT se conserva íntegra y 173 dependencias npm tienen inventario de metadatos.

Repositorio público creado: https://github.com/rubenfb23/research-pi.
Los commits de los cuatro hitos están publicados en `main`. La primera CI remota
pasó instalación, las 17 pruebas, demo, auditoría y subida de evidencias:
https://github.com/rubenfb23/research-pi/actions/runs/36997449500
La herramienta de protocolos propios y las acciones actualizadas también pasaron
instalación, 17 pruebas, veinte fits, auditoría y subida de evidencias en la CI final
del commit de implementación `c76bbd55d4ff78bc63d8a4638fd7f1e7e139ded1`:
https://github.com/rubenfb23/research-pi/actions/runs/36997809448

Código verificado publicado; checkout local sin cambios pendientes. La entrega final
incluye una actualización documental de este estado, sin cambios al código probado.

El agente puede crear protocolos propios compatibles mediante herramientas específicas:
plantilla estructurada y congelación con validación del host. Una prueba atraviesa el
SDK, persiste una pregunta propia y comprueba el rechazo de una reducción de seeds.

ResearchPi usa el SDK de Pi 1.0.0 como dependencia; no modifica su núcleo.
La licencia MIT para el código propio queda como propuesta; hasta elegirla, el paquete
se declara UNLICENSED. Los avisos de Pi y de dependencias se conservan por separado.

## Arranque y conexiones simplificados · 2026-10-02

`./research-pi` y `npm start` instalan/preparan la CLI y abren el chat. El primer
arranque ofrece Claude API, OpenAI con Sign in with ChatGPT (`connect codex`),
OpenAI API y prueba offline. La selección y las credenciales propias de Pi se
reutilizan en otros proyectos de esta instalación. No se importan credenciales
de Codex o Claude Code. Anthropic se conecta mediante API key conforme a su guía.
La [guía de conexiones](connections.md) recoge comandos y límites.

Comprobaciones locales completadas:

- Compilación y 23/23 pruebas: las 17 anteriores y seis nuevas de conexión/CLI.
  API key y OAuth atraviesan el SDK real, con credenciales falsas e intercambio
  de tokens simulado; se comprueban PKCE, estado, guardado privado y fallos sin
  sustituir la selección. Esto no acredita login real ni acceso a los modelos.
- Copia limpia sin node_modules, dist ni .venv: arranque sin argumentos,
  instalación automática, asistente y chat en terminal interactiva. Una clave
  falsa se introdujo sin eco; cambio de conexión conservando el historial y
  cierre del chat comprobados. Ninguna petición de inferencia fue enviada.
- Preparación automática de Python desde esa copia limpia y veinte fits reales,
  diez seeds por configuración, con auditoría completa sin errores.
- Demo en `examples/easy-launch-v1/.research-pi/` del checkout principal: veinte
  fits, agregados y paper trazables. Huella de código comprobada:
  `a109d1401d7f8bf2ca67c6a6ca58d9d7e7474f3e75f70470e8e3a80ab80f45cf`.
  Las evidencias anteriores siguen guardadas y no se reescribieron.

Pendiente: login con cuenta real de ChatGPT, clave real de Anthropic/OpenAI y
respuesta autenticada de cada proveedor. También siguen pendientes las
capacidades científicas y la actualización transitiva detalladas más arriba.
La CI del commit `2a4d91e3716bc7aa38a4ebddcd9e5987e52a4e03` terminó correctamente:
https://github.com/rubenfb23/research-pi/actions/runs/37003788440
Comprobó preparación automática desde checkout limpio, las 23 pruebas, demo de
veinte fits, auditoría y subida del artefacto `demo-evidence` (retención: siete días).

## repi e instaladores nativos 0.2.0 · 2026-10-02

El comando `repi` está declarado en npm y se instala desde el checkout con
`npm run install:cli`. Se comprobó en la máquina local desde otra carpeta.
El chat, ayuda y todos los subcomandos existentes usan la misma CLI.

La [release preliminar 0.2.0](https://github.com/rubenfb23/research-pi/releases/tag/v0.2.0)
contiene cuatro instaladores con Node 22.23.0 y dependencias de producción:
Ubuntu/Debian x64 `.deb`, Windows x64 `.exe`, macOS Apple Silicon `.pkg` y
macOS Intel `.pkg`, más sus cuatro archivos SHA-256. Los ocho assets se
comprobaron publicados y los hashes de los paquetes descargados de CI coinciden.
Los paquetes conservan los avisos de Pi, archivos de licencia distribuidos por
las dependencias y el LICENSE completo de Node con sus avisos de terceros.

Instalación, ayuda, versión, chat, llamada a herramienta, reanudación y retirada
del paquete comprobados en los cuatro runners nativos. El proyecto se crea en
la carpeta desde donde se invoca, incluyendo rutas con espacios; conexiones y
Python se guardan en datos del usuario. La prueba de macOS se corrigió para
comparar rutas físicas equivalentes `/var` y `/private/var`.
CI de instaladores del commit `77711dc071416fc781efadc4d1379b3da1a7c8fa`:
https://github.com/rubenfb23/research-pi/actions/runs/37005882068

Las 25 pruebas y la demo de veinte fits con auditoría pasaron en la CI científica:
https://github.com/rubenfb23/research-pi/actions/runs/37005882173
Además, el `.deb` se instaló y desinstaló en un contenedor Ubuntu 24.04 sin Node
preinstalado. En otro contenedor Debian Bookworm con Python 3.14, un usuario sin
privilegios ejecutó veinte fits reales desde el paquete: auditoría completa, sin
errores y venv en sus datos personales, ninguna escritura en `/opt/research-pi/app`.
Huella científica de esa ejecución empaquetada:
`cf055db6a46bd694cf4f6fc39d5396d64a2834ea770c71a107af45c1da2ca7b9`.

Pendientes: firma de editor en Windows, firma/notarización en macOS, arquitectura
ARM en Linux/Windows, experimentos Python verificados en Windows/macOS e inferencia
con cuentas reales. Continúan pendientes la licencia propia y el aviso transitivo
de Pi. No se modificaron ni eliminaron evidencias científicas de versiones anteriores.
La [guía de instalación](installation.md) documenta requisitos, carpetas y retirada.
