# Tiempo de ejecución de bati

## Resumen

En este archivo se profundizará sobre la lógica de la ejecución de bati [executor](./executor.md)

## Objetivo final

Actualmente bati es capaz de leer los archivos .bati y leer la sintaxys, buscar errores y mostrar advertencias, el objetivo final será tener el ejecutor capaz de correr el la simulación del circuito por completo.

## Logica: Signal

una vez revisado el archivo .bati, el ejecutor va a tomar el contenido de las variables de entorno y va a buscar # SIGNAL y sus propiedades
en la sección ## ORIGEN va a buscar la propiedad font y buscar que valor tiene, si su valor es function, debe buscar la propiedad function y obtener su valor (se debe mostrar un error si no se encuentra la propiedad function si el valor de font es function ).

ahí se pondrá la ejecución de SIGNAL_EXE, SIGNAL_EXE es un bloque de lógica que se ejecuta de forma asincrona en LOOP, cada iteración del loop se ejecutará cada .1s el valor de X será sustituido por el valor de la iteración actual y se obtendrá el valor al pasarlo por la funcion.

## Logica: SIGNAL_FLOW

aquí es importante tener la lógica declarada de los componentes, los componentes podrían crearse como clases, la clase componente, que a su vez podría heredar a los componentes espécificos, como RESISTOR, LED, AMP, etc.

es importante que tengan la caracteristica o categoría de polar, no polar o activo, los componentes activos pueden tener funcionalidades internas diferentes.

### Lógica: señal

El concepto de la señal dentro de bati es en realidad una abstracción más bien matemática tratandola como un potencial flujo que potencialmente ocurre por el circuito. es decir, dentro de SIGNAL_FLOW se establece una señal de 0V y no cambia hasta que se reciba valores de SIGNAL_EXE, si los valores de la señal son de una constante de 9V, entonces a la señal se le asigna en ese instante un valor de 9V.

el flujo se calcula en cada componente de forma relativa, y cada componente recibe una señal tomando en cuenta el resto del circuito de forma bidireccional.

- para esto es importante tener un estado global.

cada componente registra su actividad en el estado global, si son componentes que cambian su estado y comportamiento de como manejan el flujo de la señal con un ciclo o patrón fijo o variable de tiempo, este tiempo se sigue de forma asincrona y estos cambios se registran en el estado global.

- Ejemplo general:

por ejemplo en un circuito donde haya un diodo en el final del circuito y una resistencia en el medio y un capacitor en la entrada y la señal corriente alterna de entre 1 y 0. y comenzamos a observar desde la perspectiva de la resistencia en el medio, empezamos a leer la señal que está llegandole a la resistencia, en ese momento se traza un camino bidireccional para la resistencia, de la fuente a la salida,y se busca el camino que va a tomar la señal, si, en direccion de la entrada al capacitor, se encuentra que hay una conexión compartida con otra resistencia, calcula cuanta corriente le llega, al ser dividida por el circuito paralelo, si en ssu camino en dirección de la resistencia a la salida, no encuentra ningúna conexión directa a GROUND, entonces se asume que en realidad en ese punto no le está llegando señal, porque esa resistencia no está en un circuito que lo diriga a la salida, sin embargo, si efectivamente hay un componente conectado a tierra, en este caso el diodo, entonces ya está dentro del circuito. en un punto dado, la señal baja a 0, si el capacitor que estaba al inicio tenía una funciónalidad de mantenerse cargado cierta cantidad de tiempo, entonces dentro de ese capacitor se inicia una cuenta asincrona que dice cuanto tiempo se va a mantener la resistencia recibiendo señal, si el tiempo que dura la señal siendo 0, supera la cantidad de tiempo que el capacitor se mantiene cargado, entonces el capacitor avisa al estado global que ya no está devolviendo señal, el capacitor al estar observando al capacitor que no envía señal, entonces deja de recibir señal.

**Lógica Completa**

ejemplo

```bati
# RESISTOR
- id: r1
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r2
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r3
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r4
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r5
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# RESISTOR
- id: r6
## values
- resistance: x
## inputs
- input1
## outputs
- output1

# CAPACITOR
- id: c1
## values
- capacitance: x
## inputs
- input1
## outputs
- output1

# DIODE
- id: d1
## values
- voltage: x
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
## to: r2.input1

# CONNECTION
- id: cn3
## from: r1.output1
## to: r3.input1

# CONNECTION
- id: cn4
## from r3.output1
## to: c1.input1

# CONNECTION
- id: cn5
## from: c1.output1
## to: r4.input1

# CONNECTION
- id: cn6
## from: r2.output1
## to: r4.input1

# CONNECTION
- id: cn7
## from: r4.output1
## to: d1.input1

# CONNECTION
- id: cn8
## from: d1.output1
## to: r5.input1

# CONNECTION
- id: cn9
## from: d1.output1
## to: r6.input1

# CONNECTION
- id: cn10
## from: r6.output1
## to: GROUND

# CONNECTION
- id: cn11
## from: r5.output1
## to: GROUND

```

en el anterior ejemplo vemos un circuito que incluye 2 secciones que trabajan en paralelo, una linea en serie del r3 junto a c1 en serie con r2, ambas lineas salen de r1 y se reconectan en r4, y otra sección en paralelo de r5 y r6, salen de d1 y se reconectan a tierra.

