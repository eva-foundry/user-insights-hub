#!/usr/bin/env node
/**
 * Build-time guard: parse src/routeTree.gen.ts and fail if any top-level
 * `const`/`interface`/`function` symbol is declared more than once. Stale
 * generated files have repeatedly produced "ScreenRoute has already been
 * declared" build failures; this check catches them before esbuild does
 * and prints a friendlier message.
 *
 * Skipped silently if the file does not exist yet (first-run / clean state).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "src", "routeTree.gen.ts");

if (!existsSync(target)) {
  console.log("[check-route-tree-duplicates] no routeTree.gen.ts yet — skip");
  process.exit(0);
}

const src = readFileSync(target, "utf8");
const decl = /^\s*(?:export\s+)?(?:const|let|interface|function|class)\s+([A-Za-z_$][\w$]*)/gm;
const seen = new Map(); // name -> [lineNumbers]

let m;
while ((m = decl.exec(src)) !== null) {
  const name = m[1];
  const line = src.slice(0, m.index).split("\n").length;
  const list = seen.get(name) ?? [];
  list.push(line);
  seen.set(name, list);
}

const dups = [...seen.entries()].filter(([, lines]) => lines.length > 1);
if (dups.length === 0) {
  console.log("[check-route-tree-duplicates] OK");
  process.exit(0);
}

console.error("[check-route-tree-duplicates] Duplicate symbols in routeTree.gen.ts:");
for (const [name, lines] of dups) {
  console.error(`  - ${name}  (lines: ${lines.join(", ")})`);
}
console.error(
  "\nThis usually means the generated file is stale. Run `bun run dev` " +
    "(which clears it via predev) or delete src/routeTree.gen.ts manually.",
);
process.exit(1);