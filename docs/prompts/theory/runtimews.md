# Monitor ws

## Resumen

Para poder usarse por otros programas, lo más facil que se me ocurre es que el ejecutor tenga un servidor websocket y que los otros programas se conecten a él y reciban los datos en tiempo real.

## Lógica

Ya que, en teoría, los cambios de los componentes son registrados en estado global, podría ser posible que el ejecutor tenga un servidor websocket que envíe los cambios del estado global a los clientes conectados.

Bati sería como un sistema instalado en sus computadoras, y los programas simplemente se conectan a él y reciben los datos en tiempo real.
