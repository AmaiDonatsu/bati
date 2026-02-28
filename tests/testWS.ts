/**
 * Test: conectar al WebSocket del runtime bati
 * 
 * Prerequisito: tener corriendo `bun run index.ts <archivo.bati>` en otra terminal
 * 
 * Uso: bun run tests/testWS.ts
 */

async function testWS() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🧪 Test: WebSocket Client — bati runtime");
  console.log("═══════════════════════════════════════════════\n");

  const url = "ws://localhost:3400";
  console.log(`  Conectando a ${url}...\n`);

  const ws = new WebSocket(url);
  let messageCount = 0;
  const maxMessages = 15;

  ws.onopen = () => {
    console.log("  ✅ Conectado!\n");
  };

  ws.onmessage = (event) => {
    messageCount++;
    const data = JSON.parse(event.data as string);

    if (data.type === "snapshot") {
      console.log(`  [${messageCount}] 📸 SNAPSHOT`);
      const components = Object.keys(data.payload.components || {});
      console.log(`    signal: ${data.payload.signal?.voltage?.toFixed(4)}V`);
      console.log(`    componentes: ${components.join(", ")}`);
      
      // Después del snapshot, pedir suscripción a un componente
      if (messageCount === 1 && components.length > 0) {
        const target = components[0];
        console.log(`\n  → Enviando subscribe("${target}")...\n`);
        ws.send(JSON.stringify({ action: "subscribe", componentId: target }));
      }
    } else if (data.type === "tick") {
      console.log(`  [${messageCount}] ⏱  TICK ${data.payload.tick} — ${data.payload.voltage.toFixed(4)}V (t=${data.payload.time.toFixed(2)}s)`);
    } else if (data.type === "update") {
      const p = data.payload;
      const firstPort = Object.entries(p.ports || {})[0];
      if (firstPort) {
        const [name, val] = firstPort as [string, { v: number; i: number; r: number }];
        console.log(`  [${messageCount}] 🔄 UPDATE ${p.id}.${name}: v=${val.v.toFixed(4)} i=${val.i.toFixed(6)}`);
      }
    } else if (data.type === "error") {
      console.log(`  [${messageCount}] ❌ ERROR: ${data.payload.message}`);
    }

    // Después de 10 mensajes, pedir getSignal
    if (messageCount === 10) {
      console.log(`\n  → Enviando getSignal...\n`);
      ws.send(JSON.stringify({ action: "getSignal" }));
    }

    // Cerrar después de maxMessages
    if (messageCount >= maxMessages) {
      console.log("\n  🏁 Test completado — cerrando conexión.\n");
      ws.close();
    }
  };

  ws.onerror = (event) => {
    console.error("  ❌ Error de conexión. ¿Está corriendo el runtime?");
    console.error("     Ejecuta: bun run index.ts docs/prompts/theory/demo5.bati");
    process.exit(1);
  };

  ws.onclose = () => {
    console.log(`  Total de mensajes recibidos: ${messageCount}`);
    process.exit(0);
  };
}

testWS();
