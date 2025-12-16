# Architecture & Standards

## Goals
- Svelte + Vite + TypeScript
- TailwindCSS
- d3 + onnxruntime-web
- Deploy to GitHub Pages later (so base path must be configurable)

## Project layout
- apps/web is the frontend root
- keep src/lib/state, src/lib/model, src/lib/viz, src/lib/components

## Tooling
- ESLint + Prettier compatible with Svelte + TS
- scripts: dev, build, preview, lint, format

## Constraints
- No extra frameworks (no React/Vue)
- Avoid complex state libraries; use Svelte stores only
- All configuration must be committed as files, no “manual steps” left
