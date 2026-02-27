// ============================================================
// mathEval — Evaluador ligero de expresiones matemáticas
// ============================================================

/**
 * Evalúa una expresión matemática con variables de contexto.
 *
 * Soporta:
 * - Operaciones: +, -, *, /, ^, ()
 * - Funciones: sin, cos, tan, sqrt, abs, log
 * - Variables: resuelve desde el contexto (ej: "input1.v", "resistance", "x")
 * - Strips automáticos: $...$ de LaTeX, prefijos "V =", "I =", "R ="
 * - Constantes: INFINIT → Infinity, PI → Math.PI
 */
export function evaluate(
  expr: string,
  context: Record<string, number>
): number {
  // Limpiar la expresión
  let cleaned = cleanExpression(expr);

  // Si está vacía después de limpiar, retornar 0
  if (!cleaned.trim()) return 0;

  // Sustituir constantes especiales
  cleaned = cleaned.replace(/\bINFINIT\b/gi, "Infinity");
  cleaned = cleaned.replace(/\bPI\b/g, String(Math.PI));

  // Sustituir variables del contexto (orden por longitud para evitar sustituciones parciales)
  const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    // Escapar puntos para regex
    const escaped = key.replace(/\./g, "\\.");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    cleaned = cleaned.replace(regex, String(context[key]));
  }

  // Sustituir funciones matemáticas
  cleaned = cleaned.replace(/\bsin\b/g, "Math.sin");
  cleaned = cleaned.replace(/\bcos\b/g, "Math.cos");
  cleaned = cleaned.replace(/\btan\b/g, "Math.tan");
  cleaned = cleaned.replace(/\bsqrt\b/g, "Math.sqrt");
  cleaned = cleaned.replace(/\babs\b/g, "Math.abs");
  cleaned = cleaned.replace(/\blog\b/g, "Math.log");

  // Convertir ^ a **
  cleaned = cleaned.replace(/\^/g, "**");

  // Evaluar con Function (sandbox limitado)
  try {
    const fn = new Function("Math", `"use strict"; return (${cleaned});`);
    const result = fn(Math) as number;
    return typeof result === "number" && !isNaN(result) ? result : 0;
  } catch {
    return 0;
  }
}

/**
 * Limpia una expresión matemática removiendo sintaxis de bati/LaTeX
 */
function cleanExpression(expr: string): string {
  let result = expr.trim();

  // Strip $...$  de LaTeX
  if (result.startsWith("$") && result.endsWith("$")) {
    result = result.slice(1, -1).trim();
  }
  // También strip $ individuales
  result = result.replace(/\$/g, "");

  // Strip prefijos de asignación: "V = ...", "I = ...", "R = ..."
  result = result.replace(/^[VIR]\s*=\s*/i, "");

  // Strip el guión de lista "- ..."
  if (result.startsWith("-") && !result.startsWith("-(")) {
    // Solo si es un dash de lista, no un negativo
    const afterDash = result.slice(1).trim();
    if (afterDash && !/^\d/.test(afterDash.charAt(0))) {
      // Probablemente no es un número negativo
      result = afterDash;
    } else if (afterDash && /^\d/.test(afterDash.charAt(0))) {
      // Es un número negativo, dejarlo
    } else {
      result = afterDash;
    }
  }

  // Convertir \* (escaped asterisk de markdown) a *
  result = result.replace(/\\\*/g, "*");

  return result.trim();
}
