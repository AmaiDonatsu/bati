// ============================================================
// Tipos del lenguaje Bati
// ============================================================

/** Tipos de componentes válidos en el lenguaje bati */
export type ComponentType =
  | "RESISTOR"
  | "CAPACITOR"
  | "INDUCTOR"
  | "LED"
  | "DIODE"
  | "OPAMP"
  | "TRANSISTOR"
  | "MOSFET"
  | "BATIAMP";

/** Categorías de componentes */
export type ComponentCategory = "non-polar" | "polar" | "active";

/** Tipo de fuente de señal */
export type FontType = "function" | "device";

/** Severidad de errores de sintaxis */
export type ErrorSeverity = "error" | "warning";

// ============================================================
// Estructuras de datos
// ============================================================

/** Bloque SIGNAL — fuente de alimentación del circuito */
export interface Signal {
  font: FontType;
  functionExpr: string; // constante o función matemática (ej: "9" o "$sin(x)$")
  hz?: number; // frecuencia en hercios (solo AC)
  isAC: boolean; // true si la función varía con el tiempo
  deviceId?: string; // id del device externo (solo font: "device")
}

/** Un puerto de entrada o salida de un componente */
export interface Port {
  name: string;
}

/** Función matemática de un componente (ej: Ampere, Voltaje, Ohm) */
export interface ComponentFunction {
  category: string; // "Ampere", "Voltaje", "Ohm", etc.
  expressions: string[]; // expresiones matemáticas del bloque
}

/** Valor constante de un componente (ej: resistance: 1000) */
export interface ComponentValue {
  key: string;
  value: string;
}

/** Componente electrónico declarado */
export interface Component {
  type: ComponentType;
  category: ComponentCategory;
  id: string;
  inputs: Port[];
  outputs: Port[];
  values: ComponentValue[];
  functions: ComponentFunction[];
  line: number; // línea donde fue declarado
}

/** Conexión entre componentes */
export interface Connection {
  id: string;
  from: string; // "SIGNAL", "GROUND" o "componentId.portId"
  to: string; // "SIGNAL", "GROUND" o "componentId.portId"
  line: number; // línea donde fue declarada
}

/** Error de sintaxis encontrado */
export interface BatiSyntaxError {
  line: number;
  message: string;
  severity: ErrorSeverity;
}

/** Estructura completa de un archivo .bati parseado */
export interface BatiFile {
  filename: string;
  signal: Signal | null;
  components: Component[];
  connections: Connection[];
  errors: BatiSyntaxError[];
}

// ============================================================
// Tokens del lexer
// ============================================================

export type TokenType =
  | "HEADER_1" // # ...
  | "HEADER_2" // ## ...
  | "HEADER_3" // ### ...
  | "TILDE_BLOCK" // ~~~
  | "LIST_ITEM_KV" // - key: value
  | "LIST_ITEM" // - item
  | "MATH_EXPR" // $...$  o  - $...$
  | "EMPTY" // línea vacía
  | "COMMENT" // // ...
  | "TEXT"; // cualquier otra cosa

export interface Token {
  type: TokenType;
  raw: string; // línea original
  value: string; // contenido procesado (sin prefijos #, -, etc.)
  key?: string; // solo para LIST_ITEM_KV
  level?: number; // nivel de heading (1, 2, 3)
  line: number; // número de línea (1-indexed)
}
