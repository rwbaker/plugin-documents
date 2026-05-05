import { useState } from 'react';
import { usePluginData, usePluginAction } from '@paperclipai/plugin-sdk/ui';
import type { PluginPageProps, PluginSidebarProps } from '@paperclipai/plugin-sdk/ui';

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

function FileTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export function DocumentsSidebarLink({ context }: PluginSidebarProps) {
  const prefix = context.companyPrefix ?? '';
  const [hovered, setHovered] = useState(false);
  const isActive = typeof window !== 'undefined' && window.location.pathname === `/${prefix}/documents`;

  return (
    <a
      href={`/${prefix}/documents`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        color: 'var(--foreground)',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '6px',
        background: isActive
          ? 'var(--accent)'
          : hovered
            ? 'var(--accent)'
            : 'transparent',
        opacity: isActive ? 1 : hovered ? 0.8 : 0.7,
        transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      <FileTextIcon />
      Documents
    </a>
  );
}

export function DocumentsPage({ context }: PluginPageProps) {
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntry | null>(null);
  const { data, loading, error, refresh } = usePluginData<DocumentsData>('documents', {
    companyId: context.companyId,
    query: query || undefined,
  });
  const reindex = usePluginAction('reindex');
  const [reindexing, setReindexing] = useState(false);

  async function handleReindex() {
    setReindexing(true);
    try {
      await reindex({ companyId: context.companyId });
      refresh();
    } finally {
      setReindexing(false);
    }
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

  const grouped = groupByProject(data?.documents ?? []);

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: 'var(--foreground)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Documents</h1>
        <button onClick={handleReindex} disabled={reindexing} style={buttonStyle}>
          {reindexing ? 'Indexing...' : 'Reindex'}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search documents..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={searchStyle}
      />

      {loading && <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>Error: {error.message}</p>}

      {!loading && data && data.documents.length === 0 && (
        <p style={{ color: 'var(--muted-foreground)', marginTop: '24px' }}>
          {data.lastIndexedAt
            ? 'No documents found. Try a different search.'
            : 'No documents indexed yet. Click "Reindex" to start.'}
        </p>
      )}

      {Object.entries(grouped).map(([projectName, docs]) => (
        <div key={projectName} style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {projectName}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {docs.map((doc) => (
              <DocRow key={`${doc.issueId}-${doc.documentKey}`} doc={doc} onClick={() => setSelectedDoc(doc)} />
            ))}
          </div>
        </div>
      ))}

      {data?.lastIndexedAt && (
        <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted-foreground)' }}>
          Last indexed: {new Date(data.lastIndexedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function DocRow({ doc, onClick }: { doc: DocumentEntry; onClick: () => void }) {
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
      </div>
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

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto', color: 'var(--foreground)' }}>
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
        <div style={{
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--card-foreground)',
        }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', margin: 0, fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6' }}>
            {data.body}
          </pre>
        </div>
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
