import { useState } from 'react';
import { usePluginData, usePluginAction } from '@paperclipai/plugin-sdk/ui';
import type { PluginPageProps } from '@paperclipai/plugin-sdk/ui';

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

export function DocumentsPage({ context }: PluginPageProps) {
  const [query, setQuery] = useState('');
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

  const grouped = groupByProject(data?.documents ?? []);

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
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

      {loading && <p style={{ color: '#666' }}>Loading...</p>}
      {error && <p style={{ color: '#dc2626' }}>Error: {error.message}</p>}

      {!loading && data && data.documents.length === 0 && (
        <p style={{ color: '#666', marginTop: '24px' }}>
          {data.lastIndexedAt
            ? 'No documents found. Try a different search.'
            : 'No documents indexed yet. Click "Reindex" to start.'}
        </p>
      )}

      {Object.entries(grouped).map(([projectName, docs]) => (
        <div key={projectName} style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {projectName}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {docs.map((doc) => (
              <div key={`${doc.issueId}-${doc.documentKey}`} style={docRowStyle}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500 }}>{doc.documentTitle}</span>
                  <span style={{ color: '#666', marginLeft: '8px', fontSize: '13px' }}>
                    {doc.issueIdentifier} &middot; {doc.issueTitle}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {data?.lastIndexedAt && (
        <p style={{ marginTop: '24px', fontSize: '12px', color: '#999' }}>
          Last indexed: {new Date(data.lastIndexedAt).toLocaleString()}
        </p>
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
  border: '1px solid #ddd',
  background: '#fff',
  cursor: 'pointer',
};

const searchStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #ddd',
  outline: 'none',
};

const docRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #eee',
  background: '#fafafa',
};
