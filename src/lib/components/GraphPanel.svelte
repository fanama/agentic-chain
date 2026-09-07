<script lang="ts">
  import { planNodes, exportPlan, loadPlan, initialInputState, activeStoreState } from "../stores";
  import { showToast } from "../stores/toasts";
  import SetVariableEditor from "./SetVariableEditor.svelte";

  function deleteNode(id: string): void {
    if (!confirm('Supprimer ce nœud du graphe ?')) return;
    $planNodes = $planNodes.filter((n) => n.id !== id);
    showToast('Nœud supprimé', 'warn');
  }

  function moveNode(id: string, dir: -1 | 1): void {
    const idx = $planNodes.findIndex((n) => n.id === id);
    const target = idx + dir;
    if (target < 0 || target >= $planNodes.length) return;
    const arr = [...$planNodes];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    $planNodes = arr;
  }

  const typeMeta: Record<string, { label: string; icon: string; cls: string }> = {
    tool: { label: 'Outil', icon: '🛠️', cls: 'tool' },
    condition: { label: 'Condition', icon: '🔀', cls: 'condition' },
    loop: { label: 'Boucle', icon: '🔁', cls: 'loop' },
    setVariable: { label: 'Variable', icon: '🔧', cls: 'setvar' },
  };

  let nodeIds: string[] = [];
  let stateKeys: string[] = [];
  let statePaths: { expr: string }[] = [];

  function pushPaths(value: any, prefix: string, acc: { expr: string }[], depth: number): void {
    if (depth > 0) acc.push({ expr: `state${prefix}` });
    if (depth >= 4) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => pushPaths(v, `${prefix}[${i}]`, acc, depth + 1));
    } else if (value !== null && typeof value === "object") {
      for (const k of Object.keys(value)) {
        const seg = /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `["${k}"]`;
        pushPaths(value[k], `${prefix}${seg}`, acc, depth + 1);
      }
    }
  }

  $: {
    nodeIds = $planNodes.map((n) => n.id);
    const set = new Set<string>();
    try { for (const k of Object.keys(JSON.parse($initialInputState))) set.add(k); } catch { }
    for (const k of Object.keys($activeStoreState)) set.add(k);
    for (const n of $planNodes) {
      if (n.type === "tool" && n.outputKey?.trim()) set.add(n.outputKey!);
      if (n.type === "setVariable" && n.key?.trim()) set.add(n.key!);
      const ref = n.type === "setVariable" && n.value?.match(/^state\.([A-Za-z_$][\w$]*)$/);
      if (ref) set.add(ref[1]);
    }
    stateKeys = Array.from(set).sort((a, b) => a.localeCompare(b));

    const paths: { expr: string }[] = [];
    try { for (const [k, v] of Object.entries(JSON.parse($initialInputState))) pushPaths(v, `.${k}`, paths, 0); } catch { }
    for (const [k, v] of Object.entries($activeStoreState)) pushPaths(v, `.${k}`, paths, 0);
    statePaths = Array.from(
      new Map(paths.map((p) => [p.expr, p])).values(),
    ).sort((a, b) => a.expr.localeCompare(b.expr));
  }
</script>

