/**
 * Debug test — print parsed structure & graph details
 */
import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { GlobalState } from "../src/runtime/GlobalState";
import { CircuitGraph } from "../src/runtime/CircuitGraph";
import { SignalFlow } from "../src/runtime/SignalFlow";
import { createComponent } from "../src/runtime/components/ComponentFactory";
import type { BaseComponent } from "../src/runtime/components/BaseComponent";

async function debug() {
  const source = await Bun.file("docs/prompts/theory/demo5.bati").text();
  const tokens = tokenize(source);
  const batiFile = parse(tokens, "demo5.bati");

  console.log("=== SIGNAL ===");
  console.log(JSON.stringify(batiFile.signal, null, 2));

  console.log("\n=== COMPONENTS ===");
  for (const c of batiFile.components) {
    console.log(`  ${c.type} ${c.id}`);
    console.log(`    inputs: ${c.inputs.map(p => p.name).join(", ")}`);
    console.log(`    outputs: ${c.outputs.map(p => p.name).join(", ")}`);
    console.log(`    values: ${JSON.stringify(c.values)}`);
    console.log(`    functions:`, c.functions.map(f => `${f.category}: ${f.expressions}`));
  }

  console.log("\n=== CONNECTIONS ===");
  for (const conn of batiFile.connections) {
    console.log(`  ${conn.id}: ${conn.from} → ${conn.to}`);
  }

  // Build graph
  const graph = new CircuitGraph(batiFile.components, batiFile.connections);

  console.log("\n=== GRAPH NODES ===");
  console.log(graph.getAllNodes().join(", "));

  console.log("\n=== CLOSED CIRCUITS ===");
  console.log(graph.getComponentsInCircuit());

  // Check paths
  for (const c of batiFile.components) {
    const compId = c.id;
    const portId = `${compId}.${c.inputs[0]?.name ?? "input1"}`;
    const closed = graph.isClosedCircuit(compId);
    const toGround = graph.hasPath(portId, "GROUND");
    const toSignal = graph.hasPath(portId, "SIGNAL");
    console.log(`  ${compId}: closed=${closed}, toSignal=${toSignal}, toGround=${toGround}`);
  }

  // Test flow
  const globalState = new GlobalState();
  const components = new Map<string, BaseComponent>();
  for (const compDef of batiFile.components) {
    const comp = createComponent(compDef);
    comp.registerInState(globalState);
    components.set(comp.id, comp);
  }

  const signalFlow = new SignalFlow(globalState, graph, components);

  globalState.advanceTick(100);
  globalState.signalVoltage = 9;
  signalFlow.propagate(9);

  console.log("\n=== STATE AFTER PROPAGATION ===");
  for (const [id] of components) {
    const state = globalState.get(id);
    if (state) {
      for (const [portName, ps] of state.ports) {
        console.log(`  ${id}.${portName}: v=${ps.v.toFixed(4)} i=${ps.i.toFixed(6)} r=${ps.r.toFixed(0)}`);
      }
    }
  }

  // Debug equivalent resistance
  const eqR = graph.calculateEquivalentResistance(
    "SIGNAL",
    (compId) => components.get(compId)?.getResistance() ?? 0
  );
  console.log(`\n=== EQUIVALENT RESISTANCE ===`);
  console.log(`  R_eq = ${eqR}`);
}

debug();
