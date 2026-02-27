import type { ComponentState, PortState, StateUpdateCallback } from "./types";

// ============================================================
// GlobalState — Estado centralizado del circuito
// ============================================================

export class GlobalState {
  /** Voltaje actual de la fuente SIGNAL */
  signalVoltage = 0;

  /** Tick actual de la simulación */
  tick = 0;

  /** Tiempo actual en segundos */
  time = 0;

  /** Estado de cada componente (id → ComponentState) */
  private componentStates = new Map<string, ComponentState>();

  /** Listeners de actualización */
  private listeners: StateUpdateCallback[] = [];

  /** Registra un componente con estado inicial */
  register(id: string, type: string, portNames: string[]): void {
    const ports = new Map<string, PortState>();
    for (const name of portNames) {
      ports.set(name, { v: 0, i: 0, r: 0 });
    }
    this.componentStates.set(id, {
      id,
      type,
      ports,
      computed: new Map(),
    });
  }

  /** Actualiza el estado de un componente */
  update(id: string, updater: (state: ComponentState) => void): void {
    const state = this.componentStates.get(id);
    if (state) {
      updater(state);
      // Notificar listeners
      for (const listener of this.listeners) {
        listener(id, state);
      }
    }
  }

  /** Obtiene el estado de un componente */
  get(id: string): ComponentState | undefined {
    return this.componentStates.get(id);
  }

  /** Obtiene estado del puerto de un componente */
  getPortState(componentId: string, portName: string): PortState | undefined {
    return this.componentStates.get(componentId)?.ports.get(portName);
  }

  /** Obtiene un snapshot del estado completo */
  getSnapshot(): Map<string, ComponentState> {
    return new Map(this.componentStates);
  }

  /** Obtiene todos los IDs de componentes registrados */
  getComponentIds(): string[] {
    return [...this.componentStates.keys()];
  }

  /** Suscribe un listener para actualizaciones */
  onUpdate(callback: StateUpdateCallback): void {
    this.listeners.push(callback);
  }

  /** Avanza el tick */
  advanceTick(tickInterval: number): void {
    this.tick++;
    this.time = this.tick * (tickInterval / 1000);
  }
}
