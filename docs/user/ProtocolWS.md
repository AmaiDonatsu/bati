# Protocolo WebSocket — Bati Runtime

El runtime de Bati levanta un servidor WebSocket (por defecto en el puerto `3400`) que permite a aplicaciones externas (frontends, osciloscopios, controladores) recibir datos de la simulación en tiempo real y enviar comandos.

### Endpoint

`ws://localhost:3400`

---

## Estructura de los Mensajes

Todos los mensajes intercambiados son objetos **JSON** con la siguiente estructura base:

```json
{
  "type": "tipo_de_mensaje",
  "payload": { ... datos ... }
}
```

---

## Mensajes del Servidor (Salida)

### 1. `snapshot`

Se envía automáticamente en cuanto un cliente se conecta. Proporciona el estado completo actual del circuito.

```json
{
  "type": "snapshot",
  "payload": {
    "signal": {
      "voltage": 9.0, // Voltaje actual de la fuente
      "tick": 150,    // Tick actual
      "time": 15.0    // Tiempo transcurrido en segundos
    },
    "components": {
      "R1": {
        "ports": {
          "input1": { "v": 9.0, "i": 0.003, "r": 1000 },
          "output1": { "v": 6.0, "i": 0.003, "r": 0 }
        }
      },
      "r2": { ... }
    }
  }
}
```

### 2. `tick`

Se emite en cada ciclo de la simulación (cada 100ms por defecto). Informa sobre el avance del tiempo y el voltaje de la señal principal.

```json
{
  "type": "tick",
  "payload": {
    "tick": 151,
    "time": 15.1,
    "voltage": 9.0
  }
}
```

### 3. `update`

Se envía cuando el estado de un componente cambia. **Solo se recibe si el cliente se ha suscrito previamente a ese componente.**

```json
{
  "type": "update",
  "payload": {
    "id": "R1",
    "ports": {
      "input1": { "v": 9.0, "i": 0.003, "r": 1000 },
      "output1": { "v": 6.0, "i": 0.003, "r": 0 }
    }
  }
}
```

### 4. `error`

Enviado cuando el servidor recibe un comando inválido o hay un fallo en la ejecución de una acción.

```json
{
  "type": "error",
  "payload": {
    "message": "Componente 'X' no encontrado"
  }
}
```

---

## Comandos del Cliente (Entrada)

Para interactuar con el servidor, el cliente debe enviar un objeto JSON con la propiedad `action`.

### 1. `subscribe`

Solicita recibir actualizaciones detalladas (`update`) de un componente específico.

**Envío:**

```json
{
  "action": "subscribe",
  "componentId": "R1"
}
```

_Nota: Actualmente solo se permite estar suscrito a un componente a la vez. Una nueva suscripción reemplaza la anterior._

### 2. `getSignal`

Solicita información inmediata sobre el estado de la señal y el tick actual. El servidor responderá con un mensaje de tipo `tick`.

**Envío:**

```json
{
  "action": "getSignal"
}
```

---

## Ejemplo Rápido (JavaScript)

```javascript
const socket = new WebSocket("ws://localhost:3400");

socket.onopen = () => {
  console.log("Conectado al runtime de Bati");

  // Suscribirse a un componente para recibir sus voltajes y corrientes
  socket.send(
    JSON.stringify({
      action: "subscribe",
      componentId: "R1",
    }),
  );
};

socket.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case "snapshot":
      console.log("Estado inicial del circuito:", msg.payload);
      break;
    case "tick":
      console.log(`Tick: ${msg.payload.tick} | V: ${msg.payload.voltage}V`);
      break;
    case "update":
      console.log(`Update de ${msg.payload.id}:`, msg.payload.ports);
      break;
    case "error":
      console.error("Error del servidor:", msg.payload.message);
      break;
  }
};
```
