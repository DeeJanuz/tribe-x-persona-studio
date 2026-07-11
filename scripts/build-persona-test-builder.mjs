import { build } from "esbuild";

await build({
  entryPoints: ["src/persona-test-builder.tsx"],
  outfile: "renderers/persona-test-builder.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  sourcemap: false,
  minify: true,
  legalComments: "none",
  logLevel: "info",
  loader: { ".css": "text" },
});

await build({
  entryPoints: ["src/persona-test-builder.css"],
  outfile: "renderers/persona-test-builder.css",
  bundle: true,
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  logLevel: "info",
});
