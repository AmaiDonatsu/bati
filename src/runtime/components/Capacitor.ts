import type { GlobalState } from "../GlobalState";
import { BaseComponent } from "./BaseComponent";

// ============================================================
// Capacitor — Componente no polar con carga/descarga
// ============================================================

export class Capacitor extends BaseComponent {
  private chargeVoltage = 0;
  private charging = false;
  private dischargeTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Tiempo de descarga en ms.
   * Simplificado: τ = R * C (constante de tiempo RC)
   * Descarga completa ≈ 5τ
   */
  private getDischargeTimeMs(): number {
    const capacitance = this.getCapacitance();
    const resistance = this.getResistance();
    // Si no tiene resistencia propia, usar un valor por defecto
    const r = resistance > 0 ? resistance : 1000;
    // τ = R * C en segundos, convertir a ms, multiplicar por 5 para descarga completa
    return r * capacitance * 5 * 1000;
  }

  calculate(
    inputVoltage: number,
    totalCurrent: number,
    globalState: GlobalState
  ): { voltage: number; current: number; resistance: number } {
    const capacitance = this.getCapacitance();

    if (inputVoltage > 0) {
      // Cargando: el capacitor se carga al voltaje de entrada
      this.charging = true;
      this.chargeVoltage = inputVoltage;

      // Si había un timer de descarga, cancelarlo
      if (this.dischargeTimer) {
        clearTimeout(this.dischargeTimer);
        this.dischargeTimer = null;
      }

      return {
        voltage: inputVoltage,
        current: totalCurrent,
        resistance: 0, // Capacitor idealmente no tiene resistencia DC steady-state
      };
    }

    // Señal cayó a 0 — iniciar descarga
    if (this.charging && this.chargeVoltage > 0) {
      this.charging = false;
      const dischargeTime = this.getDischargeTimeMs();

      // Descarga gradual
      if (!this.dischargeTimer) {
        const startVoltage = this.chargeVoltage;
        const startTick = globalState.tick;
        const dischargeTicks = Math.max(1, Math.floor(dischargeTime / 100));

        // Simular descarga exponencial simplificada
        this.dischargeTimer = setTimeout(() => {
          this.chargeVoltage = 0;
          this.dischargeTimer = null;
        }, dischargeTime);
      }

      // Durante la descarga, el voltaje decrece
      const elapsed = (globalState.tick - globalState.tick) * 100; // ms since discharge started
      const tau = this.getDischargeTimeMs() / 5;
      const decay = Math.exp(-elapsed / tau);
      this.chargeVoltage *= 0.95; // Descarga simplificada por tick

      return {
        voltage: this.chargeVoltage,
        current: this.chargeVoltage > 0 ? totalCurrent * (this.chargeVoltage / (inputVoltage || 1)) : 0,
        resistance: 0,
      };
    }

    // Sin carga
    return { voltage: 0, current: 0, resistance: Infinity };
  }

  /** Limpieza al destruir */
  destroy(): void {
    if (this.dischargeTimer) {
      clearTimeout(this.dischargeTimer);
      this.dischargeTimer = null;
    }
  }
}
