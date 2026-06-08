import { useSceneEditStore } from '../../stores/sceneEditStore';
import { useModelStudioStore } from '../../stores/modelStudioStore';
import { useEditorEnvironmentStore } from '../../stores/editorEnvironmentStore';
import { useEditorTriggerStore } from '../../stores/editorTriggerStore';
import { useEditorNpcStore } from '../../stores/editorNpcStore';
import { useEditorQuestStore } from '../../stores/editorQuestStore';
import { useEditorEncounterStore } from '../../stores/editorEncounterStore';

// Kit — a single registry describing every editable content domain (each backed by its own store) with
// serialize / deserialize / clear / summary hooks. The foundation for the unified project Export/Import.
// No source files are written — everything round-trips through the live stores + localStorage.
export interface EditorContentDomain {
  id: string;
  label: string;
  serialize: () => unknown;
  deserialize: (data: unknown) => void;
  clear: () => void;
  summary: () => string;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

export const EDITOR_CONTENT_DOMAINS: EditorContentDomain[] = [
  {
    id: 'sceneEdit',
    label: 'Scene Edits',
    serialize: () => {
      const s = useSceneEditStore.getState();
      return { overrides: s.overrides, deleted: s.deleted, added: s.added, addedYokai: s.addedYokai };
    },
    deserialize: (data) => { if (isObj(data)) useSceneEditStore.getState().importPersist(data); },
    clear: () => useSceneEditStore.getState().resetAll(),
    summary: () => {
      const s = useSceneEditStore.getState();
      return `${Object.keys(s.overrides).length} edits · ${s.added.length} models · ${Object.keys(s.deleted).length} hidden`;
    },
  },
  {
    id: 'modelStudio',
    label: 'Model Studio',
    serialize: () => ({ overrides: useModelStudioStore.getState().overrides }),
    deserialize: (data) => { if (isObj(data) && isObj(data.overrides)) useModelStudioStore.getState().importState(data.overrides); },
    clear: () => useModelStudioStore.getState().reset(),
    summary: () => `${Object.keys(useModelStudioStore.getState().overrides).length} models tuned`,
  },
  {
    id: 'editorEnvironment',
    label: 'Environment / Sky',
    serialize: () => { const s = useEditorEnvironmentStore.getState(); return { overrides: s.overrides, defaultMode: s.defaultMode }; },
    deserialize: (data) => { if (isObj(data)) useEditorEnvironmentStore.getState().importState(data); },
    clear: () => useEditorEnvironmentStore.getState().reset(),
    summary: () => { const s = useEditorEnvironmentStore.getState(); return `${Object.keys(s.overrides).length} areas tuned · ${s.defaultMode}`; },
  },
  {
    id: 'editorTrigger',
    label: 'Triggers',
    serialize: () => { const s = useEditorTriggerStore.getState(); return { triggers: s.triggers, firedOnce: s.firedOnce }; },
    deserialize: (data) => { if (isObj(data)) useEditorTriggerStore.getState().importState(data); },
    clear: () => useEditorTriggerStore.getState().reset(),
    summary: () => `${useEditorTriggerStore.getState().triggers.length} triggers`,
  },
  {
    id: 'editorNpc',
    label: 'NPCs & Dialogue',
    serialize: () => { const s = useEditorNpcStore.getState(); return { addedNpcs: s.addedNpcs, dialogueTrees: s.dialogueTrees }; },
    deserialize: (data) => { if (isObj(data)) useEditorNpcStore.getState().importState(data as { addedNpcs?: never; dialogueTrees?: never }); },
    clear: () => useEditorNpcStore.getState().reset(),
    summary: () => { const s = useEditorNpcStore.getState(); return `${s.addedNpcs.length} NPCs · ${Object.keys(s.dialogueTrees).length} dialogues`; },
  },
  {
    id: 'editorQuest',
    label: 'Quests & Items',
    serialize: () => { const s = useEditorQuestStore.getState(); return { quests: s.quests, items: s.items }; },
    deserialize: (data) => { if (isObj(data)) useEditorQuestStore.getState().importState(data as { quests?: never; items?: never }); },
    clear: () => useEditorQuestStore.getState().reset(),
    summary: () => { const s = useEditorQuestStore.getState(); return `${s.quests.length} quests · ${s.items.length} items`; },
  },
  {
    id: 'editorEncounter',
    label: 'Encounters & Combatants',
    serialize: () => { const s = useEditorEncounterStore.getState(); return { encounters: s.encounters, combatants: s.combatants }; },
    deserialize: (data) => { if (isObj(data)) useEditorEncounterStore.getState().importState(data as { encounters?: never; combatants?: never }); },
    clear: () => useEditorEncounterStore.getState().reset(),
    summary: () => { const s = useEditorEncounterStore.getState(); return `${s.encounters.length} encounters · ${s.combatants.length} combatants`; },
  },
];

// ── Unified project file ────────────────────────────────────────────────────
export const EDITOR_PROJECT_KIND = 'r3f-rpg-builder-editor-project' as const;
export const EDITOR_PROJECT_VERSION = 1 as const;

export interface EditorProjectFile {
  kind: typeof EDITOR_PROJECT_KIND;
  version: typeof EDITOR_PROJECT_VERSION;
  exportedAt: string;
  domains: Record<string, unknown>;
}

export function exportEditorProject(): EditorProjectFile {
  const domains: Record<string, unknown> = {};
  for (const d of EDITOR_CONTENT_DOMAINS) {
    try { domains[d.id] = d.serialize(); } catch { /* skip a failing domain */ }
  }
  return { kind: EDITOR_PROJECT_KIND, version: EDITOR_PROJECT_VERSION, exportedAt: new Date().toISOString(), domains };
}

export function importEditorProject(file: unknown, opts?: { only?: string[] }): { applied: string[]; skipped: string[] } {
  const applied: string[] = [];
  const skipped: string[] = [];
  if (!isObj(file) || file.kind !== EDITOR_PROJECT_KIND || !isObj(file.domains)) return { applied, skipped: ['(invalid project file)'] };
  const domains = file.domains as Record<string, unknown>;
  for (const d of EDITOR_CONTENT_DOMAINS) {
    if (opts?.only && !opts.only.includes(d.id)) continue;
    if (!(d.id in domains)) { skipped.push(d.id); continue; }
    try { d.deserialize(domains[d.id]); applied.push(d.id); } catch { skipped.push(d.id); }
  }
  return { applied, skipped };
}

// ── Per-domain single-file IO ───────────────────────────────────────────────
export const EDITOR_DOMAIN_KIND = 'r3f-rpg-builder-editor-domain' as const;

export interface EditorDomainFile {
  kind: typeof EDITOR_DOMAIN_KIND;
  domain: string;
  version: typeof EDITOR_PROJECT_VERSION;
  exportedAt: string;
  data: unknown;
}

export function getDomain(id: string): EditorContentDomain | undefined {
  return EDITOR_CONTENT_DOMAINS.find((d) => d.id === id);
}

export function exportDomainFile(id: string): EditorDomainFile | null {
  const d = getDomain(id);
  if (!d) return null;
  return { kind: EDITOR_DOMAIN_KIND, domain: id, version: EDITOR_PROJECT_VERSION, exportedAt: new Date().toISOString(), data: d.serialize() };
}

export function importDomainFile(file: unknown, fallbackId?: string): { ok: boolean; domain?: string; error?: string } {
  if (isObj(file) && file.kind === EDITOR_DOMAIN_KIND && typeof file.domain === 'string') {
    const d = getDomain(file.domain);
    if (!d) return { ok: false, error: `unknown domain "${file.domain}"` };
    try { d.deserialize(file.data); return { ok: true, domain: file.domain }; } catch { return { ok: false, error: `failed to load "${file.domain}"` }; }
  }
  if (fallbackId) {
    const d = getDomain(fallbackId);
    if (!d) return { ok: false, error: `unknown domain "${fallbackId}"` };
    try { d.deserialize(file); return { ok: true, domain: fallbackId }; } catch { return { ok: false, error: `failed to load "${fallbackId}"` }; }
  }
  return { ok: false, error: 'not a domain file (missing kind/domain)' };
}

export function clearEditorContent(only?: string[]): void {
  for (const d of EDITOR_CONTENT_DOMAINS) {
    if (only && !only.includes(d.id)) continue;
    try { d.clear(); } catch { /* ignore */ }
  }
}
