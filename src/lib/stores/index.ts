import { writable, type Writable, get } from 'svelte/store';
import { Tool, type PlanNode, type StateContext } from '../domain/engine';

export interface LogEntry { msg: string; cls: string; }

function extractFunctionBody(fn: Function): string {
  const fnStr = fn.toString();

  // Cas 1 : Fonctions classiques ou fléchées avec accolades (ex: function(state) { return 1; })
  // On cherche tout ce qui est entre la première et la dernière accolade.
  const match = fnStr.match(/^[^{]*{([\s\S]*)}$/);
  if (match) {
    return match[1].trim(); // Retourne juste le corps
  }

  // Cas 2 : Fonctions fléchées implicites (ex: state => state.count + 1)
  if (fnStr.includes('=>')) {
    const body = fnStr.split('=>')[1].trim();
    return `return ${body};`; // On rajoute le return pour le moteur
  }

  return fnStr;
}

// --- Initialisation ---
const initialRegistry = new Map<string, Tool>();

const toolModules = import.meta.glob('../tools/*.ts', { eager: true });

for (const path in toolModules) {
  const mod = toolModules[path] as { id: string, desc?: string, exec: Function };

  if (mod.id && typeof mod.exec === 'function') {
    // On stringify la fonction et on extrait son code brut
    const rawCode = extractFunctionBody(mod.exec);

    initialRegistry.set(
      mod.id,
      new Tool(mod.id, mod.desc || 'Aucune description', rawCode)
    );
  }
}


// --- Stores ---
export const registry: Writable<Map<string, Tool>> = writable(initialRegistry);
export const planNodes: Writable<PlanNode[]> = writable([]);
export const rootNodeId: Writable<string> = writable("");
export const initialInputState: Writable<string> = writable(`{"valeur": 5, "count": 0}`);

export const logs: Writable<LogEntry[]> = writable([]);
export const activeStoreState: Writable<StateContext> = writable({});

// --- Import / Export du Graphe ---
export function exportPlan() {
  const data = {
    rootId: get(rootNodeId),
    nodes: get(planNodes)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "agent_graph.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function loadPlan(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);
      rootNodeId.set(data.rootId || "");
      planNodes.set(data.nodes || []);
      alert("Graphe chargé avec succès !");
    } catch (err) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(file);
}
