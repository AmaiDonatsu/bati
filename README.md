# Bati

Bati es un motor de simulación de circuitos electrónicos impulsado por un lenguaje de marcado basado en Markdown. Permite definir componentes (resistencias, capacitores, diodos), conectarlos a fuentes de señal (DC o AC), y visualizar el flujo de voltaje y corriente en tiempo real.

---

## Arquitectura Técnica

El entorno de ejecución (Runtime) de Bati está diseñado en tres subsistemas asíncronos que operan de forma independiente para garantizar una simulación fluida y en tiempo real:

1. **`SIGNAL_EXE` (Motor de Ticks)**
   Es el "reloj" interno del simulador. Ejecuta un bucle continuo (por defecto cada 100ms) que avanza el tiempo de la simulación.
   - Genera el voltaje de la fuente para cada instante $t$.
   - Maneja señales DC (corriente continua constante) y AC (corriente alterna mediante funciones matemáticas como `$sin(x)$`).
   - Propaga los "ticks" al resto del sistema.

2. **`SIGNAL_FLOW` (Motor Físico / Eléctrico)**
   Se encarga de resolver matemáticamente el circuito.
   - Recibe los "ticks" de `SIGNAL_EXE`.
   - Lee el grafo de conexiones (nodos paralelos, series, caminos hacia el `GROUND`).
   - Resuelve la **Ley de Ohm** y modelos más complejos de componentes (por ejemplo, caídas de tensión en diodos) calculando recíprocos para resistencias equivalentes.
   - Actualiza el `GlobalState` con los voltajes ($V$), corrientes ($I$) y resistencias ($R$) de cada puerto en los componentes.

3. **`SIGNAL_MONITOR` (Capa de Observación e Interfaces)**
   Externa la información de la simulación hacia el usuario o aplicaciones terceras. Se divide en dos componentes:
   - **Consola Interactiva (CLI):** Provee un prompt interactivo (`bati>`) en la terminal donde se pueden ejecutar comandos como `monitor`, `status`, `signal` y `list` sin interrumpir el flujo.
   - **Servidor WebSocket (`SignalWS`):** Levanta un servidor nativo en el puerto `3400` que transmite el estado de la red (snapshots y updates) a 10 fps. Ideal para frontends, osciloscopios web, o agentes de IA.

---

## ¿Por qué elegimos Bun?

El proyecto está desarrollado en **TypeScript** y utiliza **Bun** como entorno de ejecución (runtime) por decisiones técnicas clave:

- **Ejecución y Parseo Inmediato:** Bun ejecuta TypeScript de forma nativa e instantánea, eliminando el paso de compilación (`tsc`). Considerando que Bati parsea scripts en texto plano (`.bati`), la latencia nula de arranque de Bun ofrece una experiencia extremadamente fluida al lanzar nuevas simulaciones.
- **WebSocket Server Nativo:** Bati requiere hacer streaming de la simulación a altas frecuencias. A diferencia de Node.js donde se requerirían dependencias como `ws` o `socket.io`, Bun incluye `Bun.serve()` que maneja conexiones WebSocket nativas con un rendimiento superior y menos overhead de memoria.
- **Tooling Integrado:** Bun absorbe las responsabilidades de Node, npm, Jest/Vitest y Webpack. Usamos el built-in test runner (`bun test`) que ejecuta nuestras validaciones del parser y del motor eléctrico en milisegundos, fundamental para la metodologí TDD/Vibe Coding aplicada en el proyecto.
- **Rendimiento:** El motor `WebCore` de Bun (JavaScriptCore) ha demostrado ofrecer un mejor rendimiento sostenido en bucles de cálculo matemáticos cerrados (como el algoritmo recursivo de `SIGNAL_FLOW`) frente a V8 (Node).

---

## 📖 Documentación

- **[Guía de Sintaxis](docs/user/sintaxys.md)** — Aprende a escribir archivos `.bati`.
- **[Guía de Usuario / Consola](docs/user/UserGuide.md)** — Aprende a operar el `SIGNAL_MONITOR`.
