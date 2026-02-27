import type { Component } from "../../types";
import type { GlobalState } from "../GlobalState";
import type { CircuitGraph } from "../CircuitGraph";
import { evaluate } from "../mathEval";

// ============================================================
// BaseComponent — Clase base para componentes runtime
// ============================================================

export class BaseComponent {
  readonly id: string;
  readonly type: string;
  readonly category: string;
  readonly inputNames: string[];
  readonly outputNames: string[];
  readonly values: Record<string, number>;
  readonly functions: { category: string; expressions: string[] }[];

  constructor(public readonly definition: Component) {
    this.id = definition.id;
    this.type = definition.type;
    this.category = definition.category;
    this.inputNames = definition.inputs.map((p) => p.name);
    this.outputNames = definition.outputs.map((p) => p.name);

    // Parsear values a números
    this.values = {};
    for (const v of definition.values) {
      const num = v.value === "INFINIT" ? Infinity : parseFloat(v.value);
      this.values[v.key] = isNaN(num) ? 0 : num;
    }

    this.functions = definition.functions.map((f) => ({
      category: f.category,
      expressions: f.expressions,
    }));
  }

  /** Obtiene la resistencia del componente */
  getResistance(): number {
    return this.values["resistance"] ?? 0;
  }

  /** Obtiene la capacitancia del componente */
  getCapacitance(): number {
    return this.values["capacitance"] ?? 0;
  }

  /**
   * Calcula el estado del componente dado voltaje y corriente de entrada.
   * Retorna {v, i, r} para cada output.
   */
  calculate(
    inputVoltage: number,
    totalCurrent: number,
    globalState: GlobalState
  ): { voltage: number; current: number; resistance: number } {
    const resistance = this.getResistance();
    const context = this.buildContext(inputVoltage, totalCurrent, resistance);

    let voltage = inputVoltage;
    let current = totalCurrent;

    // Evaluar funciones declaradas
    for (const fn of this.functions) {
      const cat = fn.category.toLowerCase();
      for (const expr of fn.expressions) {
        const result = evaluate(expr, context);
        if (cat === "voltaje" || cat === "voltage") {
          voltage = result;
        } else if (cat === "ampere" || cat === "corriente" || cat === "current") {
          current = result;
        } else if (cat === "ohm" || cat === "resistencia") {
          // Informativo, no modifica el flujo
        }
      }
    }

    // Si no hay funciones declaradas, usar Ley de Ohm directamente
    if (this.functions.length === 0 && resistance > 0) {
      current = inputVoltage / resistance;
      voltage = current * resistance;
    }

    return { voltage, current, resistance };
  }

  /** Construye el contexto de variables para el evaluador */
  protected buildContext(
    inputVoltage: number,
    totalCurrent: number,
    resistance: number
  ): Record<string, number> {
    const ctx: Record<string, number> = {
      ...this.values,
      V: inputVoltage,
      I: totalCurrent,
      R: resistance,
    };

    // Agregar input1.v, input1.i, etc.
    for (const inputName of this.inputNames) {
      ctx[`${inputName}.v`] = inputVoltage;
      ctx[`${inputName}.i`] = totalCurrent;
    }

    return ctx;
  }

  /** Registra este componente en el estado global */
  registerInState(globalState: GlobalState): void {
    const allPorts = [...this.inputNames, ...this.outputNames];
    globalState.register(this.id, this.type, allPorts);
  }

  /** Actualiza el estado global con los valores calculados */
  updateState(
    globalState: GlobalState,
    voltage: number,
    current: number,
    resistance: number
  ): void {
    globalState.update(this.id, (state) => {
      // Actualizar todos los puertos de entrada
      for (const inputName of this.inputNames) {
        state.ports.set(inputName, { v: voltage, i: current, r: resistance });
      }
      // Output: voltaje = input - caída
      const voltageDrop = current * this.getResistance();
      const outputVoltage = voltage - voltageDrop;
      for (const outputName of this.outputNames) {
        state.ports.set(outputName, {
          v: outputVoltage >= 0 ? outputVoltage : 0,
          i: current,
          r: resistance,
        });
      }
    });
  }
}
