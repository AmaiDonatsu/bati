import type { GlobalState } from "./GlobalState";
import type { SignalExe } from "./SignalExe";
import type { ComponentState } from "./types";

// ============================================================
// SignalWS — Servidor WebSocket para monitoreo en tiempo real
//            + recepción de señal de devices externos
// ============================================================

/** Mensaje del servidor → cliente */
interface WSServerMessage {
  type: "snapshot" | "update" | "tick" | "error";
  payload: unknown;
}

/** Mensaje del cliente → servidor */
interface WSClientMessage {
  action: "subscribe" | "unsubscribe" | "getSnapshot" | "getSignal";
  componentId?: string;
}

/** Mensaje de un device externo */
interface DeviceMessage {
  id: string;
  value: number;
}

/** Datos del cliente por socket */
interface ClientData {
  subscribedTo: string | null; // null = recibe todo
  isDevice: boolean; // true si es un socket de device externo
  deviceId: string | null; // id del device (solo si isDevice)
}

export class SignalWS {
  private globalState: GlobalState;
  private signalExe: SignalExe;
  private port: number;
  private server: ReturnType<typeof Bun.serve> | null = null;
  private clients = new Map<unknown, ClientData>();

  constructor(globalState: GlobalState, signalExe: SignalExe, port = 3400) {
    this.globalState = globalState;
    this.signalExe = signalExe;
    this.port = port;
  }

  /** Inicia el servidor WebSocket */
  start(): void {
    const self = this;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const tryPort = this.port + attempt;
      try {
        this.server = Bun.serve({
          port: tryPort,
          fetch(req, server) {
            const url = new URL(req.url);

            // Ruta /device/{id} → socket de device externo
            const deviceMatch = url.pathname.match(/^\/device\/(.+)$/);
            if (deviceMatch) {
              const deviceId = deviceMatch[1];
              const upgraded = server.upgrade(req, {
                data: {
                  subscribedTo: null,
                  isDevice: true,
                  deviceId,
                } as ClientData,
              });
              if (upgraded) return undefined;
            }

            // Ruta genérica → socket de monitor
            const upgraded = server.upgrade(req, {
              data: {
                subscribedTo: null,
                isDevice: false,
                deviceId: null,
              } as ClientData,
            });
            if (upgraded) return undefined;

            // Si no es WS, responder con info
            return new Response(
              JSON.stringify({
                service: "bati-runtime",
                ws: `ws://localhost:${tryPort}`,
                deviceMode: self.signalExe.isDeviceMode(),
                expectedDevice: self.signalExe.getExpectedDeviceId() ?? null,
                status: self.signalExe.isRunning() ? "running" : "stopped",
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );
          },
          websocket: {
            open(ws) {
              const data = ws.data as ClientData;
              self.clients.set(ws, data);

              if (data.isDevice) {
                // Socket de device — validar ID inmediatamente
                const expectedId = self.signalExe.getExpectedDeviceId();
                if (expectedId && data.deviceId === expectedId) {
                  console.log(
                    `  📡 Device "${data.deviceId}" conectado`
                  );
                  self.sendTo(ws, {
                    type: "snapshot",
                    payload: {
                      status: "connected",
                      expectedId,
                      message: `Device "${data.deviceId}" registrado correctamente.`,
                    },
                  });
                } else {
                  self.sendTo(ws, {
                    type: "error",
                    payload: {
                      message: `Device "${data.deviceId}" rechazado. El archivo .bati espera device "${expectedId ?? "ninguno"}".`,
                    },
                  });
                  console.log(
                    `  ⚠  Device "${data.deviceId}" rechazado (esperado: "${expectedId ?? "ninguno"}")`
                  );
                }
              } else {
                // Socket de monitor — enviar snapshot
                self.sendTo(ws, {
                  type: "snapshot",
                  payload: self.buildSnapshot(),
                });
              }
            },
            message(ws, message) {
              const data = self.clients.get(ws);
              if (!data) return;

              if (data.isDevice) {
                self.handleDeviceMessage(ws, data, message.toString());
              } else {
                self.handleMonitorMessage(ws, message.toString());
              }
            },
            close(ws) {
              const data = self.clients.get(ws);
              if (data?.isDevice) {
                console.log(
                  `  📡 Device "${data.deviceId}" desconectado`
                );
              }
              self.clients.delete(ws);
            },
          },
        });

        this.port = tryPort;

        // Suscribirse a updates del GlobalState
        this.globalState.onUpdate((componentId, state) => {
          this.broadcastUpdate(componentId, state);
        });

        // Suscribirse a ticks del SignalExe
        this.signalExe.onTick((voltage, tick, time) => {
          this.broadcastTick(voltage, tick, time);
        });

        console.log(
          `  🌐 WebSocket activo en ws://localhost:${this.port}`
        );
        if (this.signalExe.isDeviceMode()) {
          const devId = this.signalExe.getExpectedDeviceId();
          console.log(
            `  📡 Esperando device "${devId}" en ws://localhost:${this.port}/device/${devId}`
          );
        }
        return; // Éxito
      } catch (err: any) {
        if (err?.code === "EADDRINUSE" && attempt < maxRetries - 1) {
          continue;
        }
        console.log(
          `  ⚠  WebSocket no pudo iniciar (puerto ${tryPort} ocupado). La simulación continúa sin WS.`
        );
        return;
      }
    }
  }

  /** Detiene el servidor */
  stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    this.clients.clear();
  }

