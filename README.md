# plugin-documents

A Paperclip plugin that surfaces all issue documents in one place. Browse, search, edit, and archive documents across your entire workspace without digging through individual tickets.

## Features

- **Unified document list** — all documents across all projects, grouped by project name
- **Full-text search** — filter by document title, issue identifier, issue title, or project name
- **Inline markdown viewer** — rendered preview with full theme support (light/dark)
- **Inline editing** — edit documents directly and save back to the source issue
- **Archive/unarchive** — hide documents you no longer need; view and restore them anytime
- **Download** — export any document in its native format (.md, etc.)
- **Issue detail tab** — "Documents" tab on every issue links directly to the plugin viewer
- **Sidebar navigation** — quick access from the main nav
- **Reindex on demand** — pull the latest documents from all issues with one click

## Installation

Install from GitHub into your Paperclip plugins directory:

```bash
cd /path/to/.paperclip/plugins
npm install github:rwbaker/plugin-documents
```

### Gotchas we hit during setup

The Paperclip plugin host has specific expectations that differ from a normal npm package. Here's what tripped us up:

1. **`dist/` must be committed to the repo.** The plugin host runs `npm install --ignore-scripts`, so `prepack`/`postinstall` hooks (including the build step) never execute. If `dist/` is in `.gitignore`, the installed package will be missing the compiled worker, manifest, and UI bundle. Keep `dist/` tracked in git.

2. **`package-lock.json` must NOT be committed.** Local path references in the lockfile can break installs on other machines. The `.gitignore` already excludes it — don't override that.

3. **Package name must be unscoped.** The plugin host resolves packages by dependency key as a directory under `node_modules/`. A scoped name like `@org/plugin-documents` creates a nested path (`node_modules/@org/plugin-documents`) that doesn't match how the host looks up plugins. Use an unscoped name: `plugin-documents`.

4. **Manifest file must not be named `manifest.mjs`.** Node.js caches `import()` results by file path. If a previous (broken) manifest was cached at `dist/manifest.mjs`, renaming it won't help unless the filename itself changes. We use `dist/plugin-manifest.mjs` — set that in `package.json` under `paperclipPlugin.manifest`.

5. **Manifest field values are validated strictly:**
   - `categories` must use a valid enum value (`ui`, not `productivity`)
   - `routePath` must be a single-segment slug (`documents`, not `/documents`)

## Requirements

- **Node.js** >= 20
- **Paperclip SDK** `>=2026.416.0`
- **Capabilities** (declared in manifest):
  - `issues.read` — list issues to find documents
  - `issue.documents.read` — read document content
  - `issue.documents.write` — save edits back to source issues
  - `projects.read` — group documents by project
  - `plugin.state.read` / `plugin.state.write` — persist index and archive state
  - `ui.page.register` — register the `/documents` page
  - `ui.sidebar.register` — register the sidebar nav link

## Development

```bash
# Install dependencies
npm install

# Build worker, manifest, and UI bundles
npm run build

# Type-check without emitting
npm run typecheck

# Run tests (Node.js native test runner)
npm test

# Start dev server on port 4178
npm run dev
```

### Build output

The build (`node build.mjs`) produces three bundles via esbuild:

| Source | Output | Target |
|---|---|---|
| `src/worker.ts` | `dist/worker.mjs` | Node 20 (ESM) |
| `src/manifest.ts` | `dist/plugin-manifest.mjs` | Node 20 (ESM) |
| `src/ui/index.tsx` | `dist/ui/index.js` | Browser (ES2022) |

The UI bundle externalizes `react`, `react/jsx-runtime`, and `@paperclipai/plugin-sdk/ui` — these are provided by the Paperclip host at runtime.

## License

MIT
