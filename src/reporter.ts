import type { BatiFile, BatiSyntaxError, Component, Connection } from "./types";

// ============================================================
// Reporter — Muestra el reporte de análisis por consola
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
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
};

export function report(batiFile: BatiFile): void {
  const { filename, signal, components, connections, errors } = batiFile;
  const syntaxErrors = errors.filter((e) => e.severity === "error");
  const warnings = errors.filter((e) => e.severity === "warning");

  // ── Header ──
  console.log();
  console.log(
    `${C.bgBlue}${C.white}${C.bold}  ⚡ BATI — Verificador de Sintaxis  ${C.reset}`
  );
  console.log(`${C.dim}${"─".repeat(50)}${C.reset}`);
  console.log(`${C.cyan}  Archivo:${C.reset} ${filename}`);
  console.log(`${C.dim}${"─".repeat(50)}${C.reset}`);
  console.log();

  // ── SIGNAL ──
  if (signal) {
    console.log(`${C.bold}${C.magenta}📡 SIGNAL${C.reset}`);
    console.log(`   Font:     ${signal.font}`);
    console.log(`   Function: ${signal.functionExpr}`);
    console.log(`   Tipo:     ${signal.isAC ? "AC (Corriente Alterna)" : "DC (Corriente Continua)"}`);
    if (signal.hz !== undefined) {
      console.log(`   Hz:       ${signal.hz}`);
    }
    console.log();
  } else {
    console.log(`${C.yellow}⚠  No se encontró bloque SIGNAL.${C.reset}`);
    console.log();
  }

  // ── Componentes ──
  if (components.length > 0) {
    console.log(
      `${C.bold}${C.cyan}🔧 Componentes Declarados (${components.length})${C.reset}`
    );
    console.log(`${C.dim}${"─".repeat(50)}${C.reset}`);

    for (const comp of components) {
      const categoryBadge = getCategoryBadge(comp);
      console.log(
        `   ${C.bold}${comp.type}${C.reset} ${categoryBadge}  →  id: ${C.green}${comp.id}${C.reset}  (línea ${comp.line})`
      );

      if (comp.inputs.length > 0) {
        console.log(
          `      inputs:  ${comp.inputs.map((p) => p.name).join(", ")}`
        );
      }
      if (comp.outputs.length > 0) {
        console.log(
          `      outputs: ${comp.outputs.map((p) => p.name).join(", ")}`
        );
      }
      if (comp.values.length > 0) {
        console.log(
          `      values:  ${comp.values.map((v) => `${v.key}=${v.value}`).join(", ")}`
        );
      }
      if (comp.functions.length > 0) {
        console.log(
          `      funcs:   ${comp.functions.map((f) => f.category).join(", ")}`
        );
      }
    }
    console.log();
  }

  // ── Conexiones ──
  if (connections.length > 0) {
    console.log(
      `${C.bold}${C.blue}🔌 Conexiones (${connections.length})${C.reset}`
    );
    console.log(`${C.dim}${"─".repeat(50)}${C.reset}`);

    for (const conn of connections) {
      console.log(
        `   ${C.bold}${conn.id}${C.reset}:  ${conn.from} ${C.dim}→${C.reset} ${conn.to}  (línea ${conn.line})`
      );
    }
    console.log();
  }

  // ── Conteo por tipo ──
  console.log(`${C.bold}${C.white}📊 Conteo de Componentes por Tipo${C.reset}`);
  console.log(`${C.dim}${"─".repeat(50)}${C.reset}`);
  const typeCounts = getTypeCounts(components, connections);
  for (const [type, count] of typeCounts) {
    const bar = "█".repeat(count);
    console.log(`   ${type.padEnd(14)} ${C.cyan}${bar}${C.reset} ${count}`);
  }
  console.log();

  // ── Errores ──
  if (syntaxErrors.length > 0) {
    console.log(
      `${C.bgRed}${C.white}${C.bold}  ❌ ${syntaxErrors.length} Error${syntaxErrors.length > 1 ? "es" : ""} de Sintaxis  ${C.reset}`
    );
    console.log();
    for (const err of syntaxErrors) {
      console.log(
        `   ${C.red}ERROR${C.reset} línea ${C.bold}${err.line}${C.reset}: ${err.message}`
      );
    }
    console.log();
  }

  // ── Warnings ──
  if (warnings.length > 0) {
    console.log(
      `${C.yellow}${C.bold}  ⚠  ${warnings.length} Advertencia${warnings.length > 1 ? "s" : ""}  ${C.reset}`
    );
    console.log();
    for (const warn of warnings) {
      console.log(
        `   ${C.yellow}WARN${C.reset}  línea ${C.bold}${warn.line}${C.reset}: ${warn.message}`
      );
    }
    console.log();
  }

  // ── Resultado final ──
  console.log(`${C.dim}${"═".repeat(50)}${C.reset}`);
  if (syntaxErrors.length === 0) {
    console.log(
      `${C.bgGreen}${C.white}${C.bold}  ✅ Sin errores de sintaxis  ${C.reset}`
    );
  } else {
    console.log(
      `${C.bgRed}${C.white}${C.bold}  ❌ ${syntaxErrors.length} error${syntaxErrors.length > 1 ? "es" : ""} encontrado${syntaxErrors.length > 1 ? "s" : ""}  ${C.reset}`
    );
  }
  if (warnings.length > 0) {
    console.log(
      `${C.yellow}  ⚠  ${warnings.length} advertencia${warnings.length > 1 ? "s" : ""}${C.reset}`
    );
  }
  console.log(`${C.dim}${"═".repeat(50)}${C.reset}`);
  console.log();
}

// ── Helpers ──

function getCategoryBadge(comp: Component): string {
  switch (comp.category) {
    case "active":
      return `${C.red}[ACTIVO]${C.reset}`;
    case "polar":
      return `${C.yellow}[POLAR]${C.reset}`;
    case "non-polar":
      return `${C.green}[NO-POLAR]${C.reset}`;
  }
}

function getTypeCounts(
  components: Component[],
  connections: Connection[]
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const comp of components) {
    counts.set(comp.type, (counts.get(comp.type) ?? 0) + 1);
  }
  if (connections.length > 0) {
    counts.set("CONNECTION", connections.length);
  }

  return counts;
}
