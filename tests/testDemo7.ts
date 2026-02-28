/**
 * Test: ejecutar demo7.bati de forma no interactiva y verificar resultados
 */
import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { report } from "../src/reporter";
import { GlobalState } from "../src/runtime/GlobalState";
import { CircuitGraph } from "../src/runtime/CircuitGraph";
import { SignalFlow } from "../src/runtime/SignalFlow";
import { SignalExe } from "../src/runtime/SignalExe";
import { createComponent } from "../src/runtime/components/ComponentFactory";
import type { BaseComponent } from "../src/runtime/components/BaseComponent";

async function test() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🧪 Test: Runtime de Bati — demo7.bati (AC)");
  console.log("═══════════════════════════════════════════════\n");

  const source = await Bun.file("docs/prompts/theory/demo7.bati").text();
  const tokens = tokenize(source);
  const batiFile = parse(tokens, "demo7.bati");

  // Mostrar reporte de sintaxis
  report(batiFile);

  const errors = batiFile.errors.filter((e) => e.severity === "error");
  const warnings = batiFile.errors.filter((e) => e.severity === "warning");
  console.log(`\nParse: ${batiFile.components.length} componentes, ${batiFile.connections.length} conexiones`);
  console.log(`Errores: ${errors.length}, Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Hay errores de sintaxis. El runtime no arrancará.\n");
    for (const err of errors) {
      console.log(`  [ERROR] Línea ${err.line}: ${err.message}`);
    }
    console.log();
    return;
  }

  if (!batiFile.signal) {
    console.log("\n⚠ No se encontró SIGNAL.\n");
    return;
  }

  // Init runtime
  const globalState = new GlobalState();
  const components = new Map<string, BaseComponent>();
  for (const compDef of batiFile.components) {
    const comp = createComponent(compDef);
    comp.registerInState(globalState);
    components.set(comp.id, comp);
  }

  const graph = new CircuitGraph(batiFile.components, batiFile.connections);

  console.log(`\nGraph: ${graph.getAllNodes().length} nodos`);
  console.log(`Circuito cerrado: ${graph.getComponentsInCircuit().join(", ") || "ninguno"}\n`);

  // Verificar paths para cada componente
  for (const comp of batiFile.components) {
    const port = `${comp.id}.${comp.inputs[0]?.name ?? "input1"}`;
    const toSignal = graph.hasPath(port, "SIGNAL");
    const toGround = graph.hasPath(port, "GROUND");
    console.log(`  ${comp.id}: toSignal=${toSignal}, toGround=${toGround}, closed=${toSignal && toGround}`);
  }

  const signalFlow = new SignalFlow(globalState, graph, components);

  console.log("\n── Simulando 5 ticks con señal AC sin(x) ──\n");

  for (let tick = 1; tick <= 5; tick++) {
    globalState.advanceTick(100);
    const time = globalState.time;
    const hz = batiFile.signal.hz ?? 1;
    const x = 2 * Math.PI * hz * time;
    const voltage = Math.sin(x);
    globalState.signalVoltage = voltage;
    signalFlow.propagate(voltage);

    console.log(`Tick ${tick} (t=${time.toFixed(2)}s) — SIGNAL: ${voltage.toFixed(4)}V`);
    for (const [id] of components) {
      const state = globalState.get(id);
      if (state) {
        const input = state.ports.get("input1");
        if (input) {
          console.log(`  ${id}: v=${input.v.toFixed(4)} i=${input.i.toFixed(6)} r=${input.r.toFixed(0)}`);
        }
      }
    }
    console.log();
  }
}

test();
