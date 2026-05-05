import { definePlugin, runWorker } from '@paperclipai/plugin-sdk';

interface DocumentEntry {
  issueId: string;
  issueIdentifier: string;
  issueTitle: string;
  projectId: string | null;
  projectName: string | null;
  documentKey: string;
  documentTitle: string;
  format: string;
  updatedAt: string;
}

interface DocumentIndex {
  documents: DocumentEntry[];
  lastIndexedAt: string;
}

const INDEX_STATE_KEY = 'document-index';

const plugin = definePlugin({
  async setup(ctx) {
    ctx.data.register('documents', async (params) => {
      const companyId = params?.companyId as string | undefined;
      if (!companyId) return { documents: [], lastIndexedAt: null };

      const stored = await ctx.state.get({ scopeKind: 'instance', stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [], lastIndexedAt: null };

      const index = stored as DocumentIndex;
      const query = (params?.query as string | undefined)?.toLowerCase();

      if (!query) return index;

      const filtered = index.documents.filter(
        (doc) =>
          doc.documentTitle.toLowerCase().includes(query) ||
          doc.issueTitle.toLowerCase().includes(query) ||
          doc.issueIdentifier.toLowerCase().includes(query) ||
          (doc.projectName?.toLowerCase().includes(query) ?? false),
      );

      return { documents: filtered, lastIndexedAt: index.lastIndexedAt };
    });

    ctx.data.register('health', async () => {
      const stored = await ctx.state.get({ scopeKind: 'instance', stateKey: INDEX_STATE_KEY });
      const index = stored as DocumentIndex | null;
      return {
        status: 'ok',
        documentCount: index?.documents.length ?? 0,
        lastIndexedAt: index?.lastIndexedAt ?? null,
      };
    });

    ctx.actions.register('reindex', async (params) => {
      const companyId = params?.companyId as string | undefined;
      if (!companyId) throw new Error('companyId is required');

      const projects = await ctx.projects.list({ companyId });
      const documents: DocumentEntry[] = [];

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
              updatedAt: String(doc.updatedAt),
            });
          }
        } catch {
          ctx.logger.warn(`Failed to list documents for issue ${issue.identifier}`);
        }
      }

      const index: DocumentIndex = {
        documents,
        lastIndexedAt: new Date().toISOString(),
      };

      await ctx.state.set({ scopeKind: 'instance', stateKey: INDEX_STATE_KEY }, index);

      return { indexed: documents.length };
    });
  },

  async onHealth() {
    return { status: 'ok', message: 'Documents plugin running' };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
