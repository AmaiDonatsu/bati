# Guía de Usuario — Consola SIGNAL_MONITOR

## Inicio Rápido

Para iniciar la simulación de un archivo `.bati`:

```bash
bun run index.ts <ruta-del-archivo.bati>
```

**Ejemplo:**

```bash
bun run index.ts docs/prompts/theory/demo5.bati
```

Si la sintaxis es válida, verás el reporte de análisis y luego la consola interactiva:

```
  ⚡ BATI Runtime — Simulación Activa
  Escribe 'help' para ver los comandos disponibles.

bati>
```

A partir de aquí, la simulación está corriendo en segundo plano. Cada **100ms** se ejecuta un tick donde la señal se propaga por el circuito completo.

---

## Comandos

### `monitor <id>`

Monitorea un componente **en tiempo real**. Muestra voltaje, corriente y resistencia actualizándose cada tick.

```
bati> monitor R1
  📊 Monitoreando R1 (Ctrl+C o 'unmonitor' para detener)
  RESISTOR R1 (tick 42, t=4.20s)
    input1: v: 3.0000  i: 0.003000  r: 1.00kΩ
    output1: v: 0.0000  i: 0.003000  r: 1.00kΩ
```

> **Nota:** El `<id>` no distingue entre mayúsculas y minúsculas. `monitor r1`, `monitor R1` y `monitor r1` funcionan igual.

Para dejar de monitorear:

```
bati> unmonitor
```

---

### `status <id>`

Muestra el estado actual de un componente en un instante puntual (no se refresca automáticamente como `monitor`).

```
bati> status r2
  RESISTOR r2 (tick 15, t=1.50s)
    input1: v: 6.0000  i: 0.003000  r: 2.00kΩ
    output1: v: 0.0000  i: 0.003000  r: 2.00kΩ
```

**Valores mostrados:**

| Campo | Significado                | Unidad             |
| ----- | -------------------------- | ------------------ |
| `v`   | Voltaje en el puerto       | Voltios (V)        |
| `i`   | Corriente que circula      | Amperios (A)       |
| `r`   | Resistencia del componente | Ohmios (Ω, kΩ, MΩ) |

---

### `list`

Lista **todos** los componentes del circuito con su estado actual.

```
bati> list

  RESISTOR R1
    input1: v=3.0000  i=0.003000  r=1.00kΩ
    output1: v=0.0000  i=0.003000  r=1.00kΩ
  RESISTOR r2
    input1: v=6.0000  i=0.003000  r=2.00kΩ
    output1: v=0.0000  i=0.003000  r=2.00kΩ
```

---

### `signal`

Muestra el estado actual de la **fuente de señal** (SIGNAL).

```
bati> signal

  📡 SIGNAL
    voltage: 9.0000V
    tick:    42
    time:    4.200s
```

- **voltage**: El voltaje instantáneo que la fuente está emitiendo.
- **tick**: Número de ciclos ejecutados desde el inicio.
- **time**: Tiempo transcurrido en segundos.

En señales **DC**, el voltaje es constante. En señales **AC** (`sin(x)`), el voltaje oscila con la frecuencia definida en `hz`.

---

### `stop`

Detiene la simulación y cierra la consola.

```
bati> stop

  ⏹  Simulación detenida.
```

También puedes usar `exit` o `quit`.

---

### `help`

Muestra la lista de comandos disponibles.

```
bati> help

  Comandos disponibles:
    monitor <id>    Monitorea un componente en tiempo real
    unmonitor       Deja de monitorear
    status <id>     Muestra estado actual de un componente
    list            Lista todos los componentes y su estado
    signal          Muestra estado de la fuente de señal
    stop            Detiene la simulación
    help            Muestra esta ayuda
```

---

## Ejemplo Completo

Archivo `demo5.bati`: circuito DC con 2 resistores en serie (R1=1kΩ, r2=2kΩ a 9V).

```bash
$ bun run index.ts docs/prompts/theory/demo5.bati

# ... (reporte de sintaxis) ...

  🚀 Iniciando simulación...

  ⚡ BATI Runtime — Simulación Activa

bati> signal
  📡 SIGNAL
    voltage: 9.0000V

bati> monitor R1
  RESISTOR R1 (tick 5, t=0.50s)
    input1: v: 3.0000  i: 0.003000  r: 1.00kΩ

bati> unmonitor
bati> list
  RESISTOR R1
    input1: v=3.0000  i=0.003000  r=1.00kΩ
  RESISTOR r2
    input1: v=6.0000  i=0.003000  r=2.00kΩ

bati> stop
  ⏹  Simulación detenida.
```

**¿Por qué R1 tiene 3V y r2 tiene 6V?**

Según la Ley de Ohm, en un circuito en serie la corriente es igual en todos los componentes:

- **I** = V_total / R_total = 9V / 3000Ω = **0.003A** (3mA)
- **V_R1** = I × R1 = 0.003 × 1000 = **3V**
- **V_r2** = I × R2 = 0.003 × 2000 = **6V**

El voltaje se reparte proporcionalmente a la resistencia de cada componente (divisor de voltaje).
