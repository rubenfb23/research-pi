# Instalación de ResearchPi 0.2.2

Descarga el paquete de tu sistema en [GitHub Releases](https://github.com/rubenfb23/research-pi/releases).
Todos añaden el comando `repi` e incluyen un runtime Node, la CLI compilada, recursos,
fuentes, lockfiles, dependencias de producción y atribuciones. No requieren npm ni
compilar al arrancar. Los instaladores todavía no tienen firma de editor ni notarización.
Los archivos `.sha256` permiten comprobar que la descarga coincide con la publicada;
no sustituyen una firma del editor.

## Ubuntu / Debian · x64

```sh
sudo apt install ./research-pi_0.2.2_amd64.deb
repi
```

La aplicación se instala en `/opt/research-pi` y el comando en `/usr/bin/repi`.
El runtime necesita glibc >=2.28; la instalación se comprueba en Ubuntu 24.04.
No se necesita Python para abrir el chat. Para ejecutar la demo, instala Python 3.14
con soporte venv; Python 3.12 de Ubuntu 24.04 no cumple el entorno fijado del experimento.

Desinstalación: `sudo apt remove research-pi`. Los proyectos, conexiones y entornos
del usuario se conservan; no se eliminan datos de investigación automáticamente.

## Windows · x64

Abre `research-pi-0.2.2-windows-x64-setup.exe`. Se instala por usuario en
`%LOCALAPPDATA%\Programs\ResearchPi`, sin solicitar permisos de administrador,
y añade esa carpeta al PATH del usuario. Abre una terminal nueva y escribe `repi`.
El instalador y ejecutable se verifican en el runner nativo Windows de GitHub.
Al no estar firmado puede aparecer un aviso de Windows sobre editor desconocido.

Puedes desinstalar desde Aplicaciones instaladas o `Uninstall.exe` en esa carpeta.
Se elimina únicamente la entrada propia de PATH; los datos del usuario se conservan.
Python 3.14 accesible con el comando `python` es opcional para el runner científico.

## macOS · Apple Silicon / Intel

Escoge `research-pi-0.2.2-macos-arm64.pkg` para Apple Silicon o
`research-pi-0.2.2-macos-x64.pkg` para Intel. Abre el instalador y, después, una
terminal nueva: `repi`. También se puede instalar con:

```sh
sudo installer -pkg ./research-pi-0.2.2-macos-arm64.pkg -target /
```

Instala la aplicación en `/Library/ResearchPi` y el comando en `/usr/local/bin/repi`.
Los paquetes se construyen y prueban por separado en macOS 15 para cada arquitectura.
Al no tener firma ni notarización, macOS puede bloquear la apertura del instalador.
No se declara verificada la compatibilidad con otras versiones de macOS.

macOS no ofrece un desinstalador de CLI para este paquete. Para retirar únicamente
la aplicación y su recibo de instalación:

```sh
sudo rm -rf /Library/ResearchPi
sudo rm -f /usr/local/bin/repi
sudo pkgutil --forget com.researchpi.cli
```

No retires el comando si lo has sustituido manualmente por otra instalación.
Las conexiones, entornos de experimentos y proyectos del usuario quedan guardados.

## Datos y uso

La carpeta donde ejecutas `repi` es el proyecto; `--project <ruta>` selecciona otro.
Protocolos, resultados y conversaciones se guardan en `<proyecto>/.research-pi/`.
Las conexiones de los paquetes nativos y el entorno Python van en:

| Sistema | Datos del usuario |
| --- | --- |
| Linux | `$XDG_DATA_HOME/research-pi` o `~/.local/share/research-pi` |
| Windows | `%LOCALAPPDATA%\ResearchPi` |
| macOS | `~/Library/Application Support/ResearchPi` |

La aplicación no escribe en su carpeta de instalación. `RESEARCH_PI_DATA_DIR`
permite elegir una carpeta absoluta distinta para conexiones y Python.
Una instalación desde checkout conserva el almacenamiento anterior del repositorio;
no se copian secretos automáticamente entre métodos de instalación.

```sh
repi --help
repi connect codex
repi connect claude
repi models codex
repi --offline
repi --project ./mi-estudio demo
repi --project ./mi-estudio audit
```

`repi` abre el chat; el primer uso pide conexión. `--offline` prueba el harness
sin razonamiento ni llamadas a proveedores. La [guía de conexiones](connections.md)
explica ChatGPT, API keys y límites. Python 3.14 es necesario solo para experimentos;
sus dependencias se instalan en el entorno del usuario cuando se ejecutan.
No están verificadas aún las inferencias con cuentas reales de proveedores.

Si hay varias instalaciones, `which repi` (Linux/macOS) o `Get-Command repi`
(PowerShell) muestra cuál está usando la terminal. Un enlace npm con nvm puede tener
prioridad sobre el paquete nativo. Cambiar la versión activa de Node con nvm puede
requerir repetir `npm run install:cli` para ese prefijo. Para retirar el enlace npm:
`npm uninstall --global research-pi`; el checkout y sus datos se conservan.

## Construir los paquetes

En el sistema y arquitectura de destino, con Node >=22.19 y npm:

```sh
npm ci
npm run package:native -- deb
# macOS: npm run package:native -- macos
# Windows con NSIS instalado: npm run package:native -- windows
```

El builder utiliza `dpkg-deb`, `pkgbuild` o NSIS. Windows permite indicar
`RESEARCH_PI_MAKENSIS` con la ruta al compilador. Copia el Node de la máquina de
construcción y registra su versión, arquitectura y SHA-256 en `package-runtime.json`.
La CI usa Node 22.23.0 y pruebas de instalación, chat, persistencia y retirada del paquete.
Las pruebas de los paquetes no envían inferencias reales ni instalan Python.
La CI científica independiente verifica las 25 pruebas y la demo de veinte fits en Linux.
Los artefactos nativos se guardan durante catorce días y los paquetes publicados se
ofrecen como assets de la release. Las builds locales aparecen en `release/`.

El código propio se distribuye bajo [MIT](../LICENSE).
Las licencias de Pi, npm y Node se conservan; no se ha corregido el aviso transitivo
de Pi señalado en [integridad y dependencias](integrity.md).

La publicación automática se describe en [releases.md](releases.md).
