# Qué protege el MVP

El proceso host decide qué recursos, herramientas y algoritmos admite. El agente Pi
no recibe read/bash/edit/write/codemode, extensiones descubiertas, código Python
arbitrario ni rutas elegidas por el modelo. Las herramientas científicas escriben
salidas específicas y no aceptan métricas, recibos o artefactos inventados como entrada.
El worker ejecuta únicamente estimadores permitidos con parámetros acotados y un
presupuesto congelado. Su entorno excluye claves de API heredadas.

El runner mantiene un journal con cadena de hashes, estados de cada intento y recibos;
el auditor coteja journal/recibos/artefactos y recalcula métricas desde predicciones.
Una seed completada no se repite al reanudar, y cualquier fallo/cancelación exige
`run --retry`. Los fallos históricos permanecen visibles, incluso si luego se completa
la cobertura. Un lock local impide congelaciones o runners simultáneos coordinados.
No se admite reducción automática de diez seeds. Teoría y experimentos deterministas
requieren un protocolo de no aplicabilidad; el runner actual no los ejecuta.

La compactación afecta solo la conversación Pi. La autoridad científica es el protocolo
congelado y el almacén externo a la conversación. Hashes de código fuente, worker y
lockfiles invalidan protocolos tras cambios. Cambios de datos, configuración o entorno
entre recibos invalidan agregación. Los informes y tablas se recalculan; no se confía
en un informe anterior solo porque su archivo diga `complete`.

El límite real es la autoridad de las herramientas concedidas al modelo. El host y
el usuario del sistema operativo son de confianza. El mismo usuario puede editar los
archivos y reconstruir todos los hashes, o modificar código/recursos de la aplicación.
No hay firma de un tercero, sandbox del host ni almacenamiento WORM. La cadena detecta
inconsistencias; no prueba ejecución frente a un adversario con control del host.
No concedas una terminal ni edición libre al agente si deseas mantener este límite.
Para esa amenaza más fuerte se necesita runner y almacén con identidad/permisos
independientes, aislamiento del proceso y recibos firmados fuera del alcance del agente.

Los gates causales y de manuscrito verifican estructura y enlaces. No prueban supuestos,
identificación, semántica de las citas, calidad científica ni preparación para publicación.
El manuscrito arbitrario solo se comprueba mediante su manifest estructurado; no se
presenta como detector completo de todas las afirmaciones de un PDF o de texto libre.

# Dependencias

Pi 1.0.0 distribuye un shrinkwrap con brace-expansion 5.0.9. `npm audit` identifica
GHSA-qhr7-859c-m2p7 y GHSA-6j4f-fj2g-mc7p (DoS por recursión), además de
GHSA-q2hr-2g5m-vwhr. `npm audit fix` y un override no actualizan ese paquete fijado
por el shrinkwrap. Se conserva Pi 1.0.0 sin parche silencioso al proveedor.
El harness no descubre recursos ni ofrece glob/terminal al modelo, pero el aviso
transitivo sigue pendiente de actualización upstream. No se declara un audit limpio.
El override esbuild 0.28.1 corrige GHSA-g7r4-m6w7-qqqr en la dependencia de tooling.

Revisar avisos y licencias al actualizar el SDK y ejecutar de nuevo las pruebas.
