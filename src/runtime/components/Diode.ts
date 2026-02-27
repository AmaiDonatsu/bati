import { BaseComponent } from "./BaseComponent";

// ============================================================
// Diode — Componente polar (conduce en una sola dirección)
// ============================================================

export class Diode extends BaseComponent {
  /** Voltaje de activación del diodo (umbral forward) */
  private readonly forwardVoltage: number;

  constructor(definition: import("../../types").Component) {
    super(definition);
    // Voltaje de activación por defecto: 0.7V para silicio
    this.forwardVoltage = this.values["voltage"] ?? 0.7;
  }

  override calculate(
    inputVoltage: number,
    totalCurrent: number
  ): { voltage: number; current: number; resistance: number } {
    // El diodo solo conduce si el voltaje supera el umbral
    if (inputVoltage >= this.forwardVoltage) {
      // Conduce: cae el voltaje forward + pasa la corriente
      const outputVoltage = inputVoltage - this.forwardVoltage;
      return {
        voltage: this.forwardVoltage, // caída en el diodo
        current: totalCurrent,
        resistance: 0, // resistencia despreciable cuando conduce
      };
    }

    // No conduce: circuito abierto
    return {
      voltage: 0,
      current: 0,
      resistance: Infinity,
    };
  }

  /** Actualiza el estado con la caída del diodo */
  override updateState(
    globalState: import("../GlobalState").GlobalState,
    voltage: number,
    current: number,
    resistance: number
  ): void {
    globalState.update(this.id, (state) => {
      for (const inputName of this.inputNames) {
        state.ports.set(inputName, { v: voltage, i: current, r: resistance });
      }
      // Output: voltaje después de la caída del diodo
      const outputV = voltage >= this.forwardVoltage ? voltage - this.forwardVoltage : 0;
      const outputI = voltage >= this.forwardVoltage ? current : 0;
      for (const outputName of this.outputNames) {
        state.ports.set(outputName, { v: outputV, i: outputI, r: resistance });
      }
    });
  }
}
