# Guía de Sintaxis — Archivos `.bati`

Los archivos `.bati` describen circuitos electrónicos usando una sintaxis basada en Markdown. Se componen de tres bloques principales: **SIGNAL**, **componentes** y **conexiones**.

---

## Regla de Oro

La **primera línea** de todo archivo `.bati` debe ser:

```
# batita
```

Sin esta línea, el verificador de sintaxis rechazará el archivo.

---

## SIGNAL — Fuente de Señal

Define la fuente de energía del circuito. Se escribe dentro de un bloque `~~~`:

```
~~~
# SIGNAL
## ORIGEN:
- font: function
- function: 9
~~~
```

### Propiedades

| Propiedad  | Requerida | Descripción                                           |
| ---------- | --------- | ----------------------------------------------------- |
| `font`     | sí        | Tipo de fuente. Actualmente solo `function`           |
| `function` | sí        | Expresión de voltaje. Número para DC, fórmula para AC |
| `hz`       | no        | Frecuencia en Hertz (convierte la señal en AC)        |

### Señal DC (Corriente Continua)

Voltaje constante. La función es simplemente un número:

```
- function: 9
```

Esto produce una fuente de **9 voltios** constantes.

### Señal AC (Corriente Alterna)

Voltaje que varía en el tiempo. La función usa `$...$` con expresiones matemáticas:

```
- function: $sin(x)$
- hz: 1
```

Funciones disponibles: `sin`, `cos`, `tan`, `sqrt`, `abs`, `log`, `exp`, `pow`.

La variable `x` representa el ángulo en radianes (`x = 2π × hz × tiempo`).

---

## Componentes

Cada componente se declara con un encabezado `#` seguido del tipo en mayúsculas:

```
# RESISTOR
- id: R1
```

### Tipos de Componentes Soportados

| Tipo         | Categoría | Valor principal            |
| ------------ | --------- | -------------------------- |
| `RESISTOR`   | No polar  | `resistance` (Ω)           |
| `CAPACITOR`  | No polar  | `capacitance` (F)          |
| `INDUCTOR`   | No polar  | `inductance` (H)           |
| `DIODE`      | Polar     | `voltage` (V umbral)       |
| `LED`        | Polar     | `voltage` (V umbral)       |
| `OPAMP`      | Activo    | `amplification` (ganancia) |
| `TRANSISTOR` | Activo    | —                          |
| `MOSFET`     | Activo    | —                          |
| `BATIAMP`    | Activo    | —                          |

### Secciones de un Componente

Cada componente tiene hasta 4 secciones, todas con `##`:

#### `## values` — Valores del componente

Propiedades numéricas o expresiones que definen el comportamiento:

```
## values
- resistance: 1000
```

#### `## inputs` — Puertos de entrada

```
## inputs
- input1
```

#### `## outputs` — Puertos de salida

```
## outputs
- output1
```

#### `## functions` — Fórmulas (opcional)

Expresiones matemáticas con nombre, encerradas en `$...$`:

```
## functions
### Ampere
- $I = input1.v/resistance$
### Voltaje
- $V = I*R$
### Ohm
- $R = V/I$
```

### Ejemplo Completo de Componente

```
# RESISTOR
- id: R1
## values
- resistance: 1000
## inputs
- input1
## outputs
- output1
## functions
### Ampere
- $I = input1.v/resistance$
```

> **Nota:** El `id` no distingue entre mayúsculas y minúsculas en las conexiones. Puedes declarar `r1` y referirte a él como `R1.input1`. El orden de las secciones no importa.

---

## CONNECTION — Conexiones

Las conexiones unen los puertos de los componentes entre sí, con SIGNAL, o con GROUND:

```
# CONNECTION
- id: c0
## from: SIGNAL
## to: R1.input1
```

### Estructura

| Campo  | Formato                        | Descripción                        |
| ------ | ------------------------------ | ---------------------------------- |
| `id`   | texto                          | Identificador único de la conexión |
| `from` | `componente.puerto` o `SIGNAL` | Origen de la conexión              |
| `to`   | `componente.puerto` o `GROUND` | Destino de la conexión             |

### Endpoints Especiales

- **`SIGNAL`** — La fuente de señal del circuito
- **`GROUND`** — Tierra / referencia de 0V

### Formato de Puertos

Los puertos se referencian como `id.puerto`:

```
## from: R1.output1
## to: r2.input1
```

> **Importante:** Los dos puntos `:` después de `from` y `to` son obligatorios. `## from: R1.output1` es correcto, `## from R1.output1` dará error.

---

## Circuitos — Ejemplos

### Circuito DC Simple (2 resistores en serie)

```
# batita

~~~
# SIGNAL
## ORIGEN:
- font: function
- function: 9
~~~

# RESISTOR
- id: R1
## values
- resistance: 1000
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r2
## values
- resistance: 2000
## inputs
- input1
## outputs
- output1

# CONNECTION
- id: c0
## from: SIGNAL
## to: R1.input1

# CONNECTION
- id: c1
## from: R1.output1
## to: r2.input1

# CONNECTION
- id: c2
## from: r2.output1
## to: GROUND
```

**Resultado:** R1 = 3V / 3mA, r2 = 6V / 3mA.

### Circuito AC con Diodo

```
# batita

~~~
# SIGNAL
## ORIGEN:
- font: function
- function: $sin(x)$
- hz: 1
~~~

# RESISTOR
- id: r1
## values
- resistance: 1000
## inputs
- input1
## outputs
- output1

# DIODE
- id: d1
## values
- voltage: 0.7
## inputs
- input1
## outputs
- output1

# CONNECTION
- id: cn1
## from: SIGNAL
## to: r1.input1

# CONNECTION
- id: cn2
## from: r1.output1
## to: d1.input1

# CONNECTION
- id: cn3
## from: d1.output1
## to: GROUND
```

---

## Errores Comunes

| Error                   | Causa                          | Solución                        |
| ----------------------- | ------------------------------ | ------------------------------- |
| Falta `# batita`        | Primera línea no es `# batita` | Agregar `# batita` al inicio    |
| Falta `## from:`        | Conexión sin origen            | Agregar `## from: <endpoint>`   |
| Falta `:` en from/to    | `## from R1.output1`           | Cambiar a `## from: R1.output1` |
| Bloque SIGNAL sin `~~~` | Falta el cierre del bloque     | Cerrar con `~~~`                |
| Tipo desconocido        | `# MOTOR` (no existe)          | Usar un tipo válido de la tabla |
