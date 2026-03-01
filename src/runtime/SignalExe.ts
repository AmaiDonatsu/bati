import type { Signal } from "../types";
import type { GlobalState } from "./GlobalState";
import type { RuntimeConfig, SignalTickCallback } from "./types";
import { DEFAULT_RUNTIME_CONFIG } from "./types";
import { evaluate } from "./mathEval";

// ============================================================
// SignalExe — Loop asíncrono de la fuente de señal
// ============================================================

export class SignalExe {
  private signal: Signal;
  private globalState: GlobalState;
  private config: RuntimeConfig;
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners: SignalTickCallback[] = [];
  private running = false;

  constructor(
    signal: Signal,
    globalState: GlobalState,
    config: Partial<RuntimeConfig> = {}
  ) {
    this.signal = signal;
    this.globalState = globalState;
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...config };
  }

  /** Suscribe un listener que se ejecuta cada tick */
  onTick(callback: SignalTickCallback): void {
    this.listeners.push(callback);
  }

  /** ¿El motor está en modo device externo? */
  isDeviceMode(): boolean {
    return this.signal.font === "device";
  }

  /** ID del device esperado (solo en modo device) */
  getExpectedDeviceId(): string | undefined {
    return this.signal.deviceId;
  }

  /** Inicia el loop de señal */
  start(): void {
    if (this.running) return;
    this.running = true;

    // En modo device, no hay loop interno — el voltaje llega por WS
    if (this.isDeviceMode()) {
      return;
    }

    // Evaluar el primer tick inmediatamente
    this.tick();

    // Loop cada tickInterval ms
    this.interval = setInterval(() => {
      this.tick();
    }, this.config.tickInterval);
  }

  /** Detiene el loop */
  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** ¿Está corriendo? */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Inyecta un voltaje externo (modo device).
   * Avanza el tick, actualiza el estado global y notifica a los listeners.
   */
  injectVoltage(voltage: number): void {
    if (!this.running) return;

    this.globalState.advanceTick(this.config.tickInterval);
    const { tick, time } = this.globalState;

    // Actualizar estado global
    this.globalState.signalVoltage = voltage;

    // Notificar listeners (esto propaga al SIGNAL_FLOW)
    for (const listener of this.listeners) {
      listener(voltage, tick, time);
    }
  }

  /** Ejecuta un tick de la señal */
  private tick(): void {
    this.globalState.advanceTick(this.config.tickInterval);
    const { tick, time } = this.globalState;

    // Calcular voltaje
    let voltage: number;

    if (!this.signal.isAC) {
      // DC: constante
      voltage = parseFloat(this.signal.functionExpr) || 0;
    } else {
      // AC: evaluar la función con x = tiempo modulado por hz
      const hz = this.signal.hz ?? 1;
      // x = 2π * hz * time (para que sin(x) oscile a la frecuencia correcta)
      const x = 2 * Math.PI * hz * time;

      const context: Record<string, number> = { x, t: time, hz };
      voltage = evaluate(this.signal.functionExpr, context);
    }

    // Actualizar estado global
    this.globalState.signalVoltage = voltage;

    // Notificar listeners
    for (const listener of this.listeners) {
      listener(voltage, tick, time);
    }

    // Auto-stop si hay máximo de ticks
    if (this.config.maxTicks > 0 && tick >= this.config.maxTicks) {
      this.stop();
    }
  }
}

