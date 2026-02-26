# Bati-Executor

## Resumen

El **Executor** es el motor de análisis sintáctico (parser) y simulación encargado de ejecutar los archivos `.bati`. **bati** es un lenguaje de programación declarativo diseñado para la creación, representación estructurada y simulación matemática de circuitos electrónicos.

El intérprete conceptualiza el circuito basándose en la Teoría de Grafos y Nodos, leyendo el archivo en tres fases claramente separadas:

1. Entorno y Señales
2. Declaración de Componentes
3. Topología de Conexiones (Netlist)

### 1. Cabecera y Variables de Entorno (Señales)

Todo archivo válido debe comenzar estrictamente con la declaración `# batita`. Inmediatamente después, se debe crear un bloque delimitado por virgulillas `~~~` que define el entorno global y la fuente de alimentación.

- **Sintaxis de la Señal (`# SIGNAL`)**: Dentro de este bloque, se utilizan almohadillas (`#`) para los bloques principales, doble almohadilla (`##`) para categorías, y guiones (`-`) para asignar valores.
  - `font`: Define la naturaleza de la fuente (ej. `function` para una fuente simulada internamente).
  - `function`: Espera una expresión matemática. Puede ser un valor estático para representar Corriente Continua (ej. `9` para 9 Voltios) o una fórmula LaTeX en función del tiempo para Corriente Alterna (ej. `$sin(x)$`).
  - `hz` (Opcional): Frecuencia de la señal. Si se omite y la función es estática, se procesa como Corriente Continua.

### 2. Declaración de Componentes

Después del bloque de entorno, se declaran todos los componentes eléctricos que existirán en el circuito, de forma totalmente aislada a sus conexiones.

- **Bloque Principal**: Se inicia con `# [TIPO_COMPONENTE]` (ej. `# RESISTOR`). El intérprete clasificará internamente el componente (activo, pasivo, polar o no polar) según su tipo.
- **Identificador**: Se declara con `- id: [nombre]` (ej. `R1`), este será el nombre único para ubicarlo en el grafo de simulación.
- **Puertos (`## inputs` y `## outputs`)**: Se enlistan explícitamente las terminales disponibles del componente. Ejemplo: `- input1`, `- output1`.
- **Valores Constantes (`## Values`)**: Parámetros intrínsecos físicos del componente. Para un resistor, se exige la propiedad `- resistance:`.
- **Comportamiento Matemático (`## functions`)**: Aquí radica el motor de simulación. Se declaran las leyes físicas que rigen el componente divididas por categorías lógicas (`### Ampere`, `### Voltaje`, etc.). El intérprete debe ser capaz de evaluar sintaxis matemática (LaTeX) utilizando variables internas del propio componente (ej. `$I = input1.v/resistance$`).

### 3. Topología de Conexiones (Netlist)

Al final del archivo se define cómo están interconectados los puertos de los componentes previamente declarados, estructurando la red o "grafo" del circuito.

- **Conexiones (`# CONNECTION`)**: Cada línea de cableado o nodo sumador se declara individualmente.
  - `- id`: Identificador único del cable/nodo (ej. `c0`).
  - `## from`: Nodo de origen de la conexión.
  - `## to`: Nodo de destino de la conexión.
- **Reglas de Nomenclatura**: Los orígenes y destinos se referencian usando sintaxis de punto: `[id_componente].[id_puerto]` (ej. `R1.input1`).
- **Nodos Globales**: Se utilizan las palabras reservadas `SIGNAL` para conectar un puerto directamente al origen de voltaje, y `GROUND` para cerrar el circuito a tierra.

### Lógica de Simulación (Flujo Asíncrono)

A diferencia de un flujo secuencial simple, el Executor ejecutará un proceso asíncrono que primero recopilará todas las `# CONNECTION` para "dibujar" una matriz de nodos. En cada tick de simulación (ej. cada `0.1` segundos `x`), el intérprete sustituirá los valores de la `# SIGNAL` en las `## functions` de los componentes interconectados, evaluando el sistema como un todo simultáneo. Esto permite detectar bucles paralelos, cortocircuitos y retroalimentación sin caer en bucles de lectura infinitos.

