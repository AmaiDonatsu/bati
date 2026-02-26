---
name: promptCompilerSkill
description: Reglas y lógica para compilar prompts a código
---

# Prompt Scripts

## ¿Qué es un Prompt Script?

Usualmente pensamos en programar como escribir código en algún lenguaje y luego transpilarlo a otro que a su vez se compila a binario, etc. Pero, me gusta el enfoque de **programar en texto normal** y que el **compilador sea el agente de IA**, el cual transpila el lenguaje español a código.

Un Prompt Script (`.md`) es un archivo Markdown que funciona como **código fuente en lenguaje natural**. El agente de IA lo interpreta, lo "compila" y genera el código real correspondiente. Es una nueva forma de programación donde la abstracción más alta es el lenguaje humano.

### Analogía con la programación tradicional

| Concepto Tradicional       | Equivalente en Prompt Script                |
| -------------------------- | ------------------------------------------- |
| Archivo `.py`, `.ts`, etc  | Archivo `.md` (Prompt Script)               |
| Compilador / Transpilador  | Agente de IA                                |
| Imports / Requires         | `[nombre](../../ruta/archivo.ts)` (enlaces) |
| Variables / Constantes     | Sección `## Contexto`                       |
| Docstrings / Comentarios   | Sección `## Resumen`                        |
| Return type / Output       | Sección `## Objetivo final`                 |
| Funciones / Bloques        | Sección `## Lógica: descripción`            |
| Tests / Validaciones       | Sección `## Requisitos`                     |
| Project structure          | Sección `## Estructura`                     |
| UX flow / Sequence diagram | Sección `## Flujo esperado`                 |
| Try/Catch / Warnings       | Sección `## Warning`                        |

---

## Estructura de los Prompt Scripts

### Encabezados y niveles de indentación

- `#` → **Título**: el nombre de la implementación que se hará. Solo uno por archivo.
- `##` → **Bloque general**: cuando una sección tiene 2 `#` es un bloque general de todo el script. Puede ser hijo de otras secciones; por ejemplo, si es un `## Resumen` en el top del archivo, es el resumen general. Si tiene más `#` está indentado para resumir solamente una sección específica.
- `###` → **Subsección**: hijo de un bloque `##`, para detallar partes específicas de esa sección.
- `####` → **Sub-subsección**: mayor granularidad dentro de una subsección.

> **Regla de indentación**: Cada nivel adicional de `#` indica que el contenido pertenece y detalla a la sección padre inmediata, similar a la indentación en Python o los bloques `{}` en JavaScript.

---

## Secciones del Lenguaje

### `# Título`

El título de la implementación que se hará. Es el nombre del "programa".

```md
# Tool Para contactar por email
```

---

### `## Resumen`

El resumen es el equivalente a los **docstrings** en Python que se ponen en el archivo o dentro de funciones, clases, etc. Explica _qué es_ y _para qué sirve_ el script.

- Con `##` en el top del archivo → es el resumen **general** de todo el script.
- Con más `#` dentro de secciones → resume solamente esa sección específica.

```md
## Resumen

Este es el primer paso para añadirle proactividad a Caro.
```

---

### `## Objetivo final`

El objetivo final es el resultado que se espera de la implementación, o el resultado esperado de cada sección. Es el equivalente a **declarar el return** de una función, o el resultado final de un programa, pero más abstracto y cualitativo en lugar de un valor fijo.

```md
## Objetivo final

El objetivo final es que Caro pueda enviar correos electrónicos a los usuarios
para recordarles sus tareas pendientes, o avisos.
```

> **Analogía**: `implementación() -> "esta implementación va a mostrar x en pantalla"` = `## Objetivo final: esta implementación va a mostrar x en pantalla`

#### Objetivos intermedios

Cuando una implementación es compleja, se puede desglosar en objetivos intermedios usando `## Objetivo intermedio`. Cada objetivo intermedio puede tener su propio `### Objetivo final (nombre)` para definir el resultado esperado de esa parte.

```md
## Objetivo intermedio

Desarrollar un sistema de triggers.

### Objetivo final (trigger)

Crear un sistema flexible y modularizable para activar una "notificación"...
```

---

### `## Contexto`

Es el equivalente a **declarar variables, constantes o importar librerías**. Proporciona toda la información previa necesaria para entenderel script, configuraciones del entorno, servicios externos, y cualquier dato relevante.

```md
## Contexto

En el proyecto de Firebase asociado a esta aplicación, hay activo un servicio
de Cloud Firestore...
```

El contexto también puede incluir **referencias a otros Prompt Scripts**:

```md
## PromptScript

[contexto](../PromptScripts.md)
```

---

### `## Lógica: título o descripción breve`

Los bloques de "código" promptado. Las secciones de lógica son los **bloques de instrucciones** que el agente debe ejecutar. Vienen con la estructura `## Lógica: título o descripción breve` seguido del prompt con las instrucciones paso a paso.

```md
## Lógica

En [Notificacion](../../src/api/logic/tools/trigger/Notification.ts) crea una
Clase Notification. Este al ser construido tiene una id y la id del usuario que
la activó, y un estado de [Status](../../src/api/logic/tools/trigger/types.ts)...
```

---

### `## Estructura`

Define **dónde** va cada pieza del código en el proyecto. Es el mapa de archivos y sus responsabilidades. Similar a definir la arquitectura del módulo.

