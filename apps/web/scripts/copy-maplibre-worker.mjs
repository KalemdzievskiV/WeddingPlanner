// MapLibre 6 loads its web worker from a separate file that Next.js doesn't bundle.
// Copy it to public/ so the app can serve it at /vendor/maplibre-gl-worker.mjs.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const target = path.join(import.meta.dirname, "../public/vendor/maplibre-gl-worker.mjs");
mkdirSync(path.dirname(target), { recursive: true });
copyFileSync(source, target);
