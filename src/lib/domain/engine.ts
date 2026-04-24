// ==========================================
// TYPES & INTERFACES
// ==========================================
export type StateContext = Record<string, any>;
export type LoggerFn = (msg: string, cls?: string) => void;
export type OnStateUpdateFn = (state: StateContext) => void;

export interface PlanNode {
  id: string;
  type: 'tool' | 'condition' | 'loop';
  toolId?: string;
  outputKey?: string;
  nextId?: string;
  expr?: string;
  trueId?: string;
  falseId?: string;
  bodyId?: string;
}

// ==========================================
// CLASSES METIER
// ==========================================
export class StateStore {
  public context: StateContext;
  private onUpdate: OnStateUpdateFn;

  constructor(initData: StateContext, onUpdate: OnStateUpdateFn = () => { }) {
    this.context = { ...initData };
    this.onUpdate = onUpdate;
  }

  update(key: string, value: any): void {
    if (key) this.context[key] = value;
    this.onUpdate(this.context);
  }

  getAll(): StateContext { return this.context; }
}

export class Tool {
  public id: string;
  public desc: string;
  public execFnString: string;
  private executeFn: Function;

  constructor(id: string, desc: string, execFnString: string) {
    this.id = id;
    this.desc = desc;
    this.execFnString = execFnString;
    this.executeFn = new Function('state', execFnString);
  }

  async execute(state: StateContext): Promise<any> {
    return new Promise(res => setTimeout(() => res(this.executeFn(state)), 400));
  }
}

// ==========================================
// ARCHITECTURE DU GRAPHE (Polymorphisme)
// ==========================================
export abstract class Step {
  id!: string;
  abstract execute(store: StateStore, logger: LoggerFn): Promise<Step | undefined>;
}

export class ToolStep extends Step {
  public tool: Tool;
  public outputKey?: string;
  public nextStep?: Step;

  constructor(id: string, tool: Tool, outputKey?: string) {
    super();
    this.id = id;
    this.tool = tool;
    this.outputKey = outputKey;
  }

  async execute(store: StateStore, logger: LoggerFn): Promise<Step | undefined> {
    logger(`[${this.id}] 🛠️ Exécute: ${this.tool.id}`);
    const result = await this.tool.execute(store.getAll());
    if (this.outputKey) {
      store.update(this.outputKey, result);
      logger(`[${this.id}] ✅ Mémoire maj: '${this.outputKey}'`);
    }
    return this.nextStep;
  }
}

export class ConditionStep extends Step {
  public expr: string;
  public trueBranch?: Step;
  public falseBranch?: Step;

  constructor(id: string, expr: string) {
    super();
    this.id = id;
    this.expr = expr;
  }

  async execute(store: StateStore, logger: LoggerFn): Promise<Step | undefined> {
    logger(`[${this.id}] 🔀 Évalue: ${this.expr}`, 'log-warn');
    const isTrue = new Function('state', `return ${this.expr}`)(store.getAll());
    logger(`[${this.id}] ↳ Résultat: ${isTrue ? 'VRAI' : 'FAUX'}`);
    return isTrue ? this.trueBranch : this.falseBranch;
  }
}

export class LoopStep extends Step {
  public expr: string;
  public loopBody?: Step;
  public nextStep?: Step;

  constructor(id: string, expr: string) {
    super();
    this.id = id;
    this.expr = expr;
  }

  async execute(store: StateStore, logger: LoggerFn): Promise<Step | undefined> {
    logger(`[${this.id}] 🔁 Condition boucle: ${this.expr}`, 'log-warn');
    const continueLoop = new Function('state', `return ${this.expr}`)(store.getAll());
    return continueLoop ? this.loopBody : this.nextStep;
  }
}

// ==========================================
// MOTEUR DE COMPILATION ET D'EXECUTION
// ==========================================
export async function executePlan(
  planNodes: PlanNode[],
  registry: Map<string, Tool>,
  rootId: string,
  initState: StateContext,
  logger: LoggerFn,
  onStateUpdate: OnStateUpdateFn
): Promise<void> {
  const store = new StateStore(initState, onStateUpdate);
  const instances = new Map<string, Step>();

  // 1. Phase de Compilation (Instanciation)
  planNodes.forEach(n => {
    if (n.type === 'tool' && n.toolId) {
      const tool = registry.get(n.toolId);
      if (tool) instances.set(n.id, new ToolStep(n.id, tool, n.outputKey));
      else throw new Error(`Outil manquant: ${n.toolId}`);
    }
    else if (n.type === 'condition' && n.expr) instances.set(n.id, new ConditionStep(n.id, n.expr));
    else if (n.type === 'loop' && n.expr) instances.set(n.id, new LoopStep(n.id, n.expr));
  });

  // 2. Phase de Wiring (Lier les identifiants aux pointeurs)
  planNodes.forEach(n => {
    const step = instances.get(n.id);
    if (!step) return;

    if (step instanceof ToolStep && n.nextId) step.nextStep = instances.get(n.nextId);
    if (step instanceof ConditionStep) {
      if (n.trueId) step.trueBranch = instances.get(n.trueId);
      if (n.falseId) step.falseBranch = instances.get(n.falseId);
    }
    if (step instanceof LoopStep) {
      if (n.bodyId) step.loopBody = instances.get(n.bodyId);
      if (n.nextId) step.nextStep = instances.get(n.nextId);
    }
  });

  // 3. Phase d'Exécution
  let currentStep: Step | undefined = instances.get(rootId);
  if (!currentStep) throw new Error(`Nœud racine '${rootId}' introuvable.`);

  let safetyCount = 30; // Sécurité anti boucle infinie
  while (currentStep && safetyCount > 0) {
    currentStep = await currentStep.execute(store, logger);
    safetyCount--;
  }

  if (safetyCount === 0) throw new Error("Boucle infinie détectée (limite 30 nœuds atteinte).");
}
