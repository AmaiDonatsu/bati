import type { Component, Connection } from "../types";

// ============================================================
// CircuitGraph — Grafo topológico del circuito
// ============================================================

/** Un nodo en el grafo puede ser un puerto o un nodo especial */
interface GraphNode {
  id: string; // "SIGNAL", "GROUND", o "compId.portId"
  neighbors: Set<string>; // nodos adyacentes
}

export class CircuitGraph {
  private nodes = new Map<string, GraphNode>();
  private components: Component[];
  /** Mapa de resolución case-insensitive: "r2" → "r2", "R2" → "r2" */
  private idMap = new Map<string, string>();

  constructor(components: Component[], connections: Connection[]) {
    this.components = components;

    // Construir mapa case-insensitive de IDs
    for (const comp of components) {
      this.idMap.set(comp.id.toLowerCase(), comp.id);
    }
    // Nodos especiales
    this.idMap.set("signal", "SIGNAL");
    this.idMap.set("ground", "GROUND");

    // Crear nodos especiales
    this.ensureNode("SIGNAL");
    this.ensureNode("GROUND");

    // Crear nodos para cada puerto de cada componente
    for (const comp of components) {
      for (const port of [...comp.inputs, ...comp.outputs]) {
        this.ensureNode(`${comp.id}.${port.name}`);
      }

      // Conectar internamente los puertos de un componente (input → output)
      // Un componente es un "paso" para la señal
      for (const input of comp.inputs) {
        for (const output of comp.outputs) {
          this.addEdge(`${comp.id}.${input.name}`, `${comp.id}.${output.name}`);
        }
      }
    }

    // Crear aristas de conexiones (con normalización de IDs)
    for (const conn of connections) {
      const from = this.resolveNodeId(conn.from);
      const to = this.resolveNodeId(conn.to);
      this.addEdge(from, to);
    }
  }

  /**
   * Resuelve un endpoint de conexión a un ID canónico.
   * "R2.input1" → "r2.input1" (si el componente se llama "r2")
   * "SIGNAL" → "SIGNAL"
   */
  private resolveNodeId(endpoint: string): string {
    // Si es un nodo especial
    const lower = endpoint.toLowerCase();
    if (lower === "signal") return "SIGNAL";
    if (lower === "ground") return "GROUND";

    // Si tiene punto, es "compId.portId"
    const dotIdx = endpoint.indexOf(".");
    if (dotIdx !== -1) {
      const compPart = endpoint.slice(0, dotIdx);
      const portPart = endpoint.slice(dotIdx + 1);
      const canonicalComp = this.idMap.get(compPart.toLowerCase()) ?? compPart;
      return `${canonicalComp}.${portPart}`;
    }

    // Sin punto — buscar en mapa
    return this.idMap.get(lower) ?? endpoint;
  }

  private ensureNode(id: string): GraphNode {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, neighbors: new Set() });
    }
    return this.nodes.get(id)!;
  }

  private addEdge(from: string, to: string): void {
    const nodeA = this.ensureNode(from);
    const nodeB = this.ensureNode(to);
    nodeA.neighbors.add(to);
    nodeB.neighbors.add(from); // bidireccional
  }

  /** Obtiene los vecinos de un nodo */
  getNeighbors(nodeId: string): string[] {
    return [...(this.nodes.get(nodeId)?.neighbors ?? [])];
  }

  /** Verifica si un componente está en circuito cerrado (tiene camino a SIGNAL y GROUND) */
  isClosedCircuit(componentId: string): boolean {
    const comp = this.components.find(
      (c) => c.id.toLowerCase() === componentId.toLowerCase()
    );
    if (!comp) return false;

    // Encontrar cualquier puerto del componente
    const anyPort = comp.inputs[0] ?? comp.outputs[0];
    if (!anyPort) return false;

    const nodeId = `${comp.id}.${anyPort.name}`;
    const hasPathToSignal = this.hasPath(nodeId, "SIGNAL");
    const hasPathToGround = this.hasPath(nodeId, "GROUND");

    return hasPathToSignal && hasPathToGround;
  }

  /** BFS para encontrar si existe camino entre dos nodos */
  hasPath(from: string, to: string): boolean {
    const visited = new Set<string>();
    const queue: string[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (node) {
        for (const neighbor of node.neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }

    return false;
  }

  /**
   * Encuentra todos los caminos de un nodo a GROUND.
   * Retorna los IDs de componentes en el camino.
   */
  findPathsToGround(startNodeId: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]): void => {
      if (current === "GROUND") {
        paths.push([...path]);
        return;
      }
      if (visited.has(current)) return;
      visited.add(current);

      const node = this.nodes.get(current);
      if (node) {
        for (const neighbor of node.neighbors) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path, neighbor]);
          }
        }
      }

      visited.delete(current); // backtrack para encontrar múltiples caminos
    };

    dfs(startNodeId, [startNodeId]);
    return paths;
  }

  /**
   * Calcula la resistencia equivalente desde un nodo hasta GROUND.
   * Usa getResistance para obtener la resistencia de cada componente.
   */
  calculateEquivalentResistance(
    startNodeId: string,
    getResistance: (componentId: string) => number
  ): number {
    const paths = this.findPathsToGround(startNodeId);

    if (paths.length === 0) return Infinity;

    // Calcular resistencia de cada camino (en serie)
    const pathResistances = paths.map((path) => {
      let totalR = 0;
      const seenComponents = new Set<string>();

      for (const nodeId of path) {
        if (nodeId === "SIGNAL" || nodeId === "GROUND") continue;

        // Extraer componentId del nodo "compId.portId"
        const compId = nodeId.split(".")[0];
        if (compId && !seenComponents.has(compId)) {
          seenComponents.add(compId);
          totalR += getResistance(compId);
        }
      }

      return totalR;
    });

    // Si solo hay un camino, retornar esa resistencia
    if (pathResistances.length === 1) return pathResistances[0]!;

    // Si hay múltiples caminos (paralelo): 1/Req = 1/R1 + 1/R2 + ...
    let sumInverses = 0;
    for (const r of pathResistances) {
      if (r === 0) return 0; // cortocircuito
      if (r === Infinity) continue; // camino abierto, no contribuye
      sumInverses += 1 / r;
    }

    return sumInverses > 0 ? 1 / sumInverses : Infinity;
  }

  /**
   * Obtiene el ID del componente al que pertenece un nodo.
   * Retorna null para "SIGNAL" y "GROUND".
   */
  getComponentId(nodeId: string): string | null {
    if (nodeId === "SIGNAL" || nodeId === "GROUND") return null;
    return nodeId.split(".")[0] ?? null;
  }

  /**
   * Obtiene la lista ordenada de componentes desde SIGNAL hasta GROUND
   * para el camino que pasa por un componente dado.
   */
  getComponentsInCircuit(): string[] {
    const compIds = new Set<string>();
    for (const comp of this.components) {
      if (this.isClosedCircuit(comp.id)) {
        compIds.add(comp.id);
      }
    }
    return [...compIds];
  }

  /** Obtiene todos los nodos del grafo */
  getAllNodes(): string[] {
    return [...this.nodes.keys()];
  }
}
