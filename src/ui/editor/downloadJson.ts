// Kit — download an object as pretty-printed JSON (and copy to clipboard). Own module so component
// files stay component-only (fast-refresh friendly).
export function downloadJson(name: string, obj: unknown): void {
  const text = JSON.stringify(obj, null, 2);
  try { void navigator.clipboard?.writeText(text); } catch { /* ignore */ }
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