<section class="panel col-main">
  <div
    style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;"
  >
    <h2 class="panel-title">⚙️ Graphe d'Exécution</h2>
    <div style="display:flex; gap: 8px;">
      <button
        class="btn-sys"
        style="margin:0; padding: 8px 12px; width:auto;"
        on:click={exportPlan}
        title="Télécharger le graphe en JSON"
        >📥 Exporter</button
      >
      <label
        class="btn-sys"
        style="margin:0; padding: 8px 12px; width:auto; cursor: pointer; text-align: center;"
        title="Charger un graphe depuis un fichier JSON"
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
  <p class="panel-subtitle">
    Ajoutez des outils depuis le registre pour construire le plan.
  </p>

  <div class="step-list { $planNodes.length > 0 ? 'has-nodes' : '' }">
    {#if $planNodes.length === 0}
      <div class="empty-state">
        <span class="icon">🗺️</span>
        <div class="title">Graphe vide</div>
        <div class="sub">
          Ajoutez un outil depuis le panneau de gauche,<br />
          ou un nœud système (condition / variable).
        </div>
      </div>
    {/if}

    <datalist id="all-node-ids">
      {#each nodeIds as nid}
        <option value={nid}></option>
      {/each}
    </datalist>

    {#each $planNodes as n, i (n.id)}
      <div
        class="node-card"
        class:node-tool={n.type === "tool"}
        class:node-cond={n.type === "condition"}
        class:node-loop={n.type === "loop"}
        class:node-setvar={n.type === "setVariable"}
      >
        <div class="node-header">
          <div class="node-title">
            <span class="node-index">{i + 1}</span>
            <input type="text" class="node-id-input" bind:value={n.id} />
            <span class="type-badge {typeMeta[n.type].cls}">
              {typeMeta[n.type].icon} {typeMeta[n.type].label}
            </span>
            {#if n.type === "tool"}
              <span class="type-badge tool">🛠️ {n.toolId}</span>
            {/if}
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <button
              on:click={() => moveNode(n.id, -1)}
              disabled={i === 0}
              title="Monter ce nœud"
              style="width:28px; height:28px; padding:0; font-size:13px; background:var(--text);"
              >↑</button
            >
            <button
              on:click={() => moveNode(n.id, 1)}
              disabled={i === $planNodes.length - 1}
              title="Descendre ce nœud"
              style="width:28px; height:28px; padding:0; font-size:13px; background:var(--text);"
              >↓</button
            >
            <button
              class="btn-danger"
              on:click={() => deleteNode(n.id)}
              title="Supprimer ce nœud"
              >✕ Supprimer</button
            >
          </div>
        </div>

        {#if n.type === "tool"}
          <div class="inline-inputs">
            <div>
              <label for="{n.id}-output">Save in State</label
              ><input
                id="{n.id}-output"
                type="text"
                list="out-keys-{i}"
                bind:value={n.outputKey}
                placeholder="ex: api_result"
              />
              <datalist id="out-keys-{i}">
                {#each stateKeys as k}
                  <option value={k}></option>
                {/each}
              </datalist>
            </div>
            <div>
              <label for="{n.id}-next">Suivant (ID)</label
              ><input
                id="{n.id}-next"
                type="text"
                list="all-node-ids"
                bind:value={n.nextId}
                placeholder="Vide = Fin"
              />
            </div>
          </div>
        {:else if n.type === "condition"}
          <label for="{n.id}-expr">Condition JS (retourne booléen)</label
          ><input
            id="{n.id}-expr"
            type="text"
            bind:value={n.expr}
            placeholder="ex: state.valeur > 10"
          />
          <div class="inline-inputs">
            <div>
              <label for="{n.id}-true">Vrai ➜ ID</label
              ><input
                id="{n.id}-true"
                type="text"
                list="all-node-ids"
                bind:value={n.trueId}
                placeholder="etape_2"
              />
            </div>
            <div>
              <label for="{n.id}-false">Faux ➜ ID</label
              ><input
                id="{n.id}-false"
                type="text"
                list="all-node-ids"
                bind:value={n.falseId}
                placeholder="etape_3"
              />
            </div>
          </div>
        {:else if n.type === "loop"}
          <label for="{n.id}-loopcond">Continuer tant que (JS)</label
          ><input
            id="{n.id}-loopcond"
            type="text"
            bind:value={n.expr}
            placeholder="ex: state.count < 3"
          />
          <div class="inline-inputs">
            <div>
              <label for="{n.id}-body">Corps (ID)</label
              ><input
                id="{n.id}-body"
                type="text"
                list="all-node-ids"
                bind:value={n.bodyId}
                placeholder="etape_2"
              />
            </div>
            <div>
              <label for="{n.id}-exit">Sortie (ID)</label
              ><input
                id="{n.id}-exit"
                type="text"
                list="all-node-ids"
                bind:value={n.nextId}
                placeholder="etape_3"
              />
            </div>
          </div>
        {:else if n.type === "setVariable"}
          <SetVariableEditor node={n} stateKeys={stateKeys} statePaths={statePaths} />
        {/if}
      </div>
    {/each}
  </div>
</section>