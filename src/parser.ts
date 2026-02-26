import type {
  Token,
  BatiFile,
  Signal,
  Component,
  Connection,
  BatiSyntaxError,
  ComponentFunction,
  ComponentValue,
  Port,
  ComponentType,
} from "./types";
import {
  BATI_MAGIC_KEY,
  COMPONENT_CATEGORIES,
  VALID_COMPONENT_TYPES,
  COMPONENT_SECTIONS,
} from "./constants";

// ============================================================
// Parser — Analiza los tokens y construye un BatiFile
// ============================================================

export function parse(tokens: Token[], filename: string): BatiFile {
  const result: BatiFile = {
    filename,
    signal: null,
    components: [],
    connections: [],
    errors: [],
  };

  let pos = 0;

  // Helper: avanza saltando EMPTY y COMMENT
  function skipBlank(): void {
    while (
      pos < tokens.length &&
      (tokens[pos]!.type === "EMPTY" || tokens[pos]!.type === "COMMENT")
    ) {
      pos++;
    }
  }

  // Helper: token actual
  function current(): Token | undefined {
    return tokens[pos];
  }

  // Helper: añadir error
  function addError(line: number, message: string): void {
    result.errors.push({ line, message, severity: "error" });
  }

  // Helper: añadir warning
  function addWarning(line: number, message: string): void {
    result.errors.push({ line, message, severity: "warning" });
  }

  // -------------------------------------------------------
  // FASE 1: Verificar # batita
  // -------------------------------------------------------
  skipBlank();
  const firstToken = current();
  if (!firstToken) {
    addError(1, "Archivo vacío. Se esperaba '# batita' en la primera línea.");
    return result;
  }

  if (
    firstToken.type !== "HEADER_1" ||
    firstToken.value.toLowerCase() !== BATI_MAGIC_KEY
  ) {
    addError(
      firstToken.line,
      `La primera línea debe ser '# batita'. Se encontró: '${firstToken.raw.trim()}'`
    );
    // Continuamos parseando para encontrar más errores
    // pero si el primer token NO es un header con "batita", no avanzamos pos
    // solo lo avanzamos si sí lo era
  } else {
    pos++; // consumir # batita
  }

  // -------------------------------------------------------
  // FASE 2: Parsear bloque SIGNAL (~~~ ... ~~~)
  // -------------------------------------------------------
  skipBlank();
  if (current()?.type === "TILDE_BLOCK") {
    pos++; // consumir ~~~  apertura
    result.signal = parseSignalBlock();
  }

  // -------------------------------------------------------
  // FASE 3 y 4: Parsear componentes y conexiones
  // -------------------------------------------------------
  while (pos < tokens.length) {
    skipBlank();
    const tok = current();
    if (!tok) break;

    if (tok.type === "HEADER_1") {
      const headerValue = tok.value.trim();

      if (headerValue === "CONNECTION") {
        pos++;
        parseConnection(tok.line);
      } else if (VALID_COMPONENT_TYPES.has(headerValue)) {
        pos++;
        parseComponent(headerValue as ComponentType, tok.line);
      } else {
        // header desconocido — podría ser un tipo de componente inválido
        addError(
          tok.line,
          `Tipo de componente desconocido: '${headerValue}'. Tipos válidos: ${[...VALID_COMPONENT_TYPES].join(", ")}`
        );
        pos++;
        // Avanzar hasta el siguiente HEADER_1
        skipToNextHeader1();
      }
    } else {
      // token inesperado fuera de contexto
      pos++;
    }
  }

  // Validaciones cruzadas post-parse
  validateConnections();

  return result;

  // ============================================================
  // Sub-parsers
  // ============================================================

  function parseSignalBlock(): Signal {
    const signal: Signal = {
      font: "function",
      functionExpr: "9",
      isAC: false,
    };

    let foundClosingTilde = false;

    while (pos < tokens.length) {
      const tok = current()!;

      if (tok.type === "TILDE_BLOCK") {
        pos++; // consumir ~~~ cierre
        foundClosingTilde = true;
        break;
      }

      if (tok.type === "HEADER_1" && tok.value === "SIGNAL") {
        pos++;
        continue;
      }

      if (tok.type === "HEADER_2") {
        // ## ORIGEN:
        pos++;
        continue;
      }

      if (tok.type === "LIST_ITEM_KV") {
        const key = tok.key!.toLowerCase();
        if (key === "font") {
          signal.font = tok.value as "function" | "external";
        } else if (key === "function") {
          signal.functionExpr = tok.value;
          // Si la función contiene $ y variables, es AC
          signal.isAC = /\$.*[a-z].*\$/i.test(tok.value) || /[a-z]\(/i.test(tok.value.replace(/\$/g, ""));
        } else if (key === "hz") {
          signal.hz = parseFloat(tok.value);
          signal.isAC = true;
        }
        pos++;
        continue;
      }

      // Otros tokens dentro del bloque signal
      pos++;
    }

    if (!foundClosingTilde) {
      addError(
        tokens[pos - 1]?.line ?? 1,
        "Bloque SIGNAL no tiene cierre '~~~'."
      );
    }

    return signal;
  }

  function parseComponent(type: ComponentType, startLine: number): void {
    const category = COMPONENT_CATEGORIES[type];
    const component: Component = {
      type,
      category,
      id: "",
      inputs: [],
      outputs: [],
      values: [],
      functions: [],
      line: startLine,
    };

    // Buscar - id:
    skipBlank();
    if (current()?.type === "LIST_ITEM_KV" && current()?.key === "id") {
      component.id = current()!.value;
      pos++;
    } else {
      addError(
        current()?.line ?? startLine,
        `Componente ${type} (línea ${startLine}): falta declaración '- id: <nombre>'.`
      );
    }

    // Parsear secciones ## del componente
    while (pos < tokens.length) {
      skipBlank();
      const tok = current();
      if (!tok) break;

      // Si encontramos otro HEADER_1, terminó este componente
      if (tok.type === "HEADER_1") break;

      if (tok.type === "HEADER_2") {
        const sectionName = tok.value.replace(/:$/, "").trim().toLowerCase();
        pos++;

        if (sectionName === "inputs") {
          component.inputs = parsePortList();
        } else if (sectionName === "outputs") {
          component.outputs = parsePortList();
        } else if (sectionName === "values") {
          component.values = parseValueList();
        } else if (sectionName === "functions") {
          component.functions = parseFunctionBlock();
        } else if (!COMPONENT_SECTIONS.has(sectionName)) {
          addWarning(
            tok.line,
            `Componente '${component.id || type}': sección desconocida '## ${tok.value}'.`
          );
        }
        continue;
      }

      // Otros tokens — siguiente
      pos++;
    }

    // Validar que tiene id
    if (!component.id) {
      addError(
        startLine,
        `Componente ${type} (línea ${startLine}): no se encontró '- id:'.`
      );
    }

    result.components.push(component);
  }

  function parsePortList(): Port[] {
    const ports: Port[] = [];
    while (pos < tokens.length) {
      skipBlank();
      const tok = current();
      if (!tok) break;
      if (tok.type === "HEADER_1" || tok.type === "HEADER_2") break;

      if (tok.type === "LIST_ITEM") {
        ports.push({ name: tok.value.trim() });
        pos++;
        continue;
      }

      // Otros tokens — saltar
      if (tok.type === "COMMENT" || tok.type === "TEXT") {
        pos++;
        continue;
      }

      break;
    }
    return ports;
  }

  function parseValueList(): ComponentValue[] {
    const values: ComponentValue[] = [];
    while (pos < tokens.length) {
      skipBlank();
      const tok = current();
      if (!tok) break;
      if (tok.type === "HEADER_1" || tok.type === "HEADER_2") break;

      if (tok.type === "LIST_ITEM_KV") {
        values.push({ key: tok.key!, value: tok.value });
        pos++;
        continue;
      }

      if (tok.type === "COMMENT" || tok.type === "TEXT") {
        pos++;
        continue;
      }

      break;
    }
    return values;
  }

  function parseFunctionBlock(): ComponentFunction[] {
    const functions: ComponentFunction[] = [];
    let currentFn: ComponentFunction | null = null;

    while (pos < tokens.length) {
      skipBlank();
      const tok = current();
      if (!tok) break;
      if (tok.type === "HEADER_1" || tok.type === "HEADER_2") break;

      if (tok.type === "HEADER_3") {
        // ### Ampere, ### Voltaje, etc.
        if (currentFn) functions.push(currentFn);
        currentFn = { category: tok.value, expressions: [] };
        pos++;
        continue;
      }

      if (tok.type === "MATH_EXPR" || tok.type === "LIST_ITEM") {
        if (currentFn) {
          currentFn.expressions.push(tok.value);
        }
        pos++;
        continue;
      }

      if (tok.type === "COMMENT" || tok.type === "TEXT") {
        pos++;
        continue;
      }

      break;
    }

    if (currentFn) functions.push(currentFn);
    return functions;
  }

  function parseConnection(startLine: number): void {
    const connection: Connection = {
      id: "",
      from: "",
      to: "",
      line: startLine,
    };

    // Buscar - id:
    skipBlank();
    if (current()?.type === "LIST_ITEM_KV" && current()?.key === "id") {
      connection.id = current()!.value;
      pos++;
    } else {
      addError(
        current()?.line ?? startLine,
        `CONNECTION (línea ${startLine}): falta declaración '- id: <nombre>'.`
      );
    }

    // Buscar ## from: y ## to:
    while (pos < tokens.length) {
      skipBlank();
      const tok = current();
      if (!tok) break;
      if (tok.type === "HEADER_1") break;

      if (tok.type === "HEADER_2") {
        const headerValue = tok.value.trim();

        // ## from: SIGNAL  o  ## from: R1.input1
        const fromMatch = headerValue.match(/^from:\s*(.*)/i);
        if (fromMatch) {
          connection.from = fromMatch[1]!.trim();
          pos++;
          continue;
        }

        // ## to: R1.input1
        const toMatch = headerValue.match(/^to:\s*(.*)/i);
        if (toMatch) {
          connection.to = toMatch[1]!.trim();
          pos++;
          continue;
        }

        // Sección desconocida en CONNECTION
        addWarning(
          tok.line,
          `CONNECTION '${connection.id}': sección desconocida '## ${tok.value}'.`
        );
        pos++;
        continue;
      }

      pos++;
    }

    // Validar campos obligatorios
    if (!connection.from) {
      addError(
        startLine,
        `CONNECTION '${connection.id}' (línea ${startLine}): falta '## from: <origen>'.`
      );
    }
    if (!connection.to) {
      addError(
        startLine,
        `CONNECTION '${connection.id}' (línea ${startLine}): falta '## to: <destino>'.`
      );
    }

    result.connections.push(connection);
  }

  // ============================================================
  // Validaciones cruzadas
  // ============================================================

  function validateConnections(): void {
    const componentIds = new Set(result.components.map((c) => c.id.toLowerCase()));
    const componentMap = new Map(result.components.map((c) => [c.id.toLowerCase(), c]));

    for (const conn of result.connections) {
      validateEndpoint(conn.from, conn, "from");
      validateEndpoint(conn.to, conn, "to");
    }

    function validateEndpoint(
      endpoint: string,
      conn: Connection,
      direction: "from" | "to"
    ): void {
      if (!endpoint) return;

      // SIGNAL y GROUND son válidos
      if (endpoint === "SIGNAL" || endpoint === "GROUND") return;

      // Formato esperado: componentId.portId
      const parts = endpoint.split(".");
      if (parts.length !== 2) {
        addError(
          conn.line,
          `CONNECTION '${conn.id}': '${direction}: ${endpoint}' no tiene formato válido. Se esperaba 'componentId.portId'.`
        );
        return;
      }

      const [compId, portId] = parts as [string, string];

      // Verificar que el componente existe
      if (!componentIds.has(compId.toLowerCase())) {
        addError(
          conn.line,
          `CONNECTION '${conn.id}': el componente '${compId}' en '${direction}' no fue declarado.`
        );
        return;
      }

      // Verificar que el puerto existe en el componente
      const comp = componentMap.get(compId.toLowerCase())!;
      const allPorts = [...comp.inputs, ...comp.outputs].map((p) =>
        p.name.toLowerCase()
      );
      if (!allPorts.includes(portId.toLowerCase())) {
        addWarning(
          conn.line,
          `CONNECTION '${conn.id}': el puerto '${portId}' no fue declarado en el componente '${compId}'. Puertos disponibles: ${allPorts.join(", ")}`
        );
      }
    }
  }

  function skipToNextHeader1(): void {
    while (pos < tokens.length && current()?.type !== "HEADER_1") {
      pos++;
    }
  }
}
