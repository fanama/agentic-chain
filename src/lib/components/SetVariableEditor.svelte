<script lang="ts">
  import type { PlanNode } from "../domain/engine";

  export let node: PlanNode;
  export let stateKeys: string[] = [];
  export let statePaths: { expr: string }[] = [];

  type EditorType = "text" | "number" | "boolean" | "list" | "object" | "ref";

  const REF_RE =
    /^state((\.[A-Za-z_$][\w$]*)|(\[\s*\d+\s*\])|(\['[^']*'\])|(\["[^"]*"\]))+$/;

  let editor: { type: EditorType; val: any };

  function parseList(str: any): any[] {
    return String(str ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s));
  }

  function init(str?: string): void {
    const trimmed = (str ?? '""').trim();
    if (REF_RE.test(trimmed)) { editor = { type: "ref", val: trimmed }; return; }
    if (trimmed === "" || trimmed === '""') { editor = { type: "text", val: "" }; return; }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed === null || parsed === undefined) { editor = { type: "text", val: "" }; return; }
      if (Array.isArray(parsed)) { editor = { type: "list", val: parsed.join(", ") }; return; }
      if (typeof parsed === "object") { editor = { type: "object", val: JSON.stringify(parsed, null, 2) }; return; }
      if (typeof parsed === "number" && !Number.isNaN(parsed)) { editor = { type: "number", val: parsed }; return; }
      if (typeof parsed === "boolean") { editor = { type: "boolean", val: parsed }; return; }
      editor = { type: "text", val: parsed };
    } catch {
      editor = { type: "text", val: trimmed };
    }
  }

  init(node.value);

  function writeBack(): void {
    if (!node) return;
    const t = editor.type;
    let out = "";
    try {
      if (t === "text") out = JSON.stringify(String(editor.val ?? ""));
      else if (t === "number") { const n = Number(editor.val); out = Number.isNaN(n) ? "0" : String(n); }
      else if (t === "boolean") out = String(editor.val === true || editor.val === "true");
      else if (t === "list") out = JSON.stringify(parseList(editor.val));
      else if (t === "object") {
        const parsed = JSON.parse(String(editor.val ?? "{}"));
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return;
        out = JSON.stringify(parsed);
      }
      else if (t === "ref") {
        const k = String(editor.val ?? "").trim();
        if (!REF_RE.test(k)) return;
        out = k;
      }
    } catch { return; }
    node.value = out;
  }

  function changeType(newType: EditorType): void {
    const prev = editor;
    let val: any;
    if (newType === "number") {
      val = typeof prev.val === "number" ? prev.val : Number(String(prev.val)) || 0;
    } else if (newType === "list") {
      if (prev.type === "list") val = String(prev.val);
      else if (prev.type === "text") val = String(prev.val);
      else if (prev.type === "object") {
        try { val = Object.values(JSON.parse(String(prev.val))).join(", "); } catch { val = ""; }
      } else val = [prev.val].join(", ");
    } else if (newType === "object") {
      if (prev.type === "object") val = String(prev.val);
      else if (prev.type === "list") val = JSON.stringify(parseList(prev.val), null, 2);
      else val = JSON.stringify(prev.val, null, 2);
    } else if (newType === "boolean") {
      val = prev.type === "boolean" ? Boolean(prev.val) : true;
    } else if (newType === "ref") {
      val = prev.type === "ref" ? String(prev.val) : statePaths[0]?.expr ?? stateKeys[0] ?? "";
    } else {
      val = typeof prev.val === "object" ? JSON.stringify(prev.val) : String(prev.val ?? "");
    }
    editor = { type: newType, val };
    writeBack();
  }

  $: objectValid = editor.type !== "object" || (() => {
    try {
      const p = JSON.parse(String(editor.val ?? "{}"));
      return p !== null && typeof p === "object" && !Array.isArray(p);
    } catch { return false; }
  })();

  $: preview = (() => {
    let v: any;
    try {
      const e = editor;
      if (e.type === "text") v = String(e.val);
      else if (e.type === "number") { const n = Number(e.val); v = Number.isNaN(n) ? 0 : n; }
      else if (e.type === "boolean") v = e.val === true || e.val === "true";
      else if (e.type === "list") v = parseList(e.val);
      else if (e.type === "object") v = JSON.parse(String(e.val));
      else v = e.val;
    } catch { return "⚠️ JSON invalide"; }
    try { return JSON.stringify(v); } catch { return String(v); }
  })();
</script>

