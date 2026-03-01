/**
 * Test: External Signal (Device) via WebSocket
 *
 * 1. Levanta el runtime con demoDevice.bati (font: device, id: sensor_01)
 * 2. Conecta un "device" a ws://localhost:3400/device/sensor_01
 * 3. Conecta un "monitor" a ws://localhost:3400
 * 4. Envía voltajes desde el device y verifica que el monitor los recibe
 * 5. Prueba que un device con id incorrecto sea rechazado
 *
 * Prerequisito: NO tener otra instancia de bati corriendo en puerto 3400
 *
 * Uso: bun run tests/testExternalSignal.ts
 */

import { tokenize } from "../src/lexer";
import { parse } from "../src/parser";
import { GlobalState } from "../src/runtime/GlobalState";
import { CircuitGraph } from "../src/runtime/CircuitGraph";
import { SignalExe } from "../src/runtime/SignalExe";
import { SignalFlow } from "../src/runtime/SignalFlow";
import { SignalWS } from "../src/runtime/SignalWS";
import { createComponent } from "../src/runtime/components/ComponentFactory";
import type { BaseComponent } from "../src/runtime/components/BaseComponent";

async function test() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🧪 Test: External Signal (Device)");
  console.log("═══════════════════════════════════════════════\n");

  // ── 1. Levantar el runtime ───────────────────────────────
  const source = await Bun.file(
    "docs/prompts/theory/demoDevice.bati"
  ).text();
  const tokens = tokenize(source);
  const batiFile = parse(tokens, "demoDevice.bati");

  const errorCount = batiFile.errors.filter(
    (e) => e.severity === "error"
  ).length;
  if (errorCount > 0) {
    console.error("  ❌ Errores de sintaxis:");
    for (const err of batiFile.errors) {
      console.error(`    L${err.line}: ${err.message}`);
    }
    process.exit(1);
  }

  console.log("  ✅ Sintaxis OK");
  console.log(`  📡 Signal font: ${batiFile.signal!.font}`);
  console.log(`  📡 Device ID: ${batiFile.signal!.deviceId}\n`);

  // Inicializar runtime
  const globalState = new GlobalState();
  const components = new Map<string, BaseComponent>();
  for (const compDef of batiFile.components) {
    const comp = createComponent(compDef);
    comp.registerInState(globalState);
    components.set(comp.id, comp);
  }
  const graph = new CircuitGraph(batiFile.components, batiFile.connections);
  const signalExe = new SignalExe(batiFile.signal!, globalState);
  const signalFlow = new SignalFlow(globalState, graph, components);

  signalExe.onTick((voltage) => {
    signalFlow.propagate(voltage);
  });

  const signalWS = new SignalWS(globalState, signalExe, 3500); // Puerto 3500 para test
  signalWS.start();
  signalExe.start();

  console.log("  ✅ Runtime iniciado en modo device\n");

  // Esperar a que el WS esté listo
  await new Promise((r) => setTimeout(r, 500));

  // ── 2. Test: Device con ID incorrecto ────────────────────
  console.log("  ── Test: Device con ID incorrecto ──\n");

  const wrongDevice = new WebSocket("ws://localhost:3500/device/wrong_id");
  const wrongResult = await new Promise<string>((resolve) => {
    wrongDevice.onmessage = (e) => {
      resolve(e.data as string);
      wrongDevice.close();
    };
    wrongDevice.onerror = () => resolve("CONNECTION_ERROR");
  });

  const wrongParsed = JSON.parse(wrongResult);
  if (wrongParsed.type === "error") {
    console.log(`  ✅ Device rechazado: "${wrongParsed.payload.message}"\n`);
  } else {
    console.log(`  ❌ Se esperaba error, pero recibió: ${wrongResult}\n`);
  }

  // ── 3. Test: Device con ID correcto ──────────────────────
  console.log("  ── Test: Device con ID correcto ──\n");

  const device = new WebSocket("ws://localhost:3500/device/sensor_01");
  await new Promise<void>((resolve) => {
    device.onopen = () => resolve();
  });

  // Leer el mensaje de confirmación
  const connectMsg = await new Promise<string>((resolve) => {
    device.onmessage = (e) => resolve(e.data as string);
  });
  const connectParsed = JSON.parse(connectMsg);
  console.log(
    `  ✅ Device conectado: "${connectParsed.payload.message}"\n`
  );

  // ── 4. Conectar monitor ──────────────────────────────────
  console.log("  ── Test: Monitor recibe datos del device ──\n");

  const monitor = new WebSocket("ws://localhost:3500");
  await new Promise<void>((resolve) => {
    monitor.onopen = () => resolve();
  });

  // Descartar snapshot inicial
  await new Promise((resolve) => {
    monitor.onmessage = (e) => resolve(e.data);
  });

  // ── 5. Enviar voltajes desde el device ───────────────────
  const testVoltages = [5.0, 3.3, 12.0];
  const receivedUpdates: any[] = [];

  // Coleccionar mensajes del monitor
  monitor.onmessage = (e) => {
    receivedUpdates.push(JSON.parse(e.data as string));
  };

  for (const v of testVoltages) {
    device.send(
      JSON.stringify({ id: "sensor_01", value: v })
    );
    await new Promise((r) => setTimeout(r, 200)); // Esperar propagación
  }

  // Esperar un poco más para que lleguen todos
  await new Promise((r) => setTimeout(r, 300));

  console.log(`  Mensajes recibidos por el monitor: ${receivedUpdates.length}`);

  // Buscar ticks con los voltajes inyectados
  const ticks = receivedUpdates.filter((m) => m.type === "tick");
  const updates = receivedUpdates.filter((m) => m.type === "update");

  console.log(`    ticks: ${ticks.length}`);
  console.log(`    updates: ${updates.length}`);

  if (ticks.length >= 3) {
    for (let i = 0; i < testVoltages.length; i++) {
      const t = ticks[i];
      console.log(
        `    tick[${i}]: voltage=${t.payload.voltage}V ${
          t.payload.voltage === testVoltages[i] ? "✅" : "❌"
        }`
      );
    }
  }

  // Verificar que los updates del componente R1 tienen valores correctos
  // Para 5V: I = 5/3000 = 0.001667, V_R1 = 0.001667*1000 = 1.667
  if (updates.length > 0) {
    const r1Update = updates.find(
      (u) => u.payload.id === "R1" || u.payload.id === "r1"
    );
    if (r1Update) {
      const port = r1Update.payload.ports?.input1;
      if (port) {
        console.log(
          `\n    R1 update: v=${port.v.toFixed(4)} i=${port.i.toFixed(6)}`
        );
      }
    }
  }

  // ── Cleanup ──────────────────────────────────────────────
  device.close();
  monitor.close();
  signalExe.stop();
  signalWS.stop();

  console.log("\n  🏁 Test completado.\n");
  process.exit(0);
}

test();
