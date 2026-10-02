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
La publicación de los commits y resultado remoto de CI se verifican en la entrega.

ResearchPi usa el SDK de Pi 1.0.0 como dependencia; no modifica su núcleo.
La licencia MIT para el código propio queda como propuesta; hasta elegirla, el paquete
se declara UNLICENSED. Los avisos de Pi y de dependencias se conservan por separado.