<div class="setvar-editor">
  <label for="{node.id}-var-key">Variable de destination (nouvelle ou existante)</label>
  <input
    id="{node.id}-var-key"
    type="text"
    list="var-keys-{node.id}"
    bind:value={node.key}
    placeholder="ex: nouvelleVariable"
    on:input={writeBack}
  />
  <datalist id="var-keys-{node.id}">
    {#each stateKeys as k}
      <option value={k}></option>
    {/each}
  </datalist>
  <p class="field-hint" style="margin-top: -4px;">
    Le résultat sera assigné à cette clé dans l'état.
  </p>

  <span class="section-label">Type de valeur</span>
  <div class="type-tabs" role="group" aria-label="Type de valeur">
    <button
      type="button"
      class="tab {editor.type === 'text' ? 'active' : ''}"
      on:click={() => changeType("text")}
      >Texte</button
    >
    <button
      type="button"
      class="tab {editor.type === 'number' ? 'active' : ''}"
      on:click={() => changeType("number")}
      >Nombre</button
    >
    <button
      type="button"
      class="tab {editor.type === 'boolean' ? 'active' : ''}"
      on:click={() => changeType("boolean")}
      >Booléen</button
    >
    <button
      type="button"
      class="tab {editor.type === 'list' ? 'active' : ''}"
      on:click={() => changeType("list")}
      >Liste</button
    >
    <button
      type="button"
      class="tab {editor.type === 'object' ? 'active' : ''}"
      on:click={() => changeType("object")}
      >Objet</button
    >
    <button
      type="button"
      class="tab {editor.type === 'ref' ? 'active' : ''}"
      on:click={() => changeType("ref")}
      >Copier de state</button
    >
  </div>
  <p class="field-hint" style="margin-top: -4px;">
    Choisissez le type de donnée à assigner à la variable.
  </p>

  {#if editor.type === "text"}
    <label for="{node.id}-val-text">Valeur texte</label>
    <input
      id="{node.id}-val-text"
      type="text"
      bind:value={editor.val}
      on:input={writeBack}
      placeholder="ex: Bonjour"
    />
  {:else if editor.type === "number"}
    <label for="{node.id}-val-num">Valeur numérique</label>
    <input
      id="{node.id}-val-num"
      type="number"
      bind:value={editor.val}
      on:input={writeBack}
      placeholder="ex: 42"
    />
  {:else if editor.type === "boolean"}
    <span class="section-label">Valeur booléenne</span>
    <div class="bool-toggle" role="group" aria-label="Valeur booléenne">
      <button
        type="button"
        class="tab {editor.val === true ? 'active' : ''}"
        on:click={() => { editor.val = true; writeBack(); }}
        >Vrai</button
      >
      <button
        type="button"
        class="tab {editor.val === false ? 'active' : ''}"
        on:click={() => { editor.val = false; writeBack(); }}
        >Faux</button
      >
    </div>
  {:else if editor.type === "list"}
    <label for="{node.id}-val-list">Valeurs (séparées par des virgules)</label>
    <input
      id="{node.id}-val-list"
      type="text"
      bind:value={editor.val}
      on:input={writeBack}
      placeholder="ex: pomme, poire, 3"
    />
    <p class="field-hint" style="margin-top: -4px;">
      Les nombres sont convertis automatiquement.
    </p>
  {:else if editor.type === "object"}
    <label for="{node.id}-val-obj">Objet (JSON)</label>
    <textarea
      id="{node.id}-val-obj"
      class="mono"
      bind:value={editor.val}
      on:input={writeBack}
      rows="4"
      placeholder="&#123; &#34;cle&#34;: &#34;valeur&#34; &#125;"
    ></textarea>
    {#if !objectValid}
      <p class="field-hint" style="color: var(--error);">
        ⚠️ JSON invalide — correction en attente.
      </p>
    {/if}
  {:else}
    <label for="{node.id}-val-ref">Variable source (existante ou paramètre d'objet)</label>
    <select
      id="{node.id}-val-ref"
      value={editor.val}
      on:change={(e) => {
        const v = (e.currentTarget as HTMLSelectElement).value;
        if (v) { editor.val = v; writeBack(); }
      }}
    >
      <option value="" disabled>— Choisir une variable —</option>
      {#each statePaths as p (p.expr)}
        <option value={p.expr}>{p.expr}</option>
      {/each}
    </select>
    <details style="margin: 6px 0;">
      <summary class="field-hint" style="cursor: pointer;"
        >Saisir un autre chemin…</summary
      >
      <input
        type="text"
        list="state-keys-{node.id}"
        bind:value={editor.val}
        on:input={writeBack}
        placeholder="ex: state.result.data.title"
      />
    </details>
    <p class="field-hint" style="margin-top: -4px;">
      La valeur actuelle du paramètre sera copiée dans la nouvelle variable à
      l'exécution.
    </p>
  {/if}

  <datalist id="state-keys-{node.id}">
    {#each stateKeys as k}
      <option value={k}></option>
    {/each}
  </datalist>

  <div class="value-preview">
    <code>state.{node.key || '?'}</code>
    <span>=</span>
    <code>{preview}</code>
  </div>

  <div style="margin-top: 8px;">
    <label for="{node.id}-set-next">Suivant (ID)</label>
    <input
      id="{node.id}-set-next"
      type="text"
      list="all-node-ids"
      bind:value={node.nextId}
      placeholder="Vide = Fin"
    />
  </div>
</div>