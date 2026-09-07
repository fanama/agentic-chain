<script lang="ts">
  import { registry, planNodes, rootNodeId } from "../stores";
  import { Tool, type PlanNode } from "../domain/engine";
  import { showToast } from "../stores/toasts";

  let isEditing: boolean = false;
  let toolForm = { id: "", desc: "", exec: 'return { status: "ok" };' };

  function addNode(
    type: "tool" | "condition" | "loop" | "setVariable",
    toolId: string | null = null,
  ): void {
    const id = `etape_${$planNodes.length + 1}`;
    let newNode: PlanNode = { id, type };

    if (type === "tool") {
      newNode = {
        ...newNode,
        toolId: toolId as string,
        outputKey: `${toolId}_result`,
        nextId: "",
      };
    } else if (type === "condition") {
      newNode = {
        ...newNode,
        expr: "state.valeur > 10",
        trueId: "",
        falseId: "",
      };
    } else if (type === "loop") {
      newNode = { ...newNode, expr: "state.count < 3", bodyId: "", nextId: "" };
    } else if (type === "setVariable") {
      newNode = {
        ...newNode,
        key: "newKey",
        value: '""',
        nextId: "",
      };
    }

    $planNodes = [...$planNodes, newNode];
    if ($planNodes.length === 1) $rootNodeId = id;
    const names: Record<string, string> = {
      tool: 'Outil',
      condition: 'Condition',
      loop: 'Boucle',
      setVariable: 'Variable',
    };
    showToast(`${names[type] ?? type} ajouté au graphe`, 'success');
  }

  function editTool(id: string): void {
    const tool = $registry.get(id);
    if (!tool) return;
    toolForm = { id: tool.id, desc: tool.desc, exec: tool.execFnString };
    isEditing = true;
  }

  function cancelEdit(): void {
    toolForm = { id: "", desc: "", exec: 'return { status: "ok" };' };
    isEditing = false;
  }

  function saveTool(): void {
    if (!toolForm.id.trim()) {
      showToast('Veuillez donner un ID à l’outil.', 'warn');
      return;
    }
    if (!toolForm.exec.trim()) {
      showToast('Le code de la logique est requis.', 'warn');
      return;
    }
    try {
      new Function("state", toolForm.exec);
      $registry.set(
        toolForm.id,
        new Tool(toolForm.id, toolForm.desc, toolForm.exec),
      );
      $registry = $registry;
      showToast(`Outil "${toolForm.id}" enregistré`, 'success');
      cancelEdit();
    } catch (e: any) {
      showToast(`Erreur de syntaxe JS : ${e.message}`, 'error', 6000);
    }
  }
</script>

<section class="panel col-left">
  <h2 class="panel-title">🛠️ Registry & Tools</h2>
  <p class="panel-subtitle">Définissez vos outils puis ajoutez-les au graphe.</p>

  <div style="margin-bottom: 18px;">
    <span class="section-label">Nœuds système (rapides)</span>
    <button
      class="btn-sys"
      style="border-left: 4px solid var(--warning)"
      on:click={() => addNode("condition")}
      title="Ajouter une branche conditionnelle au graphe"
      >🔀 Ajouter une Condition</button
    >

    <button
      class="btn-sys"
      style="border-left: 4px solid #3b82f6; margin-top: 5px;"
      on:click={() => addNode("setVariable")}
      title="Assigner une variable dans le state"
      >🔧 Assigner une Variable</button
    >
  </div>

  <span class="section-label">Outils d'Action (Fonctions)</span>
  <div>
    {#if Array.from($registry.values()).length === 0}
      <p style="color: var(--text-light); font-size: 13px;">
        Aucun outil pour l'instant. Créez-en un ci-dessous.
      </p>
    {/if}
    {#each Array.from($registry.values()) as tool}
      <div class="card" style="border-left: 4px solid var(--success)">
        <div style="font-weight: bold; font-size: 14px; display:flex; align-items:center; gap:6px;">
          <span style="opacity:0.7;">🛠️</span>{tool.id}
        </div>
        <div style="font-size: 11px; color: gray; margin: 4px 0 8px 0;">
          {tool.desc}
        </div>
        <div style="display:flex; gap: 5px;">
          <button
            class="btn-add"
            style="flex: 2; margin-top: 0;"
            on:click={() => addNode("tool", tool.id)}
            title="Ajouter cet outil comme nœud du graphe"
            >+ Ajouter au Plan</button
          >
          <button
            class="btn-edit"
            style="flex: 1; margin-top: 0;"
            on:click={() => editTool(tool.id)}
            title="Éditer le code de cet outil"
            >✏️ Éditer</button
          >
        </div>
      </div>
    {/each}
  </div>

  <hr />

  <h3 class="panel-title" style="font-size:15px;">
    {isEditing ? "Éditer l'Outil" : "Nouvel Outil"}
  </h3>
  <label for="tool-id-input">ID unique</label>
  <input
    id="tool-id-input"
    type="text"
    bind:value={toolForm.id}
    placeholder="ex: envoyer_email"
    disabled={isEditing}
  />
  <label for="tool-desc">Description</label>
  <textarea
    id="tool-desc"
    bind:value={toolForm.desc}
    placeholder="Que fait cet outil ?"
    rows="1"
  ></textarea>
  <label for="tool-exec">Logique (JS) - agit sur <code>state</code></label>
  <textarea
    id="tool-exec"
    class="mono"
    bind:value={toolForm.exec}
    rows="3"
    placeholder="return &#123; status: 'ok' &#125;;"
  ></textarea>
  <p class="field-hint" style="margin: -4px 0 8px;">
    Exécuté avec la variable <code>state</code> en paramètre.
  </p>

  <div style="display: flex; gap: 10px; margin-top: 8px;">
    <button
      class="btn-add"
      style="flex: 1; margin-top: 0;"
      on:click={saveTool}
    >
      {isEditing ? "💾 Mettre à jour" : "＋ Enregistrer"}
    </button>
    {#if isEditing}
      <button class="btn-danger" style="padding: 8px;" on:click={cancelEdit}
        >Annuler</button
      >
    {/if}
  </div>
</section>
