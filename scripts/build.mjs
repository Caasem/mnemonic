#!/usr/bin/env node
// Build script for Mnemonic — bundles the app with esbuild. Run `npm install`
// first; this resolves `esbuild` from node_modules like any normal build tool.
import * as esbuildNs from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const esbuild = esbuildNs.default ?? esbuildNs;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outdir = path.join(root, "dist");
const watch = process.argv.includes("--watch");
const serve = process.argv.includes("--serve");

fs.mkdirSync(outdir, { recursive: true });

// Copy static public assets
const publicDir = path.join(root, "public");
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
if (fs.existsSync(publicDir)) copyDir(publicDir, outdir);

const buildOptions = {
  entryPoints: [path.join(root, "src", "main.tsx")],
  bundle: true,
  outfile: path.join(outdir, "app.js"),
  format: "esm",
  target: ["es2022"],
  minify: !watch,
  sourcemap: true,
  jsx: "automatic",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
    ".css": "css",
    ".svg": "text",
  },
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
  },
  logLevel: "info",
};

// Bundle CSS separately
const cssBuildOptions = {
  entryPoints: [path.join(root, "src", "styles", "index.css")],
  bundle: true,
  outfile: path.join(outdir, "app.css"),
  minify: !watch,
  logLevel: "silent",
};

async function buildOnce() {
  await esbuild.build(buildOptions);
  await esbuild.build(cssBuildOptions);
  console.log("[build] done");
}

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  const cssCtx = await esbuild.context(cssBuildOptions);
  await ctx.watch();
  await cssCtx.watch();
  console.log("[build] watching for changes...");
  if (serve) {
    const { host, port } = await ctx.serve({ servedir: outdir, port: 5173 });
    console.log(`[serve] http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  }
} else {
  await buildOnce();
}
