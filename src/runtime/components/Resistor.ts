import { BaseComponent } from "./BaseComponent";

// ============================================================
// Resistor — Componente no polar
// ============================================================

export class Resistor extends BaseComponent {
  calculate(
    inputVoltage: number,
    totalCurrent: number
  ): { voltage: number; current: number; resistance: number } {
    const resistance = this.getResistance();

    if (resistance === 0) {
      // Cortocircuito — toda la corriente pasa
      return { voltage: inputVoltage, current: Infinity, resistance: 0 };
    }

    // Ley de Ohm: I = V / R
    const current = inputVoltage / resistance;
    // Caída de voltaje: V_drop = I * R
    const voltageDrop = current * resistance;

    return {
      voltage: voltageDrop,
      current,
      resistance,
    };
  }
}