```md
## Estructura

En [notifications](../../src/api/mcp/tools/Notifications.ts) crea la tool para
crear y poner a funcionar una notificación, la cual va a estar funcionando en el
[sse](../../src/api/routes/sse/sse-admin.ts)
```

---

### `## Flujo esperado`

Describe la secuencia de interacciones esperadas, similar a un **diagrama de secuencia** o una **user story** detallada. Se usa principalmente cuando hay interacción con UI o procesos multi-paso.

```md
## Flujo esperado

- El usuario estará dentro de la pantalla home
- En la esquina superior derecha debe estar disponible un botón con el icono del usuario
- Al presionar este botón se despliega hacia abajo una lista de opciones...
```

---

### `## Requisitos`

Lista de requerimientos específicos que la implementación debe cumplir. Es el equivalente a **test cases** o **criterios de aceptación**.

```md
## Requisitos

- Extrae el HTML
- Se itera sobre cada bloque de HTML
- Cada <div> cuenta como un "#" y la clase o id del div si está disponible...
```

---

### `## Warning`

Notas importantes, advertencias o dependencias que el agente debe tener en cuenta antes de comenzar. Similar a **pre-condiciones** o **constraints** en diseño de software.

```md
## Warning

Esta es una tarea más extensa que requiere de completar otros componentes
y funcionalidades de por medio.
```

---

## Referencias a archivos (Imports)

Los **enlaces de Markdown** funcionan como imports o declaración de variables. Cuando un Prompt Script referencia un archivo del proyecto, le dice al agente exactamente **dónde** debe trabajar.

### Sintaxis

```md
[NombreDescriptivo](../../ruta/al/archivo.ts)
```

### Tipos de referencia

| Tipo                                 | Ejemplo                                                      | Significado                     |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------- |
| **Archivo destino** (donde escribir) | `en [Notification](../../src/Notification.ts) crea...`       | "Crea/modifica este archivo"    |
| **Archivo contexto** (de donde leer) | `usa el middleware [isAuth](../../src/middleware/isAuth.ts)` | "Ten en cuenta este archivo"    |
| **Otro Prompt Script**               | `[contexto](../PromptScripts.md)`                            | "Lee este PS para más contexto" |
| **Archivo referencia**               | `en mi [env.example](../../.env.example) tengo...`           | "Referencia informativa"        |

---

## Simbología

### Modificadores de certeza

| Símbolo       | Significado                                                                                                     | Nivel      | Ejemplo                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| `*texto*`     | **Importancia alta** — el agente **tiene** que asegurarse de apegarse lo más posible a esa petición.            | Mandatorio | `*importante usar isAuth para verificar la autenticación*` |
| `~texto~`     | **Negociable** — el prompt, línea o bloque no está del todo definido, es negociable y es a criterio del agente. | Flexible   | `~el diseño del card puede variar~`                        |
| (sin símbolo) | **Normal** — instrucción estándar que debe seguirse pero permite interpretación razonable.                      | Estándar   | `crea una clase Notification`                              |

### Bloques de código como contexto

Los bloques de código dentro de un Prompt Script funcionan como **datos literales** o **ejemplos concretos** que dan contexto específico al agente. No son código a ejecutar, sino referencia.

````md
```js
const client = new MailtrapClient({
  token: TOKEN,
  testInboxId: 4402045,
});
```
````

---

## Orden recomendado de secciones

```
# Título
## Resumen
## Warning (si aplica)
## Objetivo final
## Objetivo intermedio (si aplica)
## Contexto
## Flujo esperado (si aplica)
## Requisitos (si aplica)
## Estructura
## Lógica: bloque 1
## Lógica: bloque 2
...
```

> **Nota**: No todas las secciones son obligatorias. El mínimo viable es: `# Título` + `## Objetivo final` + `## Lógica`.

---

## Reglas de compilación (para el agente)

1. **Leer completo primero**: El agente debe leer todo el Prompt Script completo antes de ejecutar cualquier acción.
2. **Seguir las referencias**: Todos los enlaces `[nombre](ruta)` deben ser resueltos y leídos para obtener contexto.
3. **Respetar la simbología**: `*` = mandatorio, `~` = flexible, sin símbolo = estándar.
4. **Validar contra objetivos**: Al finalizar, el resultado debe cumplir con el `## Objetivo final` y los `## Requisitos`.
5. **Respetar la estructura**: Los archivos deben crearse/modificarse exactamente donde indica la sección `## Estructura`.
6. **Seguir el flujo**: Si hay un `## Flujo esperado`, la implementación debe respetar esa secuencia de interacciones.
7. **Atender warnings**: Los `## Warning` deben considerarse antes de comenzar la implementación.

---

## Ejemplo mínimo completo

```md
# Crea mi script DocStractor

## Objetivo final

En [main.py](../../../scripts/docStractor/main.py) crear el código main del
script DocStractor.

DocStractor es un script que al ejecutarlo, pide en consola una url, extrae
el HTML, y lo convierte en un archivo .md.

## Requisitos

- Extrae el html
- Se itera sobre cada bloque de html
- Cada <div> cuenta como un "#"

## Lógica

_Los documentos se guardan en [iaDocs](../../iaDocs/)_

~El formato exacto de los nombres de archivo puede variar~
```
