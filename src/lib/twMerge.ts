// Minimal tailwind-merge replacement (no dependency) — last-write-wins by token.
// Good enough for our className composition needs.
const IMPORTANT = /\s*!important\s*$/;

function split(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

// Group classes by a simple "conflict key" derived from the leading token hints.
// For our limited usage we treat each utility as its own key (no merging across
// different utilities), which keeps things predictable and safe.
export function twMerge(...inputs: (string | undefined | false | null)[]): string {
  const tokens: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    tokens.push(...split(i));
  }
  // dedupe preserving order, keep last occurrence for exact duplicates
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (seen.has(t)) continue;
    seen.add(t);
    out.unshift(t);
  }
  void IMPORTANT;
  return out.join(' ');
}
