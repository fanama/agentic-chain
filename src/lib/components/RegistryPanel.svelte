<script lang="ts">
  import { registry, planNodes, rootNodeId } from "../stores";
  import { Tool, type PlanNode } from "../domain/engine";

  let isEditing: boolean = false;
  let toolForm = { id: "", desc: "", exec: 'return { status: "ok" };' };

  function addNode(
    type: "tool" | "condition" | "loop" | "setVariable", // <-- Added 'setVariable'
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
      // <-- Added initialization logic
      newNode = {
        ...newNode,
        key: "newKey",
        value: "''", // Default to an empty string (or whatever fits your needs)
        nextId: "",
      };
    }

    $planNodes = [...$planNodes, newNode];
    if ($planNodes.length === 1) $rootNodeId = id;
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
    if (!toolForm.id || !toolForm.exec) return alert("ID et logique requis.");
    try {
      new Function("state", toolForm.exec); // Validation syntaxe JS
      $registry.set(
        toolForm.id,
        new Tool(toolForm.id, toolForm.desc, toolForm.exec),
      );
      $registry = $registry; // Force la réactivité Svelte
      cancelEdit();
    } catch (e: any) {
      alert("Erreur de Syntaxe JS :\n" + e.message);
    }
  }
</script>

<div class="panel col-left">
  <h2>🛠️ Registry & Tools</h2>
  <div style="margin-bottom: 20px;">
    <label>Outils par default (Système)</label>
    <button
      class="btn-sys"
      style="border-left: 4px solid var(--warning)"
      on:click={() => addNode("condition")}>🔀 Ajouter Condition</button
    >

    <button
      class="btn-sys"
      style="border-left: 4px solid var(--info, #3b82f6); margin-top: 5px;"
      on:click={() => addNode("setVariable")}>🔧 Assigner Variable</button
    >
  </div>

  <label>Outils d'Action (Fonctions)</label>
  <div>
    {#each Array.from($registry.values()) as tool}
      <div class="card" style="border-left: 4px solid var(--success)">
        <div style="font-weight: bold; font-size: 14px;">{tool.id}</div>
        <div style="font-size: 11px; color: gray; margin: 4px 0 8px 0;">
          {tool.desc}
        </div>
        <div style="display:flex; gap: 5px;">
          <button
            class="btn-add"
            style="flex: 2; margin-top: 0;"
            on:click={() => addNode("tool", tool.id)}>+ Plan</button
          >
          <button
            class="btn-edit"
            style="flex: 1; margin-top: 0;"
            on:click={() => editTool(tool.id)}>✏️ Edit</button
          >
        </div>
      </div>
    {/each}
  </div>

  <hr />

  <h3>{isEditing ? "Éditer l'Outil" : "Nouveau Tool"}</h3>
  <input
    type="text"
    bind:value={toolForm.id}
    placeholder="ID (ex: envoyer_email)"
    disabled={isEditing}
  />
  <textarea bind:value={toolForm.desc} placeholder="Description" rows="1"
  ></textarea>
  <label>Logique (JS) - return output;</label>
  <textarea bind:value={toolForm.exec} rows="3"></textarea>

  <div style="display: flex; gap: 10px; margin-top: 8px;">
    <button
      class="btn-add"
      style="flex: 1; margin-top: 0; {isEditing
        ? 'background: var(--primary)'
        : ''}"
      on:click={saveTool}
    >
      {isEditing ? "💾 Mettre à jour" : "+ Enregistrer"}
    </button>
    {#if isEditing}
      <button class="btn-danger" style="padding: 8px;" on:click={cancelEdit}
        >Annuler</button
      >
    {/if}
  </div>
</div>
