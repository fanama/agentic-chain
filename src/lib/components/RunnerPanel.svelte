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

  let consoleElement: HTMLDivElement;

  // Tableau réactif pour gérer nos champs dynamiques
  let inputFields: { key: string; value: any; type: string }[] = [
    {
      key: "url",
      value: "https://dog.ceo/api/breeds/image/random",
      type: "string",
    },
    { key: "text_list", value: ["test"], type: "liste" },
    { key: "text_object", value: { name: "fana" }, type: "liste" },
  ];

  /*
  {
  "mano": {
    "test": "mano"
  },
  "liste": [
    {
      "nombre": 1
    }
  ],
  "count": 0,
  "url": "https://dog.ceo/api/breeds/image/random",
  "method": "get"
}
  */

  // Initialisation à partir du store JSON
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
      // Sécurité si le JSON initial est mal formé
      inputFields = [];
    }
  });

  // Re-générer la chaîne JSON automatiquement quand un input change
  $: {
    const newObj: Record<string, any> = {};
    inputFields.forEach((field) => {
      if (field.key.trim() !== "") {
        if (field.type === "number") {
          newObj[field.key] = Number(field.value);
        } else if (field.type === "list" || field.type === "object") {
          try {
            // Tente de parser le texte en vrai tableau/objet
            newObj[field.key] = JSON.parse(field.value);
          } catch {
            // Si le JSON est temporairement invalide pendant la frappe,
            // on injecte une structure vide par défaut pour ne pas tout casser.
            newObj[field.key] = field.type === "list" ? [] : {};
          }
        } else {
          newObj[field.key] = field.value;
        }
      }
    });
    $initialInputState = JSON.stringify(newObj, null, 2);
  }

  // Fonctions pour gérer la liste des inputs
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
      alert("Vérifiez l'ID racine et le graphe.");
      return;
    }

    let initState: StateContext = {};
    try {
      initState = JSON.parse($initialInputState);
    } catch {
      alert("JSON initial invalide.");
      return;
    }

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
      appendLog("✅ Exécution terminée !", "success");
    } catch (err: any) {
      appendLog(`[❌] Erreur: ${err.message}`, "log-err");
    }
  }
</script>

<div class="panel col-right">
  <h2>🚀 Runner</h2>
  <label>Nœud Racine (Point de départ)</label>
  <input type="text" bind:value={$rootNodeId} placeholder="ex: etape_1" />

  <label>État Initial (Variables)</label>
  <div
    class="dynamic-inputs"
    style="margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;"
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
        <span style="margin-top: 6px;">=</span>

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
            placeholder=""
            rows="2"
            style="flex: 2; resize: vertical;"
          ></textarea>
        {:else if field.type === "object"}
          <textarea
            bind:value={field.value}
            placeholder=""
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
          style="background: none; border: none; cursor: pointer; color: red; margin-top: 6px;"
          >✖</button
        >
      </div>
    {/each}
    <button
      class="btn-add"
      style="margin-top: 5px; font-size: 0.9em; padding: 4px 8px;"
      on:click={addField}
    >
      + Ajouter une variable
    </button>
  </div>

  <details style="margin-bottom: 15px;">
    <summary style="cursor: pointer; opacity: 0.7; font-size: 0.9em;"
      >Voir le JSON final généré</summary
    >
    <textarea
      bind:value={$initialInputState}
      rows="3"
      disabled
      style="margin-top: 5px; background: #f5f5f5;"
    ></textarea>
  </details>

  <button
    class="btn-add"
    style="background-color: var(--primary); margin-bottom: 20px; width: 100%;"
    on:click={runAgent}>▶ Démarrer l'Agent</button
  >

  <label>Logs système</label>
  <div id="console-log" bind:this={consoleElement}>
    {#if $logs.length === 0}
      Attente...
    {/if}
    {#each $logs as log}
      <span class={log.cls} style={log.cls === "success" ? "color: green" : ""}
        >{log.msg}{"\n"}</span
      >
    {/each}
  </div>

  <label>Mémoire (StateStore)</label>
  <div id="state-store-view">{JSON.stringify($activeStoreState, null, 2)}</div>
</div>
