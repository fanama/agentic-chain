<script lang="ts">
  import {
    planNodes,
    rootNodeId,
    initialInputState,
    logs,
    activeStoreState,
    registry,
  } from "../stores";
  import { executePlan, type StateContext } from "../domain/engine";
  import { onMount } from "svelte";
  import { showToast } from "../stores/toasts";

  let consoleElement: HTMLDivElement;

  let runStatus: "idle" | "running" | "success" | "error" = "idle";
  let runLabel = "";

  let inputFields: { key: string; value: any; type: string }[] = [
    {
      key: "url",
      value: "https://dog.ceo/api/breeds/image/random",
      type: "string",
    },
    { key: "text_list", value: ["test"], type: "liste" },
    { key: "text_object", value: { name: "fana" }, type: "liste" },
  ];

  onMount(() => {
    try {
      const obj = JSON.parse($initialInputState);
      inputFields = Object.entries(obj).map(([key, value]) => {
        let type = "text";
        let strValue = value;

        if (Array.isArray(value)) {
          type = "list";
          strValue = JSON.stringify(value, null, 2);
        } else if (value !== null && typeof value === "object") {
          type = "object";
          strValue = JSON.stringify(value, null, 2);
        } else if (typeof value === "number") {
          type = "number";
        }

        return { key, value: strValue, type };
      });
    } catch {
      inputFields = [];
    }
  });

  $: {
    const newObj: Record<string, any> = {};
    inputFields.forEach((field) => {
      if (field.key.trim() !== "") {
        if (field.type === "number") {
          newObj[field.key] = Number(field.value);
        } else if (field.type === "list" || field.type === "object") {
          try {
            newObj[field.key] = JSON.parse(field.value);
          } catch {
            newObj[field.key] = field.type === "list" ? [] : {};
          }
        } else {
          newObj[field.key] = field.value;
        }
      }
    });
    $initialInputState = JSON.stringify(newObj, null, 2);
  }

  function isImageUrl(str: string): boolean {
    return /^(https?:\/\/|\/)/i.test(str) && /\.(jpe?g|png|gif|webp|svg|avif|bmp)(\?.*)?$/i.test(str);
  }

  let displayImageUrl: string = "";

  $: displayImageUrl = (() => {
    const state: Record<string, any> = $activeStoreState;
    const found: string[] = [];
    for (const key of Object.keys(state)) {
      const value = state[key];
      if (typeof value === "string" && isImageUrl(value)) found.push(value);
      else if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const f of ["imageUrl", "image", "img", "url", "message"]) {
          if (typeof value[f] === "string" && isImageUrl(value[f])) found.push(value[f]);
        }
      }
    }
    return found[0] ?? "";
  })();

  function addField() {
    inputFields = [
      ...inputFields,
      { key: `variable_${inputFields.length}`, value: "", type: "text" },
    ];
  }

  function removeField(index: number) {
    inputFields = inputFields.filter((_, i) => i !== index);
  }

  function appendLog(msg: string, cls: string = ""): void {
    $logs = [...$logs, { msg, cls }];
    setTimeout(() => {
      if (consoleElement)
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }, 0);
  }

  async function runAgent(): Promise<void> {
    if (!$rootNodeId || $planNodes.length === 0) {
      showToast("Définissez le nœud racine et ajoutez des nœuds.", "warn");
      return;
    }
    if (!$planNodes.some((n) => n.id === $rootNodeId)) {
      showToast(`Le nœud racine "${$rootNodeId}" n'existe pas dans le graphe.`, "warn");
      return;
    }

    let initState: StateContext = {};
    try {
      initState = JSON.parse($initialInputState);
    } catch {
      showToast("Le JSON initial est invalide.", "error");
      return;
    }

    runStatus = "running";
    runLabel = "Exécution en cours…";
    $logs = [];
    appendLog("--- Démarrage de l'Agent ---", "log-sys");
    $activeStoreState = { ...initState };

    try {
      await executePlan(
        $planNodes,
        $registry,
        $rootNodeId,
        initState,
        appendLog,
        (newState: StateContext) => ($activeStoreState = { ...newState }),
      );
      appendLog("✅ Exécution terminée !", "log-success");
      runStatus = "success";
      runLabel = "Terminé avec succès";
      setTimeout(() => {
        if (runStatus !== "running") runStatus = "idle";
      }, 4000);
    } catch (err: any) {
      appendLog(`[❌] Erreur: ${err.message}`, "log-err");
      runStatus = "error";
      runLabel = "Échec de l'exécution";
      showToast(`Erreur : ${err.message}`, "error", 6000);
      setTimeout(() => {
        if (runStatus !== "running") runStatus = "idle";
      }, 4000);
    }
  }
