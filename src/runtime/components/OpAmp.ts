import type { Component } from "../../types";
import type { GlobalState } from "../GlobalState";
import { evaluate } from "../mathEval";
import { BaseComponent } from "./BaseComponent";

// ============================================================
// OpAmp — Componente activo (Amplificador Operacional)
// ============================================================

export class OpAmp extends BaseComponent {
  /** Factor de amplificación (ganancia de lazo abierto) */
  private readonly amplification: number;

  constructor(definition: Component) {
    super(definition);
    this.amplification = this.values["amplification"] ?? 100000;
  }

  override getResistance(): number {
    // Op-amp tiene impedancia de entrada infinita
    return this.values["resistance"] === Infinity
      ? Infinity
      : (this.values["resistance"] ?? 1e12); // ~infinita
  }

  override calculate(
    inputVoltage: number,
    totalCurrent: number,
    globalState: GlobalState
  ): { voltage: number; current: number; resistance: number } {
    // Buscar voltajes de las entradas (input1 = no inversora, input2 = inversora)
    let vPlus = 0; // input no inversora
    let vMinus = 0; // input inversora

    const state = globalState.get(this.id);
    if (state) {
      // input1 = V+, input2 = V-
      const input1State = state.ports.get(this.inputNames[0] ?? "input1");
      const input2State = state.ports.get(this.inputNames[1] ?? "input2");
      vPlus = input1State?.v ?? inputVoltage;
      vMinus = input2State?.v ?? 0;
    } else {
      vPlus = inputVoltage;
    }

    // Evaluar funciones declaradas si las hay
    if (this.functions.length > 0) {
      const context: Record<string, number> = {
        ...this.values,
        amplification: this.amplification,
        [`${this.inputNames[0] ?? "input1"}.v`]: vPlus,
        [`${this.inputNames[1] ?? "input2"}.v`]: vMinus,
        V: inputVoltage,
        I: totalCurrent,
      };

      for (const fn of this.functions) {
        for (const expr of fn.expressions) {
          const result = evaluate(expr, context);
          const cat = fn.category.toLowerCase();
          if (cat === "voltaje" || cat === "voltage") {
            // La salida del op-amp
            return {
              voltage: result,
              current: 0, // No consume corriente en entradas (ideal)
              resistance: Infinity,
            };
          }
        }
      }
    }

    // Default: Vout = (V+ - V-) * ganancia
    const vOut = (vPlus - vMinus) * this.amplification;

    return {
      voltage: vOut,
      current: 0, // Entrada de impedancia infinita
      resistance: Infinity,
    };
  }

  /** Actualiza el estado del op-amp */
  override updateState(
    globalState: GlobalState,
    voltage: number,
    current: number,
    resistance: number
  ): void {
    globalState.update(this.id, (state) => {
      // Inputs mantienen su voltaje
      for (const inputName of this.inputNames) {
        const existing = state.ports.get(inputName);
        state.ports.set(inputName, {
          v: existing?.v ?? 0,
          i: 0, // No consume corriente
          r: Infinity,
        });
      }
      // Output tiene el voltaje amplificado
      for (const outputName of this.outputNames) {
        state.ports.set(outputName, {
          v: voltage,
          i: current,
          r: 0, // Baja impedancia de salida
        });
      }
    });
  }
}