### Syntaxys a detalle

El archivo en su primera linea debe contener la clave `# batita`.
El siguiente bloque debe estar delimitado por virgulillas `~~~` y debe contener la definicion de las variables de entorno.

```
~~~
# SIGNAL
## ORIGEN:
- font: function
- function: 9
~~~
```

La variable de entorno SIGNAL es la fuente de alimentación del circuito, puede ser una constante o una función matemática si la fuente va a ser simulada internamente, por defecto es 9 voltios, o puede ser declarada como una fuente externa, cuando es una fuente externa, se espera estar recibiendo una señal de voltaje en tiempo de ejecución del script.

Para declarar el tipo de señal (externa o interna) dentro contiene la declaración ## ORIGEN:

dentro del origen se declaran sus propiedades enlistadas.
la principal es - font:
cuando esa propiedad tiene como valor `function` significa que la señal es interna y se espera que la siguiente propiedad sea `- function:`
function es la función matemática que define la señal, puede ser una constante o una función matemática en función de x, por defecto es 9 voltios.
Si es una constante se asume que es corriente continua, y esa sería su ultima propiedad declarada.
si es una función matemática, entonces significa que es corriente alterna, y se espera que la siguiente propiedad sea `- hz:`
hz es la frecuencia de la señal en hercios.

Los hercios son la unidad de medida por la cual estárá oscilando el valor de X, X son es el tiempo en el que los hercios se ejecutan, y por defecto, el salto de cada siclo es de 0.1 segundos.

Internamente, el ejecutor tiene funcionando una abstracción de la señal, la señal es la energía que se pasará a través de los compoenntes, en el entrno global, la señal solo tiene definido el Voltaje, aún no tiene definido la corriente ni la resistencia.

#### Componentes

Despues de la declaración de las variables de entorno, sigue declarar los componentes, los componentes se dividen en tres categorías.

- no polares
- polares
- activos

si un commponente es activo, automáticamente también es polar, si un componente es no polar o polar puede no ser activo.

en la lista de componentes no polares están

- RESISTOR
- CAPACITOR
- INDUCTOR

en la lista de componentes polares están

- LED
- DIODE

en la lista de componentes activos están

- OPAMP
- TRANSISTOR
- MOSFET

cuando se declara un componente como RESISTOR es:

# RESISTOR // tipo de componente

- id: r1 // identificador único del componente

## inputs // entradas del componente

- input1 // puerto de entrada
  // como el componente no es polar, no es necesario declarar que polaridad tiene el input

## outputs // salidas del componente

- output1 // puerto de salida
  // como el componente no es polar, no es necesario declarar que polaridad tiene el output

## Values // valores constantes del componente

- resistance: 1000 // resistencia en ohmios

## functions // funciones matemáticas del componente

// las funciones matemáticas definen que modificaciones va a sufrir la señal al pasar por el componente.

### Ampere

// dentro de la sección functions viene declarado cada propiedad de la señal, por lo que, no es necesario usar "$ I=...$, "$ V=...$" o "$ R=...$"
// arriba ya se declaró de que propiedad estámos hablando, cada función está enlistada, la propiedad de la señal va siendo modificada una a una por cada operación matemática que se declare.

- input1.v/resistance // corriente en amperios

// para obtener el amperaje, se obtiene primero el input1, del input 1 tomamos el voltaje que le está entrando, para especificar que estámos tomando el voltaje del input 1, usamos "input1.v" y se divide por la propiedad resistance, que fue declaradda en values, si en su entrada estuviera entrando una señal de 9 voltios, entonces el amperaje sería 9/1000 = 0.009 amperios.

### Voltaje

- input1.v\*resistance // voltaje en voltios

### Ohm

- input1.v/input1.i // resistencia en ohmios

### connections // conexiones del componente

- input1 // puerto de entrada
- output1 // puerto de salida
  el formato para declarar las conecciones es:

# CONNECTION

- id: c0 // identificador único de la conexión

## from: [id_componente].[id_puerto] // puerto de origen de la conexión

## to: [id_componente].[id_puerto] // puerto de destino de la conexión

## Logica: Como calcular y simular el flujo de señales a travez del circuito

## Lógica: Runtime
