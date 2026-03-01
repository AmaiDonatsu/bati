# External Signal

Actualmente, la variable de entorno SIGNAL ha sido desarrollada integramente como función interna del interprete.

```bati
~~~
# SIGNAL
## ORIGEN:
- font: function
- function: $sin(x)$
- hz: 1
~~~
```

Pero, ahora vamos a implementar la posibilidad de conectar una fuente externa, estas fuentes externas serán de parte de medidores físicos, llamados "devices".

```bati
~~~
#  SIGNAL
## ORIGEN:
- font: device
- device: id_del_device
~~~
```

Cuando se quiere utilizar un device como fuente de señal, en la propiedad "font" se debe indicar "device".
Cuando se le pasa este valor a la propiedad, entonces la propiedad function ya no es esperada, la propiedad obligatoria ahora es device, y el valor que se le pasa es el id del device.

el device se conectará por medio de ws, especificamente en ws/device/{id_del_device}

El device enviará mensajes en formato json, con la siguiente estructura:

```json
{
  "id": "id_del_device",
  "value": "valor_de_la_señal"
}
```

al igual que SIGNAL_EXE envía las fluctuaciones de value al SIGNAL_FLOW con el mismo formato que este lo requiere.

solo cuando el device envíe actualizaciones, SIGNAL_EXE (en device externo) enviará las fluctuaciones de value al SIGNAL_FLOW.
