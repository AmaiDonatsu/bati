import type { Component } from "../../types";
import { BaseComponent } from "./BaseComponent";
import { Resistor } from "./Resistor";
import { Capacitor } from "./Capacitor";
import { Diode } from "./Diode";
import { OpAmp } from "./OpAmp";

// ============================================================
// ComponentFactory — Instancia el componente correcto según tipo
// ============================================================

export function createComponent(definition: Component): BaseComponent {
  switch (definition.type) {
    case "RESISTOR":
      return new Resistor(definition);

    case "CAPACITOR":
      return new Capacitor(definition);

    case "INDUCTOR":
      // Por ahora, inductor se comporta como resistor con resistencia 0
      return new Resistor(definition);

    case "LED":
      // LED es como un diodo con voltaje forward de ~2V
      return new Diode(definition);

    case "DIODE":
      return new Diode(definition);

    case "OPAMP":
    case "BATIAMP":
      return new OpAmp(definition);

    case "TRANSISTOR":
    case "MOSFET":
      // Por ahora, transistor/mosfet se tratan como componentes base
      return new BaseComponent(definition);

    default:
      return new BaseComponent(definition);
  }
}
