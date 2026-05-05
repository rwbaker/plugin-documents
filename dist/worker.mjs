import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// src/worker.ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
var INDEX_STATE_KEY = "document-index";
var plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register("documents", async (params) => {
      const companyId = params?.companyId;
      if (!companyId) return { documents: [], lastIndexedAt: null };
      const stored = await ctx.state.get({ scopeKind: "instance", stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [], lastIndexedAt: null };
      const index = stored;
      const query = params?.query?.toLowerCase();
      if (!query) return index;
      const filtered = index.documents.filter(
        (doc) => doc.documentTitle.toLowerCase().includes(query) || doc.issueTitle.toLowerCase().includes(query) || doc.issueIdentifier.toLowerCase().includes(query) || (doc.projectName?.toLowerCase().includes(query) ?? false)
      );
      return { documents: filtered, lastIndexedAt: index.lastIndexedAt };
    });
    ctx.data.register("document-content", async (params) => {
      const companyId = params?.companyId;
      const issueId = params?.issueId;
      const documentKey = params?.documentKey;
      if (!companyId || !issueId || !documentKey) return null;
      const doc = await ctx.issues.documents.get(issueId, documentKey, companyId);
      if (!doc) return null;
      return { title: doc.title ?? doc.key, body: doc.body, format: doc.format };
    });
    ctx.data.register("health", async () => {
      const stored = await ctx.state.get({ scopeKind: "instance", stateKey: INDEX_STATE_KEY });
      const index = stored;
      return {
        status: "ok",
        documentCount: index?.documents.length ?? 0,
        lastIndexedAt: index?.lastIndexedAt ?? null
      };
    });
    ctx.actions.register("reindex", async (params) => {
      const companyId = params?.companyId;
      if (!companyId) throw new Error("companyId is required");
      const projects = await ctx.projects.list({ companyId });
      const documents = [];
      const issues = await ctx.issues.list({ companyId });
      for (const issue of issues) {
        try {
          const docs = await ctx.issues.documents.list(issue.id, companyId);
          for (const doc of docs) {
            const project = projects.find((p) => p.id === issue.projectId);
            documents.push({
              issueId: issue.id,
              issueIdentifier: issue.identifier ?? issue.id,
              issueTitle: issue.title,
              projectId: issue.projectId ?? null,
              projectName: project?.name ?? null,
              documentKey: doc.key,
              documentTitle: doc.title ?? doc.key,
              format: doc.format,
              updatedAt: String(doc.updatedAt)
            });
          }
        } catch {
          ctx.logger.warn(`Failed to list documents for issue ${issue.identifier}`);
        }
      }
      const index = {
        documents,
        lastIndexedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await ctx.state.set({ scopeKind: "instance", stateKey: INDEX_STATE_KEY }, index);
      return { indexed: documents.length };
    });
  },
  async onHealth() {
    return { status: "ok", message: "Documents plugin running" };
  }
});
var worker_default = plugin;
runWorker(plugin, import.meta.url);
export {
  worker_default as default
};
//# sourceMappingURL=worker.mjs.map
