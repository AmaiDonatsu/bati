import type { ComponentType, ComponentCategory } from "./types";

// ============================================================
// Componentes válidos y sus categorías
// ============================================================

/** Mapa de tipo de componente a su categoría */
export const COMPONENT_CATEGORIES: Record<ComponentType, ComponentCategory> = {
  // No polares
  RESISTOR: "non-polar",
  CAPACITOR: "non-polar",
  INDUCTOR: "non-polar",
  // Polares
  LED: "polar",
  DIODE: "polar",
  // Activos (también son polares)
  OPAMP: "active",
  TRANSISTOR: "active",
  MOSFET: "active",
  BATIAMP: "active",
};

/** Lista de todos los tipos de componentes válidos */
export const VALID_COMPONENT_TYPES: Set<string> = new Set(
  Object.keys(COMPONENT_CATEGORIES)
);

/** Palabras reservadas del lenguaje */
export const RESERVED_WORDS: Set<string> = new Set([
  "SIGNAL",
  "GROUND",
  "CONNECTION",
]);

/** La clave mágica que debe estar en la primera línea */
export const BATI_MAGIC_KEY = "batita";

/** Secciones válidas dentro de un componente (## level) */
export const COMPONENT_SECTIONS: Set<string> = new Set([
  "inputs",
  "outputs",
  "values",
  "functions",
]);
