#!/usr/bin/env node
/**
 * Pre-dev/pre-build hook: delete the generated TanStack route tree so the
 * router plugin always emits a fresh file. This prevents the
 * "symbol X has already been declared" class of esbuild errors that occur
 * when a stale routeTree.gen.ts on disk gets re-appended to.
 *
 * Safe to run if the file is missing.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "src", "routeTree.gen.ts");

if (existsSync(target)) {
  rmSync(target, { force: true });
  console.log(`[clean-route-tree] removed ${target}`);
} else {
  console.log("[clean-route-tree] nothing to remove");
}