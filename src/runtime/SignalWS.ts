import type { GlobalState } from "./GlobalState";
import type { SignalExe } from "./SignalExe";
import type { ComponentState } from "./types";

// ============================================================
// SignalWS — Servidor WebSocket para monitoreo en tiempo real
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

/** Datos del cliente por socket */
interface ClientData {
  subscribedTo: string | null; // null = recibe todo
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

    this.server = Bun.serve({
      port: this.port,
      fetch(req, server) {
        // Upgrade HTTP → WebSocket
        const upgraded = server.upgrade(req, {
          data: { subscribedTo: null } as ClientData,
        });
        if (upgraded) return undefined;

        // Si no es WS, responder con info
        return new Response(
          JSON.stringify({
            service: "bati-runtime",
            ws: `ws://localhost:${self.port}`,
            status: self.signalExe.isRunning() ? "running" : "stopped",
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      },
      websocket: {
        open(ws) {
          self.clients.set(ws, ws.data as ClientData);
          // Enviar snapshot al conectarse
          self.sendTo(ws, {
            type: "snapshot",
            payload: self.buildSnapshot(),
          });
        },
        message(ws, message) {
          self.handleMessage(ws, message.toString());
        },
        close(ws) {
          self.clients.delete(ws);
        },
      },
    });

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
  }

  /** Detiene el servidor */
  stop(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    this.clients.clear();
  }

  /** Procesa un mensaje del cliente */
  private handleMessage(ws: unknown, raw: string): void {
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
          // Verificar que existe
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
            available: ["subscribe", "unsubscribe", "getSnapshot", "getSignal"],
          },
        });
    }
  }

  /** Broadcast de update de componente */
  private broadcastUpdate(componentId: string, state: ComponentState): void {
    const payload = this.buildComponentPayload(componentId);

    for (const [ws, data] of this.clients) {
      // Si está suscrito a un componente específico, filtrar
      if (data.subscribedTo && data.subscribedTo !== componentId) continue;
      this.sendTo(ws, { type: "update", payload });
    }
  }

  /** Broadcast de tick */
  private broadcastTick(voltage: number, tick: number, time: number): void {
    const msg: WSServerMessage = {
      type: "tick",
      payload: { voltage, tick, time },
    };
    for (const [ws] of this.clients) {
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
