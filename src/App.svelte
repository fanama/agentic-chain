<script lang="ts">
  import RegistryPanel from "./lib/components/RegistryPanel.svelte";
  import GraphPanel from "./lib/components/GraphPanel.svelte";
  import RunnerPanel from "./lib/components/RunnerPanel.svelte";
  import ToastContainer from "./lib/components/ToastContainer.svelte";
</script>

<div class="app-shell">
  <header class="app-header">
    <div class="app-brand">
      <span class="logo">🤖</span>
      <span>Agentic Framework <small>V3 · State Graph</small></span>
    </div>
  </header>
  <div class="app-layout">
    <RegistryPanel />
    <GraphPanel />
    <RunnerPanel />
  </div>
</div>

<ToastContainer />
