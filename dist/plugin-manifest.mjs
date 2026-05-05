// src/manifest.ts
var manifest = {
  id: "documents",
  apiVersion: 1,
  version: "0.2.0",
  displayName: "Documents",
  description: "Browse all issue documents across the company, grouped by project with search",
  author: "SGNL Studio",
  categories: ["ui"],
  capabilities: [
    "issues.read",
    "issue.documents.read",
    "projects.read",
    "plugin.state.read",
    "plugin.state.write",
    "ui.page.register",
    "ui.sidebar.register"
  ],
  entrypoints: {
    worker: "dist/worker.mjs",
    ui: "dist/ui"
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "documents-page",
        displayName: "Documents",
        exportName: "DocumentsPage",
        routePath: "documents"
      },
      {
        type: "sidebar",
        id: "documents-nav",
        displayName: "Documents",
        exportName: "DocumentsSidebarLink"
      }
    ]
  }
};
var manifest_default = manifest;
export {
  manifest_default as default
};
//# sourceMappingURL=plugin-manifest.mjs.map
