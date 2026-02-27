import type { GlobalState } from "./GlobalState";
import type { SignalExe } from "./SignalExe";

// ============================================================
// SignalMonitor — Consola CLI interactiva
// ============================================================

// Colores ANSI
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export class SignalMonitor {
  private globalState: GlobalState;
  private signalExe: SignalExe;
  private monitoringComponent: string | null = null;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  constructor(globalState: GlobalState, signalExe: SignalExe) {
    this.globalState = globalState;
    this.signalExe = signalExe;
  }

  /** Inicia la consola interactiva */
  async start(): Promise<void> {
    this.showWelcome();

    // Usar el stdin de Bun para lectura interactiva
    const reader = Bun.stdin.stream().getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    this.showPrompt();

    while (this.signalExe.isRunning()) {
      const result = await Promise.race([
        reader.read(),
        new Promise<{ value: undefined; done: true }>((resolve) =>
          setTimeout(() => resolve({ value: undefined, done: true }), 100)
        ),
      ]);

      if (result.done && result.value === undefined) {
        // Timeout — continuar esperando
        continue;
      }

      if (result.done) break;

      if (result.value) {
        buffer += decoder.decode(result.value, { stream: true });

        // Procesar líneas completas
        while (buffer.includes("\n")) {
          const newlineIdx = buffer.indexOf("\n");
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (line) {
            const shouldContinue = this.processCommand(line);
            if (!shouldContinue) {
              reader.releaseLock();
              return;
            }
          }

          if (this.signalExe.isRunning()) {
            this.showPrompt();
          }
        }
      }
    }

    reader.releaseLock();
  }

  /** Muestra el banner de bienvenida */
  private showWelcome(): void {
    console.log();
    console.log(
      `${C.cyan}${C.bold}  ⚡ BATI Runtime — Simulación Activa${C.reset}`
    );
    console.log(
      `${C.dim}  Escribe 'help' para ver los comandos disponibles.${C.reset}`
    );
    console.log();
  }

  /** Muestra el prompt */
  private showPrompt(): void {
    process.stdout.write(`${C.green}bati>${C.reset} `);
  }

  /**
   * Procesa un comando. Retorna true para continuar, false para salir.
   */
  private processCommand(input: string): boolean {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0]?.toLowerCase();

    switch (cmd) {
      case "monitor":
        return this.cmdMonitor(parts[1]);

      case "unmonitor":
        return this.cmdUnmonitor();

      case "list":
        return this.cmdList();

      case "signal":
        return this.cmdSignal();

      case "status":
        return this.cmdStatus(parts[1]);

      case "help":
        return this.cmdHelp();

      case "stop":
      case "exit":
      case "quit":
        return this.cmdStop();

      default:
        console.log(
          `${C.red}  Comando desconocido: '${input}'. Escribe 'help'.${C.reset}`
        );
        return true;
    }
  }

  /** Comando: monitor <componentId> — Muestra estado en tiempo real */
  private cmdMonitor(componentId?: string): boolean {
    if (!componentId) {
      console.log(`${C.yellow}  Uso: monitor <componentId>${C.reset}`);
      return true;
    }

    // Buscar componente (case-insensitive)
    const allIds = this.globalState.getComponentIds();
    const foundId = allIds.find(
      (id) => id.toLowerCase() === componentId.toLowerCase()
    );

    if (!foundId) {
      console.log(
        `${C.red}  Componente '${componentId}' no encontrado.${C.reset}`
      );
      console.log(
        `${C.dim}  Disponibles: ${allIds.join(", ")}${C.reset}`
      );
      return true;
    }

    // Detener monitor anterior
    this.cmdUnmonitor();

    this.monitoringComponent = foundId;
    console.log(
      `${C.cyan}  📊 Monitoreando ${C.bold}${foundId}${C.reset}${C.cyan} (Ctrl+C o 'unmonitor' para detener)${C.reset}`
    );

    // Mostrar estado inicial
    this.printComponentState(foundId);

    // Actualizar cada tick
    this.monitorInterval = setInterval(() => {
      if (this.monitoringComponent) {
        // Limpiar línea anterior y reimprimir
        this.printComponentState(this.monitoringComponent);
      }
    }, 200); // Refrescar cada 200ms para legibilidad

    return true;
  }

  /** Comando: unmonitor — Deja de monitorear */
  private cmdUnmonitor(): boolean {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.monitoringComponent = null;
    return true;
  }

  /** Comando: list — Muestra todos los componentes */
  private cmdList(): boolean {
    console.log();
    const ids = this.globalState.getComponentIds();

    for (const id of ids) {
      const state = this.globalState.get(id);
      if (state) {
        console.log(
          `  ${C.bold}${state.type}${C.reset} ${C.green}${state.id}${C.reset}`
        );
        for (const [portName, portState] of state.ports) {
          console.log(
            `    ${portName}: v=${C.cyan}${portState.v.toFixed(4)}${C.reset}  i=${C.yellow}${portState.i.toFixed(6)}${C.reset}  r=${C.magenta}${portState.r.toFixed(2)}${C.reset}`
          );
        }
      }
    }
    console.log();
    return true;
  }

  /** Comando: signal — Muestra estado de la fuente */
  private cmdSignal(): boolean {
    const { signalVoltage, tick, time } = this.globalState;
    console.log();
    console.log(`  ${C.magenta}📡 SIGNAL${C.reset}`);
    console.log(`    voltage: ${C.cyan}${signalVoltage.toFixed(4)}V${C.reset}`);
    console.log(`    tick:    ${tick}`);
    console.log(`    time:    ${time.toFixed(3)}s`);
    console.log();
    return true;
  }

  /** Comando: status <componentId> — Muestra estado de un componente */
  private cmdStatus(componentId?: string): boolean {
    if (!componentId) {
      console.log(`${C.yellow}  Uso: status <componentId>${C.reset}`);
      return true;
    }

    const allIds = this.globalState.getComponentIds();
    const foundId = allIds.find(
      (id) => id.toLowerCase() === componentId.toLowerCase()
    );

    if (!foundId) {
      console.log(
        `${C.red}  Componente '${componentId}' no encontrado.${C.reset}`
      );
      return true;
    }

    this.printComponentState(foundId);
    return true;
  }

  /** Comando: help */
  private cmdHelp(): boolean {
    console.log();
    console.log(`  ${C.bold}Comandos disponibles:${C.reset}`);
    console.log(`    ${C.cyan}monitor${C.reset} <id>    Monitorea un componente en tiempo real`);
    console.log(`    ${C.cyan}unmonitor${C.reset}       Deja de monitorear`);
    console.log(`    ${C.cyan}status${C.reset} <id>     Muestra estado actual de un componente`);
    console.log(`    ${C.cyan}list${C.reset}            Lista todos los componentes y su estado`);
    console.log(`    ${C.cyan}signal${C.reset}          Muestra estado de la fuente de señal`);
    console.log(`    ${C.cyan}stop${C.reset}            Detiene la simulación`);
    console.log(`    ${C.cyan}help${C.reset}            Muestra esta ayuda`);
    console.log();
    return true;
  }

  /** Comando: stop */
  private cmdStop(): boolean {
    this.cmdUnmonitor();
    this.signalExe.stop();
    console.log();
    console.log(
      `${C.yellow}  ⏹  Simulación detenida.${C.reset}`
    );
    console.log();
    return false; // Salir del loop
  }

  /** Imprime el estado de un componente */
  private printComponentState(componentId: string): void {
    const state = this.globalState.get(componentId);
    if (!state) return;

    // Buscar el primer input y output para mostrar resumen
    const portEntries = [...state.ports.entries()];

    console.log(
      `  ${C.bold}${state.type} ${state.id}${C.reset} (tick ${this.globalState.tick}, t=${this.globalState.time.toFixed(2)}s)`
    );
    for (const [portName, ps] of portEntries) {
      console.log(
        `    ${portName}: v: ${C.cyan}${ps.v.toFixed(4)}${C.reset}  i: ${C.yellow}${ps.i.toFixed(6)}${C.reset}  r: ${C.magenta}${formatResistance(ps.r)}${C.reset}`
      );
    }
  }
}

/** Formatea resistencia con sufijos K, M */
function formatResistance(r: number): string {
  if (r === Infinity) return "∞";
  if (r >= 1e6) return `${(r / 1e6).toFixed(2)}MΩ`;
  if (r >= 1e3) return `${(r / 1e3).toFixed(2)}kΩ`;
  return `${r.toFixed(2)}Ω`;
}
