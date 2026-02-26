# Primera versión de bati

## Resumen

revisar [executor](../theory/executor.md) para entender el objetivo de este proyecto.
elegí este entorno de ejecución de bun, porque considero que aporta recursos y trae incluidas varias funcionalidades que pueden ayudar, como el manejo de ws, que es necesario para la comunicación entre bati y los monitores.

El objetivo, es crear la primera versión de bati, su única funcionalidad actualmente, es verificar la sintaxys de los archivos .bati y reportar errores.

## Objetivo final

crear un programa funcional que pueda leer [batidemo6.bati](../theory/demo6.bati) y reportar errores.

al ejecutarlo se debe mostrar un log, que muestre todos los componentes declarados, al final mostrar cuantos componentes de cada tipo se encontraron, y mostrar si hay algún error de sintaxis.

## Logica

crear un revisor de sintaxis. y mostrar el log
