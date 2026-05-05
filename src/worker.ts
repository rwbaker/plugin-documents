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
const ARCHIVE_STATE_KEY = 'archived-docs';

interface ArchivedDocs {
  keys: string[];
}

function archiveKey(doc: { issueId: string; documentKey: string }): string {
  return `${doc.issueId}:${doc.documentKey}`;
}

const plugin = definePlugin({
  async setup(ctx) {
    async function getArchivedKeys(): Promise<Set<string>> {
      const stored = await ctx.state.get({ scopeKind: 'instance', stateKey: ARCHIVE_STATE_KEY });
      if (!stored) return new Set();
      return new Set((stored as ArchivedDocs).keys);
    }

    ctx.data.register('documents', async (params) => {
      const companyId = params?.companyId as string | undefined;
      if (!companyId) return { documents: [], lastIndexedAt: null };

      const stored = await ctx.state.get({ scopeKind: 'instance', stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [], lastIndexedAt: null };

      const index = stored as DocumentIndex;
      const archived = await getArchivedKeys();
      const query = (params?.query as string | undefined)?.toLowerCase();

      let docs = index.documents.filter((doc) => !archived.has(archiveKey(doc)));

      if (query) {
        docs = docs.filter(
          (doc) =>
            doc.documentTitle.toLowerCase().includes(query) ||
            doc.issueTitle.toLowerCase().includes(query) ||
            doc.issueIdentifier.toLowerCase().includes(query) ||
            (doc.projectName?.toLowerCase().includes(query) ?? false),
        );
      }

      return { documents: docs, lastIndexedAt: index.lastIndexedAt };
    });

    ctx.data.register('archived-documents', async (params) => {
      const companyId = params?.companyId as string | undefined;
      if (!companyId) return { documents: [] };

      const stored = await ctx.state.get({ scopeKind: 'instance', stateKey: INDEX_STATE_KEY });
      if (!stored) return { documents: [] };

      const index = stored as DocumentIndex;
      const archived = await getArchivedKeys();

      const docs = index.documents.filter((doc) => archived.has(archiveKey(doc)));
      return { documents: docs };
    });

    ctx.data.register('document-content', async (params) => {
      const companyId = params?.companyId as string | undefined;
      const issueId = params?.issueId as string | undefined;
      const documentKey = params?.documentKey as string | undefined;
      if (!companyId || !issueId || !documentKey) return null;

      const doc = await ctx.issues.documents.get(issueId, documentKey, companyId);
      if (!doc) return null;
      return { title: doc.title ?? doc.key, body: doc.body, format: doc.format };
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

    ctx.actions.register('save-document', async (params) => {
      const companyId = params?.companyId as string | undefined;
      const issueId = params?.issueId as string | undefined;
      const documentKey = params?.documentKey as string | undefined;
      const body = params?.body as string | undefined;
      const title = params?.title as string | undefined;
      const format = params?.format as string | undefined;
      if (!companyId || !issueId || !documentKey || body === undefined)
        throw new Error('companyId, issueId, documentKey, and body are required');

      await ctx.issues.documents.upsert({
        issueId,
        key: documentKey,
        body,
        companyId,
        title,
        format,
      });
      return { saved: true };
    });

    ctx.actions.register('archive', async (params) => {
      const issueId = params?.issueId as string | undefined;
      const documentKey = params?.documentKey as string | undefined;
      if (!issueId || !documentKey) throw new Error('issueId and documentKey are required');

      const archived = await getArchivedKeys();
      const key = archiveKey({ issueId, documentKey });
      archived.add(key);
      await ctx.state.set({ scopeKind: 'instance', stateKey: ARCHIVE_STATE_KEY }, { keys: [...archived] });
      return { archived: true };
    });

    ctx.actions.register('unarchive', async (params) => {
      const issueId = params?.issueId as string | undefined;
      const documentKey = params?.documentKey as string | undefined;
      if (!issueId || !documentKey) throw new Error('issueId and documentKey are required');

      const archived = await getArchivedKeys();
      const key = archiveKey({ issueId, documentKey });
      archived.delete(key);
      await ctx.state.set({ scopeKind: 'instance', stateKey: ARCHIVE_STATE_KEY }, { keys: [...archived] });
      return { unarchived: true };
    });
  },

  async onHealth() {
    return { status: 'ok', message: 'Documents plugin running' };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
