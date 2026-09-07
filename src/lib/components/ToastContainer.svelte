<script lang="ts">
  import { toasts } from "../stores/toasts";
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div class="toast {toast.type}">
      <span>{toast.msg}</span>
    </div>
  {/each}
</div>
