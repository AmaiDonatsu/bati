import type { Token, TokenType } from "./types";

// ============================================================
// Lexer — Tokeniza un archivo .bati línea por línea
// ============================================================

/**
 * Tokeniza el contenido de un archivo .bati.
 * Cada línea se convierte en un Token con tipo, valor y número de línea.
 */
export function tokenize(source: string): Token[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const tokens: Token[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const lineNum = i + 1;
    const trimmed = raw.trim();

    // Línea vacía
    if (trimmed === "") {
      tokens.push({ type: "EMPTY", raw, value: "", line: lineNum });
      continue;
    }

    // Bloque tilde ~~~
    if (trimmed === "~~~") {
      tokens.push({ type: "TILDE_BLOCK", raw, value: "~~~", line: lineNum });
      continue;
    }

    // Comentario (// ...)
    if (trimmed.startsWith("//")) {
      tokens.push({
        type: "COMMENT",
        raw,
        value: trimmed.slice(2).trim(),
        line: lineNum,
      });
      continue;
    }

    // Headers: ###, ##, #
    if (trimmed.startsWith("#")) {
      const headerMatch = trimmed.match(/^(#{1,3})\s+(.*)/);
      if (headerMatch) {
        const level = headerMatch[1]!.length;
        const value = headerMatch[2]!.trim();
        const typeMap: Record<number, TokenType> = {
          1: "HEADER_1",
          2: "HEADER_2",
          3: "HEADER_3",
        };
        tokens.push({
          type: typeMap[level] ?? "HEADER_1",
          raw,
          value,
          level,
          line: lineNum,
        });
        continue;
      }
    }

    // Lista con key: value  →  "- key: value"
    if (trimmed.startsWith("-")) {
      const content = trimmed.slice(1).trim();

      // Expresión matemática: - $...$
      if (content.startsWith("$") && content.endsWith("$")) {
        tokens.push({
          type: "MATH_EXPR",
          raw,
          value: content.slice(1, -1).trim(),
          line: lineNum,
        });
        continue;
      }

      // Key-value: - key: value
      const kvMatch = content.match(/^(\w[\w\s]*?):\s*(.*)/);
      if (kvMatch) {
        tokens.push({
          type: "LIST_ITEM_KV",
          raw,
          value: kvMatch[2]!.trim(),
          key: kvMatch[1]!.trim(),
          line: lineNum,
        });
        continue;
      }

      // Simple list item: - item
      tokens.push({
        type: "LIST_ITEM",
        raw,
        value: content,
        line: lineNum,
      });
      continue;
    }

    // Expresión matemática standalone: $...$
    if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
      tokens.push({
        type: "MATH_EXPR",
        raw,
        value: trimmed.slice(1, -1).trim(),
        line: lineNum,
      });
      continue;
    }

    // Cualquier otro texto
    tokens.push({
      type: "TEXT",
      raw,
      value: trimmed,
      line: lineNum,
    });
  }

  return tokens;
}
