import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { docMetaPlugin } from './scripts/lib/docmeta.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Counts files matching a suffix under a folder. Build-time only — see __COMPONENT_COUNT__. */
function countFiles(dir: string, suffix: string): number {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) n += countFiles(path, suffix);
    else if (entry.endsWith(suffix)) n += 1;
  }
  return n;
}

// base './' keeps assets relative so the build works at https://imagine-os.github.io/hoy/ and locally.
// docMetaPlugin serves `*.md?docmeta` (title, header meta, headings, decisions…) so the docs browser and
// the manual index the markdown at build time while the bodies load on demand as `?raw` chunks.
// __COMPONENT_COUNT__ is how many `<Name>.meta.ts` files D-02 collects: the hub prints the number, and a
// lazy import.meta.glob would have created one chunk per meta just to count them.
export default defineConfig({
  base: './',
  cacheDir: join(here, '.vite'),
  define: {
    __COMPONENT_COUNT__: JSON.stringify(countFiles(join(here, 'src/components'), '.meta.ts')),
  },
  plugins: [react(), docMetaPlugin()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 1000 },
});
