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

  let consoleElement: HTMLDivElement;

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
      appendLog("✅ Exécution terminée !", "success"); // Changed class name
    } catch (err: any) {
      appendLog(`[❌] Erreur: ${err.message}`, "log-err");
    }
  }
</script>

<div class="panel col-right">
  <h2>🚀 Runner</h2>
  <label>Nœud Racine (Point de départ)</label>
  <input type="text" bind:value={$rootNodeId} placeholder="ex: etape_1" />

  <label>État Initial du StateStore (JSON)</label>
  <textarea bind:value={$initialInputState} rows="2"></textarea>

  <button
    class="btn-add"
    style="background-color: var(--primary); margin-bottom: 20px;"
    on:click={runAgent}>▶ Démarrer l'Agent</button
  >

  <label>Logs système</label>
  <div id="console-log" bind:this={consoleElement}>
    {#if $logs.length === 0}
      Attente...
    {/if}
    {#each $logs as log}
      <span
        class={log.cls}
        style={log.cls === "success" ? "color: var(--success)" : ""}
        >{log.msg}{"\n"}</span
      >
    {/each}
  </div>

  <label>Mémoire (StateStore)</label>
  <div id="state-store-view">{JSON.stringify($activeStoreState, null, 2)}</div>
</div>