</script>

<section class="panel col-right">
  <h2 class="panel-title">🚀 Runner</h2>
  <p class="panel-subtitle" style="margin-bottom: 16px;">
    Définissez l'état initial puis lancez l'agent.
  </p>

  <div class="run-status {runStatus}">
    <span class="dot"></span>
    {#if runStatus === "idle"}
      Prêt à exécuter
    {:else if runStatus === "running"}
      {runLabel}
    {:else if runStatus === "success"}
      ✅ {runLabel}
    {:else}
      ❌ {runLabel}
    {/if}
  </div>

  <label for="root-node-id">Nœud Racine (point de départ)</label>
  <input
    id="root-node-id"
    type="text"
    bind:value={$rootNodeId}
    placeholder="ex: etape_1"
    disabled={runStatus === "running"}
  />

  <label for="initial-state-editor">État Initial (variables)</label>
  <div
    id="initial-state-editor"
    style="margin-bottom: 15px; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background:#fafbfc;"
  >
    {#each inputFields as field, i}
      <div
        style="display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start;"
      >
        <input
          type="text"
          bind:value={field.key}
          placeholder="Clé"
          style="flex: 1; margin-top: 2px;"
        />
        <span style="margin-top: 7px; color: var(--text-light);">=</span>

        {#if field.type === "number"}
          <input
            type="number"
            bind:value={field.value}
            placeholder="Valeur"
            style="flex: 2; margin-top: 2px;"
          />
        {:else if field.type === "list"}
          <textarea
            bind:value={field.value}
            rows="2"
            style="flex: 2; resize: vertical;"
          ></textarea>
        {:else if field.type === "object"}
          <textarea
            bind:value={field.value}
            rows="2"
            style="flex: 2; resize: vertical;"
          ></textarea>
        {:else}
          <input
            type="text"
            bind:value={field.value}
            placeholder="Valeur"
            style="flex: 2; margin-top: 2px;"
          />
        {/if}

        <select bind:value={field.type} style="width: auto; margin-top: 2px;">
          <option value="text">Texte</option>
          <option value="number">Nombre</option>
          <option value="list">Liste</option>
          <option value="object">Objet</option>
        </select>

        <button
          on:click={() => removeField(i)}
          title="Supprimer cette variable"
          style="background: none; border: none; cursor: pointer; color: var(--error); margin-top: 7px; font-size:14px;"
          >✕</button
        >
      </div>
    {/each}
    {#if inputFields.length === 0}
      <p style="color: var(--text-light); font-size: 12px; text-align:center; margin: 8px 0;">
        Aucune variable pour le moment.
      </p>
    {/if}
    <button
      class="btn-add"
      style="margin-top: 5px; font-size: 0.9em; padding: 6px 8px;"
      on:click={addField}
    >
      ＋ Ajouter une variable
    </button>
  </div>

  <details style="margin-bottom: 15px;">
    <summary style="cursor: pointer; opacity: 0.7; font-size: 0.9em;"
      >Voir le JSON final généré</summary
    >
    <textarea
      class="mono"
      bind:value={$initialInputState}
      rows="3"
      disabled
      style="margin-top: 5px; background: #f5f5f5;"
    ></textarea>
  </details>

  <button
    class="btn-add"
    style="background-color: var(--primary); margin-bottom: 20px; width: 100%; padding: 12px; font-size: 15px;"
    on:click={runAgent}
    disabled={runStatus === "running"}
  >
    {runStatus === "running" ? "⏳ Exécution…" : "▶ Démarrer l'Agent"}
  </button>

  <label for="console-log">Logs système</label>
  <div id="console-log" bind:this={consoleElement}>
    {#if $logs.length === 0}
      <span class="log-sys">En attente…</span>
    {/if}
    {#each $logs as log}
      <span class={log.cls}
        >{log.msg}{"\n"}</span
      >
    {/each}
  </div>

  {#if displayImageUrl}
    <span class="section-label">Aperçu image</span>
    <div class="image-preview">
      <img src={displayImageUrl} alt="Résultat de l'exécution de l'agent" loading="lazy" />
      <a href={displayImageUrl} target="_blank" rel="noopener noreferrer">
        🔗 Ouvrir en grand
      </a>
    </div>
  {/if}

  <label for="state-store-view">Mémoire (StateStore)</label>
  <div id="state-store-view">{JSON.stringify($activeStoreState, null, 2)}</div>
</section>
