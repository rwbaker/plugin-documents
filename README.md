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

```bash
npm install github:rwbaker/plugin-documents
```

## Requirements

- Paperclip SDK `>=2026.416.0`
- Capabilities: `issues.read`, `issue.documents.read`, `issue.documents.write`, `projects.read`, `plugin.state.read`, `plugin.state.write`

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
```

## License

MIT
