# Estado de implementación

H1: integración con Pi verificada mediante `npm run check`: compilación TypeScript,
llamada real a herramienta en el SDK con transporte simulado, sesión persistida,
reanudación y compactación real del SDK. El estado científico permanece intacto.
No se ha realizado todavía una llamada a un proveedor real.

H2–H4: en implementación.

ResearchPi usa el SDK de Pi 1.0.0 como dependencia; no modifica su núcleo.
La licencia MIT para el código propio queda como propuesta; hasta elegirla, el paquete
se declara UNLICENSED. Los avisos de Pi y de dependencias se conservan por separado.