en el caso de que quisieramos ver las propiedades en tiempo real de d1, como su temperatura, corriente, señal, etc.
nos enfocamos en d1, y se sigue el camino del d1 a la señal (SIGNAL), en el camino nos damos cuenta que, la señal directa nos llega de r4, y a r4 le llega la señal de c1 y r2 que se unen despues de estar en serie, a c1 le llega señal de r3, y a r 3 de r1, a r2 también le llega de r1. en dirección a ground, su salida parte a 2 direcciones, r5 y r6, y de ahí a ground, como estas dos lineas llegan a ground, está en un ciercuito cerrado.
d1 está atenta escuchando la señal que le llega de r4, y r4 a la señal que le llega de c1 y r2, ahí d1 comienza su ciclo de tiempo independiendte donde, a medida que pasa el tiempo puede comenzar a calentarse o mantener una temperatura especifica, atenta al estado global.

en un determinado momento, la señal fuente de cae su valor a 0v, dejando de trasmitir señal, entonces r4 pierde la señal que le llegaba de r2, pero, se da cuenta que sigue recibiendo de c1, c1 a su vez escucha que la sñeal dejó de llegar, por lo que inicia su proceso interno de descarga, ahora r4, ya no recibe la carga de ambas partes, solo está recibiendo la carga que le quedó temporalmente a c1, y d1 escucha ahora la señal que le llega de r4, y en tiempo de ejecución de su proceso interno asincrono de calcular su temperatura comienza a ajustarse según la señal que le está llegando.
es importante también para d1, tomar en cuenta la salida de su señal, si la salida de su señal pasa por la sección de resistencias en serie, una de las resistencias tiene una valor muy alto y la otra uno muy bajo, entonces, su temperatura puede subir mucho, pues se da cuenta que tiene un cambino directo hacia ground, no hay resistencia desde la fuente de r4 hacia ground, su señal casi no pasa por la resistencia de valor alto.
el valor se ajusta según como cambie el valor de los caminos.

### Nota:

aportación por parte de un experto en circuitos par aayudar a definir como se traza el camino en dirección del componente hacía la salida o GROUND ya que, también influye en como cambia o interactua con sus componentes

```
1. Rastrear la ruta hacia GROUND (El "Peso" de la Salida)
Desde el punto de vista de d1, lo que le importa de su salida no son los componentes individuales, sino la "resistencia total" que le oponen para llegar a GROUND.
Siguiendo tu ejemplo, la salida de d1 se parte en dos direcciones paralelas hacia las resistencias r5 y r6, y de ahí a GROUND.
La lógica del runtime debe explorar esos caminos hacia adelante y colapsarlos matemáticamente.
Si r5 y r6 están en paralelo, tu motor debe calcular su resistencia equivalente usando la fórmula de paralelos: Req=1/((1/r5)+(1/r6)). Si estuvieran en serie, simplemente se sumarían.
2. Determinar la Corriente "Jalada" (El Flujo Real)
Una vez que el motor calcula la resistencia total que hay desde la salida de d1 hasta la tierra, d1 ya puede saber exactamente cuánto flujo pasa por él.
La Lógica: El flujo no se define por lo que entra, sino por la fórmula de la Ley de Ohm: Corriente = Voltaje / Resistencia Total.
El componente d1 mira hacia atrás y ve qué voltaje le está entregando r4 (que a su vez viene de c1 y r2).
Luego, divide ese voltaje de entrada entre la Resistencia Equivalente que calculaste en su salida. Esa es la corriente real que lo está atravesando en ese instante.
3. El Principio del "Camino de Menor Resistencia"
Tu idea de calcular la ruta con menor resistencia se resuelve automáticamente con el cálculo de paralelos mencionado en el paso 1.
Como se menciona en tu documentación, si la salida pasa por dos resistencias y una tiene un valor muy alto y la otra uno muy bajo, d1 tiene un camino casi directo a tierra porque la señal casi no pasa por la resistencia alta.
Matemáticamente, si r5 es de 1Ω y r6 es de 1,000,000Ω, la resistencia equivalente de ambas será de casi 1Ω. Al ser la resistencia de salida tan baja, la corriente que atraviesa d1 será altísima, lo que provocará que su proceso interno asíncrono detecte este cambio y su temperatura suba drásticamente.
4. Actualización Dinámica mediante el Estado Global
El circuito no es estático. Como la capa SIGNAL_FLOW evalúa el sistema como un todo simultáneo de forma constante, d1 debe estar "escuchando" el estado global.
Cuando la fuente principal (SIGNAL_EXE) cae a 0V, el capacitor c1 inicia su proceso interno de descarga y asume el rol de enviar señal temporalmente a r4.
El estado global se actualiza con este nuevo voltaje (más bajo y en declive).
d1, al estar atento a la señal que le llega de r4, recalcula instantáneamente su flujo usando su resistencia de salida y ajusta sus variables (bajando su temperatura al disminuir el flujo) en tiempo de ejecución.
En resumen para tu código: La lógica que debes programar para cada componente al observar su salida es una recursión. El componente pregunta a su puerto de salida: "¿Cuál es la resistencia total desde aquí hasta GROUND?". El motor navega por las conexiones, suma las resistencias en serie, aplica fracciones a las que están en paralelo (dividiendo naturalmente el flujo por los caminos más fáciles), y le devuelve un solo número a d1. Con ese número y el voltaje de entrada, d1 calcula su estado.
```

### Lógica

Es importante recordar que para esto usaremos estados globales, la señal en realidad es relativa y depende del punto de vista del componente. el tiempo de los procesos de los componentes es independiente, inicia y termina de forma relativa al resto.
