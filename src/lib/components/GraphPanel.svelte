<script lang="ts">
  import { planNodes, exportPlan, loadPlan } from "../stores";

  function deleteNode(id: string): void {
    $planNodes = $planNodes.filter((n) => n.id !== id);
  }
</script>

<div class="panel col-main">
  <div
    style="display: flex; justify-content: space-between; align-items: center;"
  >
    <h2>⚙️ Graphe d'Exécution</h2>
    <div style="display:flex; gap: 8px;">
      <button
        class="btn-sys"
        style="margin:0; padding: 4px 8px; width:auto;"
        on:click={exportPlan}>📥 Exporter</button
      >
      <label
        class="btn-sys"
        style="margin:0; padding: 4px 8px; width:auto; cursor: pointer; text-align: center;"
      >
        📤 Charger
        <input
          type="file"
          accept=".json"
          style="display:none;"
          on:change={loadPlan}
        />
      </label>
    </div>
  </div>
  <p style="font-size: 13px; color: var(--text-light); margin-top: 0;">
    Ajoutez des outils depuis le registre pour construire le plan.
  </p>

  <div class="step-list">
    {#if $planNodes.length === 0}
      <p style="color:gray;text-align:center;margin-top:40px;">
        Graphe vide. Ajoutez un outil depuis la gauche.
      </p>
    {/if}

    {#each $planNodes as n (n.id)}
      <div
        class="node-card"
        class:node-tool={n.type === "tool"}
        class:node-cond={n.type === "condition"}
        class:node-loop={n.type === "loop"}
        class:node-setvar={n.type === "setVariable"}
      >
        <div class="node-header">
          <div class="node-title">
            <span>ID:</span>
            <input type="text" class="node-id-input" bind:value={n.id} />
            <span style="color:var(--text-light); margin-left:10px;">
              {#if n.type === "tool"}
                🛠️ {n.toolId}
              {/if}
              {#if n.type === "condition"}
                🔀 Condition
              {/if}
              {#if n.type === "loop"}
                🔁 Boucle
              {/if}
              {#if n.type === "setVariable"}
                🔧 Variable
              {/if}
            </span>
          </div>
          <button class="btn-danger" on:click={() => deleteNode(n.id)}
            >Supprimer</button
          >
        </div>

        {#if n.type === "tool"}
          <div class="inline-inputs">
            <div>
              <label>Save in State</label><input
                type="text"
                bind:value={n.outputKey}
              />
            </div>
            <div>
              <label>Suivant (ID)</label><input
                type="text"
                bind:value={n.nextId}
                placeholder="Vide = Fin"
              />
            </div>
          </div>
        {:else if n.type === "condition"}
          <label>Condition JS (return bool)</label><input
            type="text"
            bind:value={n.expr}
          />
          <div class="inline-inputs">
            <div>
              <label>Vrai ➜ ID</label><input
                type="text"
                bind:value={n.trueId}
              />
            </div>
            <div>
              <label>Faux ➜ ID</label><input
                type="text"
                bind:value={n.falseId}
              />
            </div>
          </div>
        {:else if n.type === "loop"}
          <label>Continuer tant que (JS)</label><input
            type="text"
            bind:value={n.expr}
          />
          <div class="inline-inputs">
            <div>
              <label>Corps (ID)</label><input
                type="text"
                bind:value={n.bodyId}
              />
            </div>
            <div>
              <label>Sortie (ID)</label><input
                type="text"
                bind:value={n.nextId}
              />
            </div>
          </div>
        {:else if n.type === "setVariable"}
          <div class="inline-inputs">
            <div>
              <label>Clé (Nom dans le state)</label><input
                type="text"
                bind:value={n.key}
                placeholder="ex: newVariable"
              />
            </div>
            <div>
              <label>Valeur à assigner</label><input
                type="text"
                bind:value={n.value}
                placeholder="ex: 'valeur' ou state.val"
              />
            </div>
          </div>
          <div style="margin-top: 8px;">
            <label>Suivant (ID)</label><input
              type="text"
              bind:value={n.nextId}
              placeholder="Vide = Fin"
            />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
