# OpenCode Zen y Go

Revisado el **2 de octubre de 2026**. ResearchPi integra los proveedores del SDK de Pi `@earendil-works/pi-ai` y `@earendil-works/pi-coding-agent` **1.0.0**, fijados en [package-lock.json](../package-lock.json). No necesita ejecutar la aplicación OpenCode ni un servidor `opencode serve`.

## Conectar

Zen ofrece acceso por API a modelos seleccionados y factura las peticiones. Go ofrece planes de uso con API key. Obtén la clave en la consola de OpenCode y elige el producto que corresponda a tu cuenta. [Zen](https://opencode.ai/docs/zen/), [Go](https://opencode.ai/docs/go/).

```bash
# OpenCode Zen
repi connect opencode
repi

# OpenCode Go
repi connect opencode-go
repi
```

El asistente solicita la clave sin mostrarla y permite elegir el modelo. Para consultar el catálogo o seleccionar explícitamente uno:

```bash
repi models opencode
repi connect opencode --model claude-sonnet-4-6

repi models opencode-go
repi connect opencode-go --model glm-5.3-flash
```

Estos identificadores están presentes en el catálogo del SDK revisado. Que aparezcan en `models` **no certifica el acceso en tu cuenta**: la conexión guarda la selección y las credenciales; la primera respuesta real comprueba autenticación, disponibilidad y permisos. El catálogo instalado puede diferir del servicio actual. [Catálogo de Zen](https://opencode.ai/zen/v1/models), [catálogo de Go](https://opencode.ai/zen/go/v1/models), [código fijado del SDK](#fuentes-del-sdk).

## Credenciales

Los dos proveedores del SDK reconocen exactamente **`OPENCODE_API_KEY`**. No definen `OPENCODE_GO_API_KEY` ni `OPENCODE_ZEN_API_KEY`. Si se establece aquella variable, ambos pueden usar su mismo valor. Una clave guardada para un proveedor tiene prioridad sobre la variable de entorno. [Código fijado del SDK](#fuentes-del-sdk).

ResearchPi guarda las entradas de autenticación bajo los identificadores distintos `opencode` y `opencode-go`. Por tanto, conectar o desconectar uno no debe sobrescribir la credencial guardada del otro. Esta separación local no significa que OpenCode exija emitir dos claves distintas: su documentación no establece esa obligación. [Código fijado del SDK](#fuentes-del-sdk), [conexiones de ResearchPi](connections.md).

## Rutas y formatos

El SDK conserva el formato de API definido para cada modelo; no trata todos los modelos como si tuvieran una única API compatible con OpenAI. Las rutas de servicio documentadas son:

| Servicio | Mensajes Anthropic | Chat Completions | Responses |
| --- | --- | --- | --- |
| Zen | `https://opencode.ai/zen/v1/messages` | `https://opencode.ai/zen/v1/chat/completions` | `https://opencode.ai/zen/v1/responses` |
| Go | `https://opencode.ai/zen/go/v1/messages` | `https://opencode.ai/zen/go/v1/chat/completions` | `https://opencode.ai/zen/go/v1/responses` |

Zen también publica modelos con formato Google bajo `/zen/v1/models/<modelo>`. [Endpoints oficiales de Zen](https://opencode.ai/docs/zen/#endpoints), [endpoints oficiales de Go](https://opencode.ai/docs/go/#endpoints).

En el catálogo de Pi, los modelos Anthropic tienen `baseUrl` sin `/v1` (`https://opencode.ai/zen` o `https://opencode.ai/zen/go`); su adaptador añade la ruta correspondiente. Los modelos OpenAI y Google revisados tienen la base con `/v1`. Debe conservarse esa configuración al usar el SDK. [Código fijado del SDK](#fuentes-del-sdk).

Go pide que el cliente se identifique con un `User-Agent` propio y envíe un identificador estable por conversación en `x-opencode-session`. Está orientado a peticiones típicas de agentes de programación; esta integración no acredita que el proveedor acepte cualquier uso de investigación. ResearchPi envía `User-Agent: ResearchPi/<versión>` y `x-opencode-client: ResearchPi`; Pi añade la cabecera de sesión con el identificador de la conversación, conservado al reanudarla. [Requisitos de Go para clientes](https://opencode.ai/docs/go/#where-can-i-use-it), [código fijado del SDK](#fuentes-del-sdk).

## Verificación y límites

La revisión del SDK confirmó 79 modelos de chat Zen y 29 Go en su catálogo instalado, sus formatos, sus bases y la resolución de API key. Es una comprobación local sin credenciales reales. Las pruebas con respuestas HTTP simuladas comprueban selección, rutas de siete combinaciones proveedor/formato, cabeceras, almacenamiento separado, llamadas a herramientas y sesión estable al reanudar. No acreditan una inferencia contra OpenCode.

Sin una API key válida siguen pendientes la autenticación real, las respuestas reales y el uso de herramientas con cada modelo. Los límites, saldos, disponibilidad y políticas deben comprobarse en la cuenta del proveedor. Go permite configurar el uso del saldo Zen al agotar su cuota; esa opción pertenece a la consola y ResearchPi no la activa. [Go](https://opencode.ai/docs/go/#usage-beyond-limits).

## Fuentes del SDK

Fuentes primarias inspeccionadas en la instalación fijada por [package-lock.json](../package-lock.json), dentro de `node_modules` tras `npm ci`:

- `@earendil-works/pi-ai/dist/providers/opencode.js` y `opencode-go.js`: identificadores, autenticación y adaptadores.
- `@earendil-works/pi-ai/dist/providers/data/opencode.json` y `opencode-go.json`: catálogo, formato y base de cada modelo.
- `@earendil-works/pi-ai/dist/auth/helpers.js`: clave guardada antes que variable de entorno; solicitud de tipo `secret`.
- `@earendil-works/pi-ai/dist/env-api-keys.js`: ambos proveedores usan `OPENCODE_API_KEY`.
- `@earendil-works/pi-ai/dist/providers/opencode-headers.js`: `x-opencode-session` a partir de `sessionId`.
- `@earendil-works/pi-coding-agent/dist/core/auth-storage.js`: almacenamiento indexado por identificador de proveedor.

La versión fijada hace reproducible esta revisión. Actualizar Pi requiere revisar de nuevo estos detalles y ejecutar las pruebas de integración.
