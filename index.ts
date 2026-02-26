import { tokenize } from "./src/lexer";
import { parse } from "./src/parser";
import { report } from "./src/reporter";

// ============================================================
// BATI — Verificador de Sintaxis
// Entrada: bun run index.ts <ruta-archivo.bati>
// ============================================================

async function main(): Promise<void> {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log();
    console.log("  ⚡ BATI — Verificador de Sintaxis");
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

  // Pipeline: tokenize → parse → report
  const tokens = tokenize(source);
  const batiFile = parse(tokens, filePath);
  report(batiFile);

  // Exit code según errores
  const errorCount = batiFile.errors.filter((e) => e.severity === "error").length;
  process.exit(errorCount > 0 ? 1 : 0);
}

main();