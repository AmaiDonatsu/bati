/**
 * Test script for verifying bati runtime calculations.
 * Runs non-interactively: parses demo5.bati, runs 5 ticks, prints results.
 */
import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { GlobalState } from "../src/runtime/GlobalState";
import { CircuitGraph } from "../src/runtime/CircuitGraph";
import { SignalExe } from "../src/runtime/SignalExe";
import { SignalFlow } from "../src/runtime/SignalFlow";
import { createComponent } from "../src/runtime/components/ComponentFactory";
import type { BaseComponent } from "../src/runtime/components/BaseComponent";

async function test() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🧪 Test: Runtime de Bati — demo5.bati (DC)");
  console.log("═══════════════════════════════════════════════\n");

  // Parse demo5.bati
  const source = await Bun.file("docs/prompts/theory/demo5.bati").text();
  const tokens = tokenize(source);
  const batiFile = parse(tokens, "demo5.bati");

  const errors = batiFile.errors.filter((e) => e.severity === "error");
  console.log(`✅ Parse: ${batiFile.components.length} componentes, ${batiFile.connections.length} conexiones, ${errors.length} errores`);

  if (errors.length > 0) {
    console.log("❌ Hay errores de sintaxis, abortando.");
    process.exit(1);
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
  const signalFlow = new SignalFlow(globalState, graph, components);

  console.log(`✅ Graph: ${graph.getAllNodes().length} nodos`);
  console.log(`✅ Circuito cerrado: ${graph.getComponentsInCircuit().join(", ") || "ninguno"}`);

  // Simular SIGNAL_EXE manualmente (DC 9V)
  const signalVoltage = 9;
  console.log(`\n📡 SIGNAL: ${signalVoltage}V DC\n`);

  // Ejecutar 3 ticks manualmente
  for (let tick = 1; tick <= 3; tick++) {
    globalState.advanceTick(100);
    globalState.signalVoltage = signalVoltage;
    signalFlow.propagate(signalVoltage);

    console.log(`── Tick ${tick} (t=${globalState.time.toFixed(2)}s) ──`);

    for (const [id, comp] of components) {
      const state = globalState.get(id);
      if (state) {
        for (const [portName, ps] of state.ports) {
          console.log(
            `  ${id}.${portName}: v=${ps.v.toFixed(4)}V  i=${ps.i.toFixed(6)}A  r=${ps.r.toFixed(0)}Ω`
          );
        }
      }
    }
    console.log();
  }

  // Verificar matemática esperada
  // demo5: R1=1000Ω, r2=2000Ω en serie a 9V
  // R_total = 3000Ω
  // I_total = 9/3000 = 0.003A
  // V_R1 = I * R1 = 0.003 * 1000 = 3V
  // V_r2 = I * R2 = 0.003 * 2000 = 6V

  const r1State = globalState.get("R1");
  const r2State = globalState.get("r2");

  console.log("═══════════════════════════════════════════════");
  console.log("  📊 Verificación de valores esperados:");
  console.log("═══════════════════════════════════════════════");
  console.log(`  R_total esperada: 3000Ω`);
  console.log(`  I_total esperada: 0.003A`);
  console.log(`  V_R1 esperada:    3.0V`);
  console.log(`  V_r2 esperada:    6.0V`);
  console.log();

  const r1Input = r1State?.ports.get("input1");
  const r2Input = r2State?.ports.get("input1");

  if (r1Input && r2Input) {
    const iOk = Math.abs(r1Input.i - 0.003) < 0.001;
    const v1Ok = Math.abs(r1Input.v - 3.0) < 0.5;
    const v2Ok = Math.abs(r2Input.v - 6.0) < 0.5;

    console.log(`  R1 voltage: ${r1Input.v.toFixed(4)}V ${v1Ok ? "✅" : "⚠️"}`);
    console.log(`  R1 current: ${r1Input.i.toFixed(6)}A ${iOk ? "✅" : "⚠️"}`);
    console.log(`  r2 voltage: ${r2Input.v.toFixed(4)}V ${v2Ok ? "✅" : "⚠️"}`);
    console.log(`  r2 current: ${r2Input.i.toFixed(6)}A ${iOk ? "✅" : "⚠️"}`);

    if (iOk && v1Ok && v2Ok) {
      console.log("\n  ✅ ¡Todos los valores son correctos!\n");
    } else {
      console.log("\n  ⚠️  Algunos valores no coinciden con lo esperado.\n");
    }
  } else {
    console.log("  ❌ No se encontraron estados para R1 o r2\n");
  }
}

test();
