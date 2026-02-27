// ============================================================
// Tipos del Runtime de Bati
// ============================================================

/** Estado instantáneo de la señal en un punto del circuito */
export interface SignalState {
  voltage: number;
  current: number;
  resistance: number;
}

/** Estado de un puerto individual */
export interface PortState {
  v: number; // voltaje
  i: number; // corriente
  r: number; // resistencia vista desde este puerto
}

/** Estado completo de un componente en runtime */
export interface ComponentState {
  id: string;
  type: string;
  ports: Map<string, PortState>;
  /** Valores calculados adicionales (temperatura, etc.) */
  computed: Map<string, number>;
}

/** Nodo en el grafo del circuito */
export interface CircuitNode {
  id: string; // "SIGNAL", "GROUND", o "componentId.portId"
  edges: CircuitEdge[];
}

/** Arista del grafo (una conexión) */
export interface CircuitEdge {
  connectionId: string;
  from: string;
  to: string;
}

/** Configuración del runtime */
export interface RuntimeConfig {
  /** Intervalo del tick en milisegundos (default: 100ms) */
  tickInterval: number;
  /** Máximo de ticks antes de auto-stop (0 = infinito) */
  maxTicks: number;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  tickInterval: 100,
  maxTicks: 0,
};

/** Callback que SIGNAL_EXE emite cada tick */
export type SignalTickCallback = (voltage: number, tick: number, time: number) => void;

/** Eventos del estado global */
export type StateUpdateCallback = (componentId: string, state: ComponentState) => void;