  // ── Device Messages ──────────────────────────────────────

  /** Procesa un mensaje de un device externo */
  private handleDeviceMessage(
    ws: unknown,
    data: ClientData,
    raw: string
  ): void {
    // Validar que el device esté autorizado
    const expectedId = this.signalExe.getExpectedDeviceId();
    if (!expectedId || data.deviceId !== expectedId) {
      this.sendTo(ws, {
        type: "error",
        payload: {
          message: `Device "${data.deviceId}" no autorizado. Se espera "${expectedId ?? "ninguno"}".`,
        },
      });
      return;
    }

    // Parsear mensaje del device
    let msg: DeviceMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendTo(ws, {
        type: "error",
        payload: { message: "JSON inválido del device" },
      });
      return;
    }

    // Validar estructura
    if (typeof msg.value !== "number") {
      this.sendTo(ws, {
        type: "error",
        payload: { message: "El campo 'value' debe ser un número." },
      });
      return;
    }

    // Validar que el id del mensaje coincide con el id del socket
    if (msg.id !== data.deviceId) {
      this.sendTo(ws, {
        type: "error",
        payload: {
          message: `El id del mensaje ("${msg.id}") no coincide con el id del device ("${data.deviceId}").`,
        },
      });
      return;
    }

    // ¡Todo válido! Inyectar el voltaje al motor
    this.signalExe.injectVoltage(msg.value);
  }

  // ── Monitor Messages ─────────────────────────────────────

  /** Procesa un mensaje de un cliente monitor */
  private handleMonitorMessage(ws: unknown, raw: string): void {
    let msg: WSClientMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.sendTo(ws, {
        type: "error",
        payload: { message: "JSON inválido" },
      });
      return;
    }

    const data = this.clients.get(ws);
    if (!data) return;

    switch (msg.action) {
      case "subscribe":
        if (msg.componentId) {
          const allIds = this.globalState.getComponentIds();
          const foundId = allIds.find(
            (id) => id.toLowerCase() === msg.componentId!.toLowerCase()
          );
          if (foundId) {
            data.subscribedTo = foundId;
            this.sendTo(ws, {
              type: "snapshot",
              payload: this.buildComponentPayload(foundId),
            });
          } else {
            this.sendTo(ws, {
              type: "error",
              payload: {
                message: `Componente '${msg.componentId}' no encontrado`,
                available: allIds,
              },
            });
          }
        }
        break;

      case "unsubscribe":
        data.subscribedTo = null;
        this.sendTo(ws, {
          type: "snapshot",
          payload: this.buildSnapshot(),
        });
        break;

      case "getSnapshot":
        this.sendTo(ws, {
          type: "snapshot",
          payload: this.buildSnapshot(),
        });
        break;

      case "getSignal":
        this.sendTo(ws, {
          type: "tick",
          payload: {
            voltage: this.globalState.signalVoltage,
            tick: this.globalState.tick,
            time: this.globalState.time,
          },
        });
        break;

      default:
        this.sendTo(ws, {
          type: "error",
          payload: {
            message: `Acción desconocida: '${(msg as any).action}'`,
            available: [
              "subscribe",
              "unsubscribe",
              "getSnapshot",
              "getSignal",
            ],
          },
        });
    }
  }

  // ── Broadcast ────────────────────────────────────────────

  /** Broadcast de update de componente (solo a monitors) */
  private broadcastUpdate(componentId: string, _state: ComponentState): void {
    const payload = this.buildComponentPayload(componentId);

    for (const [ws, data] of this.clients) {
      if (data.isDevice) continue; // No enviar a devices
      if (data.subscribedTo && data.subscribedTo !== componentId) continue;
      this.sendTo(ws, { type: "update", payload });
    }
  }

  /** Broadcast de tick (solo a monitors) */
  private broadcastTick(voltage: number, tick: number, time: number): void {
    const msg: WSServerMessage = {
      type: "tick",
      payload: { voltage, tick, time },
    };
    for (const [ws, data] of this.clients) {
      if (data.isDevice) continue; // No enviar a devices
      this.sendTo(ws, msg);
    }
  }

  /** Envía un mensaje a un cliente */
  private sendTo(ws: unknown, msg: WSServerMessage): void {
    try {
      (ws as any).send(JSON.stringify(msg));
    } catch {
      // Cliente desconectado
    }
  }

  // ── Snapshot builders ────────────────────────────────────

  /** Construye snapshot completo del circuito */
  private buildSnapshot(): object {
    const components: Record<string, object> = {};

    for (const id of this.globalState.getComponentIds()) {
      components[id] = this.buildComponentPayload(id);
    }

    return {
      signal: {
        voltage: this.globalState.signalVoltage,
        tick: this.globalState.tick,
        time: this.globalState.time,
      },
      components,
    };
  }

  /** Construye payload de un componente individual */
  private buildComponentPayload(componentId: string): object {
    const state = this.globalState.get(componentId);
    if (!state) return { id: componentId, error: "not found" };

    const ports: Record<string, { v: number; i: number; r: number }> = {};
    for (const [portName, ps] of state.ports) {
      ports[portName] = { v: ps.v, i: ps.i, r: ps.r };
    }

    const computed: Record<string, number> = {};
    for (const [key, val] of state.computed) {
      computed[key] = val;
    }

    return {
      id: state.id,
      type: state.type,
      ports,
      computed,
    };
  }
}

