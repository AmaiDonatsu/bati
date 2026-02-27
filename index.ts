import { tokenize } from "./src/lexer";
import { parse } from "./src/parser";
import { report } from "./src/reporter";
import { GlobalState } from "./src/runtime/GlobalState";
import { CircuitGraph } from "./src/runtime/CircuitGraph";
import { SignalExe } from "./src/runtime/SignalExe";
import { SignalFlow } from "./src/runtime/SignalFlow";
import { SignalMonitor } from "./src/runtime/SignalMonitor";
import { createComponent } from "./src/runtime/components/ComponentFactory";
import type { BaseComponent } from "./src/runtime/components/BaseComponent";

// ============================================================
// BATI — Verificador de Sintaxis + Runtime
// Entrada: bun run index.ts <ruta-archivo.bati>
// ============================================================

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log();
    console.log("  ⚡ BATI — Verificador de Sintaxis + Runtime");
    console.log();
    console.log("  Uso: bun run index.ts <archivo.bati>");
    console.log();
    console.log("  Ejemplo:");
    console.log("    bun run index.ts ./docs/prompts/theory/demo5.bati");
    console.log();
    process.exit(1);
  }

  // Leer el archivo
  const file = Bun.file(filePath);
  const exists = await file.exists();

  if (!exists) {
    console.error(`\n  ❌ Archivo no encontrado: ${filePath}\n`);
    process.exit(1);
  }

  const source = await file.text();

  // ── FASE 1: Verificación de sintaxis ──
  const tokens = tokenize(source);
  const batiFile = parse(tokens, filePath);
  report(batiFile);

  // Si hay errores de sintaxis, no ejecutar runtime
  const errorCount = batiFile.errors.filter((e) => e.severity === "error").length;
  if (errorCount > 0) {
    process.exit(1);
  }

  // ── FASE 2: Runtime ──
  if (!batiFile.signal) {
    console.log("\n  ⚠  No se encontró SIGNAL. No se puede iniciar simulación.\n");
    process.exit(0);
  }

  console.log("\n  🚀 Iniciando simulación...\n");

  // 1. Estado global
  const globalState = new GlobalState();

  // 2. Instanciar componentes runtime
  const components = new Map<string, BaseComponent>();
  for (const compDef of batiFile.components) {
    const comp = createComponent(compDef);
    comp.registerInState(globalState);
    components.set(comp.id, comp);
  }

  // 3. Construir grafo del circuito
  const graph = new CircuitGraph(batiFile.components, batiFile.connections);

  // 4. SIGNAL_EXE — Loop de señal
  const signalExe = new SignalExe(batiFile.signal, globalState);

  // 5. SIGNAL_FLOW — Motor de flujo
  const signalFlow = new SignalFlow(globalState, graph, components);

  // Conectar: cada tick de SIGNAL_EXE propaga en SIGNAL_FLOW
  signalExe.onTick((voltage) => {
    signalFlow.propagate(voltage);
  });

  // 6. Iniciar la simulación
  signalExe.start();

  // 7. SIGNAL_MONITOR — Consola interactiva
  const monitor = new SignalMonitor(globalState, signalExe);
  await monitor.start();

  // Limpieza
  signalExe.stop();
  process.exit(0);
}

main();