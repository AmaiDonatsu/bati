/**
 * 🔌 Device Simulator — Simula un sensor externo enviando datos a Bati
 *
 * Uso:
 *   Terminal 1: bun run index.ts docs/prompts/theory/demoDevice.bati
 *   Terminal 2: bun run tests/deviceSimulator.ts
 *
 * El simulador se conecta como device "sensor_01" y envía una señal
 * sinusoidal que varía entre -5V y +5V a 1Hz, simulando un sensor
 * analógico real que envía lecturas cada 100ms.
 */

const DEVICE_ID = "sensor_01";
const WS_URL = `ws://localhost:3400/device/${DEVICE_ID}`;
const INTERVAL_MS = 100; // Frecuencia de envío (10 lecturas/segundo)
const AMPLITUDE = 5; // Voltaje pico (±5V)
const FREQUENCY_HZ = 1; // 1 ciclo por segundo

let tick = 0;

console.log("═══════════════════════════════════════════════");
console.log("  🔌 Device Simulator — Bati Runtime");
console.log("═══════════════════════════════════════════════");
console.log();
console.log(`  Device ID:   ${DEVICE_ID}`);
console.log(`  Endpoint:    ${WS_URL}`);
console.log(`  Amplitud:    ±${AMPLITUDE}V`);
console.log(`  Frecuencia:  ${FREQUENCY_HZ}Hz`);
console.log(`  Intervalo:   ${INTERVAL_MS}ms`);
console.log();
console.log("  Conectando...\n");

const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  console.log("  ✅ Conectado al runtime de Bati\n");
  console.log("  Enviando señal sinusoidal... (Ctrl+C para detener)\n");
  console.log("  ─────────────────────────────────────────────");
  console.log("   Tick    Tiempo     Voltaje    Forma de onda");
  console.log("  ─────────────────────────────────────────────");

  const interval = setInterval(() => {
    const time = tick * (INTERVAL_MS / 1000);
    const x = 2 * Math.PI * FREQUENCY_HZ * time;
    const voltage = AMPLITUDE * Math.sin(x);

    const message = {
      id: DEVICE_ID,
      value: parseFloat(voltage.toFixed(4)),
    };

    ws.send(JSON.stringify(message));

    // Visualización: barra ASCII del voltaje
    const normalized = (voltage + AMPLITUDE) / (2 * AMPLITUDE); // 0..1
    const barLength = Math.round(normalized * 20);
    const bar = "█".repeat(barLength) + "░".repeat(20 - barLength);

    const tickStr = String(tick).padStart(5);
    const timeStr = time.toFixed(2).padStart(8) + "s";
    const voltStr = (voltage >= 0 ? "+" : "") + voltage.toFixed(4) + "V";

    console.log(`   ${tickStr}  ${timeStr}  ${voltStr.padStart(10)}  ${bar}`);

    tick++;
  }, INTERVAL_MS);

  // Limpieza al cerrar
  process.on("SIGINT", () => {
    console.log("\n\n  🛑 Simulador detenido.");
    console.log(`  Total de ticks enviados: ${tick}\n`);
    clearInterval(interval);
    ws.close();
    process.exit(0);
  });
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data as string);
  if (data.type === "error") {
    console.error(`\n  ❌ Error del servidor: ${data.payload.message}\n`);
    ws.close();
    process.exit(1);
  }
};

ws.onerror = () => {
  console.error("  ❌ No se pudo conectar. ¿Está corriendo el runtime?");
  console.error("     Ejecuta primero:");
  console.error("     bun run index.ts docs/prompts/theory/demoDevice.bati\n");
  process.exit(1);
};

ws.onclose = () => {
  if (tick === 0) return; // Ya se manejó en onerror
  console.log("\n  Conexión cerrada.\n");
  process.exit(0);
};
