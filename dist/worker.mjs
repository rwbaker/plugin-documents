import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// src/worker.ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
var INDEX_STATE_KEY = "document-index";
var ARCHIVE_STATE_KEY = "archived-docs";
function archiveKey(doc) {
  return `${doc.issueId}:${doc.documentKey}`;
}
var plugin = definePlugin({
  async setup(ctx) {
    async function getArchivedKeys() {
      const stored = await ctx.state.get({ scopeKind: "instance", stateKey: ARCHIVE_STATE_KEY });
      if (!stored) return /* @__PURE__ */ new Set();
      return new Set(stored.keys);
    }
    ctx.data.register("documents", async (params) => {
      const companyId = params?.companyId;
      if (!companyId) return { documents: [], lastIndexedAt: null };
      const stored = await ctx.state.get({ scopeKind: "instance", stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [], lastIndexedAt: null };
      const index = stored;
      const archived = await getArchivedKeys();
      const query = params?.query?.toLowerCase();
      let docs = index.documents.filter((doc) => !archived.has(archiveKey(doc)));
      if (query) {
        docs = docs.filter(
          (doc) => doc.documentTitle.toLowerCase().includes(query) || doc.issueTitle.toLowerCase().includes(query) || doc.issueIdentifier.toLowerCase().includes(query) || (doc.projectName?.toLowerCase().includes(query) ?? false)
        );
      }
      return { documents: docs, lastIndexedAt: index.lastIndexedAt };
    });
    ctx.data.register("archived-documents", async (params) => {
      const companyId = params?.companyId;
      if (!companyId) return { documents: [] };
      const stored = await ctx.state.get({ scopeKind: "instance", stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [] };
      const index = stored;
      const archived = await getArchivedKeys();
      const docs = index.documents.filter((doc) => archived.has(archiveKey(doc)));
      return { documents: docs };
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
    ctx.actions.register("save-document", async (params) => {
      const companyId = params?.companyId;
      const issueId = params?.issueId;
      const documentKey = params?.documentKey;
      const body = params?.body;
      const title = params?.title;
      const format = params?.format;
      if (!companyId || !issueId || !documentKey || body === void 0)
        throw new Error("companyId, issueId, documentKey, and body are required");
      await ctx.issues.documents.upsert({
        issueId,
        key: documentKey,
        body,
        companyId,
        title,
        format
      });
      return { saved: true };
    });
    ctx.actions.register("archive", async (params) => {
      const issueId = params?.issueId;
      const documentKey = params?.documentKey;
      if (!issueId || !documentKey) throw new Error("issueId and documentKey are required");
      const archived = await getArchivedKeys();
      const key = archiveKey({ issueId, documentKey });
      archived.add(key);
      await ctx.state.set({ scopeKind: "instance", stateKey: ARCHIVE_STATE_KEY }, { keys: [...archived] });
      return { archived: true };
    });
    ctx.actions.register("unarchive", async (params) => {
      const issueId = params?.issueId;
      const documentKey = params?.documentKey;
      if (!issueId || !documentKey) throw new Error("issueId and documentKey are required");
      const archived = await getArchivedKeys();
      const key = archiveKey({ issueId, documentKey });
      archived.delete(key);
      await ctx.state.set({ scopeKind: "instance", stateKey: ARCHIVE_STATE_KEY }, { keys: [...archived] });
      return { unarchived: true };
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
