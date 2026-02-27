import type { GlobalState } from "./GlobalState";
import type { CircuitGraph } from "./CircuitGraph";
import type { BaseComponent } from "./components/BaseComponent";

// ============================================================
// SignalFlow — Motor de flujo del circuito
// ============================================================

export class SignalFlow {
  private globalState: GlobalState;
  private graph: CircuitGraph;
  private components: Map<string, BaseComponent>;

  constructor(
    globalState: GlobalState,
    graph: CircuitGraph,
    components: Map<string, BaseComponent>
  ) {
    this.globalState = globalState;
    this.graph = graph;
    this.components = components;
  }

  /**
   * Propaga la señal a través de todo el circuito.
   * Se llama cada tick desde SIGNAL_EXE.
   */
  propagate(signalVoltage: number): void {
    // Obtener componentes que están en circuito cerrado
    const activeComponents = this.graph.getComponentsInCircuit();

    if (activeComponents.length === 0) return;

    // Para cada componente activo en el circuito:
    // 1. Calcular la resistencia total del circuito desde SIGNAL hasta GROUND
    // 2. Calcular la corriente total: I = V / R_total
    // 3. Distribuir voltaje y corriente según la topología

    // Calcular resistencia equivalente total del circuito
    const totalResistance = this.graph.calculateEquivalentResistance(
      "SIGNAL",
      (compId) => this.getComponentResistance(compId)
    );

    // Corriente total del circuito
    const totalCurrent =
      totalResistance > 0 && totalResistance < Infinity
        ? signalVoltage / totalResistance
        : 0;

    // Propagar señal a cada componente
    for (const compId of activeComponents) {
      this.propagateToComponent(compId, signalVoltage, totalCurrent, totalResistance);
    }
  }

  /**
   * Propaga señal a un componente específico.
   */
  private propagateToComponent(
    compId: string,
    sourceVoltage: number,
    totalCurrent: number,
    totalResistance: number
  ): void {
    const component = this.components.get(compId);
    if (!component) return;

    const resistance = component.getResistance();

    // Calcular el voltaje que llega a este componente
    // Para un divisor de voltaje en serie: V_comp = V_total * (R_comp / R_total)
    let inputVoltage: number;
    let componentCurrent: number;

    if (totalResistance > 0 && totalResistance < Infinity) {
      // Resistencia finita: divisor de voltaje
      inputVoltage = sourceVoltage * (resistance / totalResistance);
      componentCurrent = totalCurrent;
    } else if (totalResistance === 0) {
      // Cortocircuito
      inputVoltage = sourceVoltage;
      componentCurrent = Infinity;
    } else {
      // Circuito abierto
      inputVoltage = 0;
      componentCurrent = 0;
    }

    // Dejar que el componente calcule su estado
    const result = component.calculate(
      inputVoltage,
      componentCurrent,
      this.globalState
    );

    // Actualizar estado global
    component.updateState(
      this.globalState,
      inputVoltage,
      result.current,
      resistance
    );
  }

  /**
   * Obtiene la resistencia de un componente.
   */
  private getComponentResistance(compId: string): number {
    const component = this.components.get(compId);
    if (!component) return 0;
    return component.getResistance();
  }
}
