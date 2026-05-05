import { useState, useMemo } from 'react';
import { usePluginData, usePluginAction } from '@paperclipai/plugin-sdk/ui';
import type { PluginPageProps, PluginSidebarProps } from '@paperclipai/plugin-sdk/ui';
import { marked } from 'marked';

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

interface DocumentsData {
  documents: DocumentEntry[];
  lastIndexedAt: string | null;
}

interface DocumentContent {
  title: string;
  body: string;
  format: string;
}

export function DocumentsSidebarLink({ context }: PluginSidebarProps) {
  const prefix = context.companyPrefix ?? '';
  const isActive = typeof window !== 'undefined' && window.location.pathname === `/${prefix}/documents`;
  const baseClasses = 'flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors';
  const stateClasses = isActive
    ? 'bg-accent/50 text-foreground'
    : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground';
  return (
    <a
      className={`${baseClasses} ${stateClasses}`}
      href={`/${prefix}/documents`}
      data-discover="true"
    >
      <span className="relative shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-4 w-4" aria-hidden="true">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      </span>
      <span className="flex-1 truncate">Documents</span>
    </a>
  );
}

export function DocumentsPage({ context }: PluginPageProps) {
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const { data, loading, error, refresh } = usePluginData<DocumentsData>('documents', {
    companyId: context.companyId,
    query: query || undefined,
  });
  const { data: archivedData, loading: archiveLoading, refresh: refreshArchive } = usePluginData<{ documents: DocumentEntry[] }>('archived-documents', {
    companyId: context.companyId,
  });
  const reindex = usePluginAction('reindex');
  const archiveAction = usePluginAction('archive');
  const unarchiveAction = usePluginAction('unarchive');
  const [reindexing, setReindexing] = useState(false);

  async function handleReindex() {
    setReindexing(true);
    try {
      await reindex({ companyId: context.companyId });
      refresh();
      refreshArchive();
    } finally {
      setReindexing(false);
    }
  }

  async function handleArchive(doc: DocumentEntry, e: React.MouseEvent) {
    e.stopPropagation();
    await archiveAction({ issueId: doc.issueId, documentKey: doc.documentKey });
    refresh();
    refreshArchive();
  }

  async function handleUnarchive(doc: DocumentEntry, e: React.MouseEvent) {
    e.stopPropagation();
    await unarchiveAction({ issueId: doc.issueId, documentKey: doc.documentKey });
    refresh();
    refreshArchive();
  }

  if (selectedDoc) {
    return (
      <DocumentViewer
        doc={selectedDoc}
        companyId={context.companyId!}
        companyPrefix={context.companyPrefix ?? ''}
        onBack={() => setSelectedDoc(null)}
      />
    );
  }

  const activeDocs = data?.documents ?? [];
  const archivedDocs = archivedData?.documents ?? [];
  const grouped = groupByProject(showArchive ? archivedDocs : activeDocs);
  const archiveCount = archivedDocs.length;

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
          {showArchive ? 'Archived Documents' : 'Documents'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowArchive(!showArchive)}
            style={{
              ...buttonStyle,
              background: showArchive ? 'var(--accent)' : 'var(--card)',
            }}
          >
            {showArchive ? 'Back to Active' : `Archive${archiveCount ? ` (${archiveCount})` : ''}`}
          </button>
          {!showArchive && (
            <button onClick={handleReindex} disabled={reindexing} style={buttonStyle}>
              {reindexing ? 'Indexing...' : 'Reindex'}
            </button>
          )}
        </div>
      </div>

      {!showArchive && (
        <input
          type="text"
          placeholder="Search documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchStyle}
        />
      )}

      {(loading || (showArchive && archiveLoading)) && <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>Error: {error.message}</p>}

      {!loading && !showArchive && data && activeDocs.length === 0 && (
        <p style={{ color: 'var(--muted-foreground)', marginTop: '24px' }}>
          {data.lastIndexedAt
            ? 'No documents found. Try a different search.'
            : 'No documents indexed yet. Click "Reindex" to start.'}
        </p>
      )}

      {showArchive && !archiveLoading && archivedDocs.length === 0 && (
        <p style={{ color: 'var(--muted-foreground)', marginTop: '24px' }}>
          No archived documents.
        </p>
      )}

      {Object.entries(grouped).map(([projectName, docs]) => (
        <div key={projectName} style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {projectName}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {docs.map((doc) => (
              <DocRow
                key={`${doc.issueId}-${doc.documentKey}`}
                doc={doc}
                onClick={() => setSelectedDoc(doc)}
                onAction={showArchive ? (e) => handleUnarchive(doc, e) : (e) => handleArchive(doc, e)}
                actionLabel={showArchive ? 'Unarchive' : 'Archive'}
              />
            ))}
          </div>
        </div>
      ))}

      {!showArchive && data?.lastIndexedAt && (
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
          Last indexed: {new Date(data.lastIndexedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function DocRow({ doc, onClick, onAction, actionLabel }: { doc: DocumentEntry; onClick: () => void; onAction: (e: React.MouseEvent) => void; actionLabel: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        background: hovered ? 'var(--accent)' : 'var(--card)',
        color: 'var(--card-foreground)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 500 }}>{doc.documentTitle}</span>
        <span style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginLeft: '8px' }}>(from {doc.issueIdentifier})</span>
      </div>
      <button
        onClick={onAction}
        style={{
          padding: '3px 8px',
          fontSize: '11px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          background: 'var(--background)',
          color: 'var(--muted-foreground)',
          cursor: 'pointer',
          marginRight: '10px',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        {actionLabel}
      </button>
      <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
        {new Date(doc.updatedAt).toLocaleDateString()}
      </span>
    </div>
  );
}

function DocumentViewer({
  doc,
  companyId,
  companyPrefix,
  onBack,
}: {
  doc: DocumentEntry;
  companyId: string;
  companyPrefix: string;
  onBack: () => void;
}) {
  const { data, loading, error } = usePluginData<DocumentContent | null>('document-content', {
    companyId,
    issueId: doc.issueId,
    documentKey: doc.documentKey,
  });

  const renderedHtml = useMemo(() => {
    if (!data?.body) return '';
    return marked.parse(data.body, { async: false }) as string;
  }, [data?.body]);

  return (
    <div style={{ padding: '24px', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={buttonStyle}>&larr; Back</button>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>{data?.title ?? doc.documentTitle}</h1>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '16px' }}>
        From <a href={`/${companyPrefix}/issues/${doc.issueIdentifier}#document-${doc.documentKey}`} style={{ color: 'var(--accent-foreground)' }}>{doc.issueIdentifier}</a>
        {doc.projectName && <span> &middot; {doc.projectName}</span>}
      </div>

      {loading && <p style={{ color: 'var(--muted-foreground)' }}>Loading document...</p>}
      {error && <p style={{ color: '#dc2626' }}>Error loading document: {error.message}</p>}

      {data && (
        <>
          <style dangerouslySetInnerHTML={{ __html: markdownStyles }} />
          <div
            className="plugin-doc-content"
            style={{
              padding: '24px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--card-foreground)',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </>
      )}
    </div>
  );
}

function groupByProject(docs: DocumentEntry[]): Record<string, DocumentEntry[]> {
  const groups: Record<string, DocumentEntry[]> = {};
  for (const doc of docs) {
    const key = doc.projectName ?? 'No Project';
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  return groups;
}

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '13px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--card-foreground)',
  cursor: 'pointer',
};

const searchStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid var(--border)',
  background: 'var(--background)',
  color: 'var(--foreground)',
  outline: 'none',
};

const markdownStyles = `
.plugin-doc-content { font-size: 14px; line-height: 1.7; }
.plugin-doc-content h1,
.plugin-doc-content h2,
.plugin-doc-content h3,
.plugin-doc-content h4,
.plugin-doc-content h5,
.plugin-doc-content h6 { color: var(--foreground); font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
.plugin-doc-content h1 { font-size: 1.5em; }
.plugin-doc-content h2 { font-size: 1.3em; }
.plugin-doc-content h3 { font-size: 1.1em; }
.plugin-doc-content p { margin: 0.75em 0; }
.plugin-doc-content ul, .plugin-doc-content ol { padding-left: 1.5em; margin: 0.75em 0; }
.plugin-doc-content li { margin: 0.25em 0; }
.plugin-doc-content code { background: var(--muted); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
.plugin-doc-content pre { background: var(--muted); padding: 12px 16px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
.plugin-doc-content pre code { background: none; padding: 0; }
.plugin-doc-content blockquote { border-left: 3px solid var(--border); padding-left: 1em; margin: 1em 0; color: var(--muted-foreground); }
.plugin-doc-content a { color: var(--accent-foreground); text-decoration: underline; }
.plugin-doc-content hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
.plugin-doc-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
.plugin-doc-content th, .plugin-doc-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.plugin-doc-content th { background: var(--muted); font-weight: 600; }
`;
