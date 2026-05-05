// src/ui/index.tsx
import { useState } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import { jsx, jsxs } from "react/jsx-runtime";
function DocumentsSidebarLink({ context }) {
  const prefix = context.companyPrefix ?? "";
  return /* @__PURE__ */ jsx(
    "a",
    {
      href: `/${prefix}/documents`,
      style: { color: "inherit", textDecoration: "none", display: "block", padding: "4px 0" },
      children: "Documents"
    }
  );
}
function DocumentsPage({ context }) {
  const [query, setQuery] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const { data, loading, error, refresh } = usePluginData("documents", {
    companyId: context.companyId,
    query: query || void 0
  });
  const reindex = usePluginAction("reindex");
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
    return /* @__PURE__ */ jsx(
      DocumentViewer,
      {
        doc: selectedDoc,
        companyId: context.companyId,
        companyPrefix: context.companyPrefix ?? "",
        onBack: () => setSelectedDoc(null)
      }
    );
  }
  const grouped = groupByProject(data?.documents ?? []);
  return /* @__PURE__ */ jsxs("div", { style: { padding: "24px", maxWidth: "960px", margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
      /* @__PURE__ */ jsx("h1", { style: { fontSize: "20px", fontWeight: 600, margin: 0 }, children: "Documents" }),
      /* @__PURE__ */ jsx("button", { onClick: handleReindex, disabled: reindexing, style: buttonStyle, children: reindexing ? "Indexing..." : "Reindex" })
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        placeholder: "Search documents...",
        value: query,
        onChange: (e) => setQuery(e.target.value),
        style: searchStyle
      }
    ),
    loading && /* @__PURE__ */ jsx("p", { style: { color: "#666" }, children: "Loading..." }),
    error && /* @__PURE__ */ jsxs("p", { style: { color: "#dc2626" }, children: [
      "Error: ",
      error.message
    ] }),
    !loading && data && data.documents.length === 0 && /* @__PURE__ */ jsx("p", { style: { color: "#666", marginTop: "24px" }, children: data.lastIndexedAt ? "No documents found. Try a different search." : 'No documents indexed yet. Click "Reindex" to start.' }),
    Object.entries(grouped).map(([projectName, docs]) => /* @__PURE__ */ jsxs("div", { style: { marginTop: "24px" }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "14px", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }, children: projectName }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: "4px" }, children: docs.map((doc) => /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => setSelectedDoc(doc),
          style: docRowStyle,
          children: [
            /* @__PURE__ */ jsx("div", { style: { flex: 1 }, children: /* @__PURE__ */ jsx("span", { style: { fontWeight: 500 }, children: doc.documentTitle }) }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "12px", color: "#999" }, children: new Date(doc.updatedAt).toLocaleDateString() })
          ]
        },
        `${doc.issueId}-${doc.documentKey}`
      )) })
    ] }, projectName)),
    data?.lastIndexedAt && /* @__PURE__ */ jsxs("p", { style: { marginTop: "24px", fontSize: "12px", color: "#999" }, children: [
      "Last indexed: ",
      new Date(data.lastIndexedAt).toLocaleString()
    ] })
  ] });
}
function DocumentViewer({
  doc,
  companyId,
  companyPrefix,
  onBack
}) {
  const { data, loading, error } = usePluginData("document-content", {
    companyId,
    issueId: doc.issueId,
    documentKey: doc.documentKey
  });
  return /* @__PURE__ */ jsxs("div", { style: { padding: "24px", maxWidth: "960px", margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }, children: [
      /* @__PURE__ */ jsx("button", { onClick: onBack, style: buttonStyle, children: "\u2190 Back" }),
      /* @__PURE__ */ jsx("h1", { style: { fontSize: "20px", fontWeight: 600, margin: 0 }, children: data?.title ?? doc.documentTitle })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { fontSize: "13px", color: "#666", marginBottom: "16px" }, children: [
      "From ",
      /* @__PURE__ */ jsx("a", { href: `/${companyPrefix}/issues/${doc.issueIdentifier}#document-${doc.documentKey}`, style: { color: "#2563eb" }, children: doc.issueIdentifier }),
      doc.projectName && /* @__PURE__ */ jsxs("span", { children: [
        " \xB7 ",
        doc.projectName
      ] })
    ] }),
    loading && /* @__PURE__ */ jsx("p", { style: { color: "#666" }, children: "Loading document..." }),
    error && /* @__PURE__ */ jsxs("p", { style: { color: "#dc2626" }, children: [
      "Error loading document: ",
      error.message
    ] }),
    data && /* @__PURE__ */ jsx("div", { style: contentStyle, children: /* @__PURE__ */ jsx("pre", { style: { whiteSpace: "pre-wrap", wordWrap: "break-word", margin: 0, fontFamily: "inherit", fontSize: "14px", lineHeight: "1.6" }, children: data.body }) })
  ] });
}
function groupByProject(docs) {
  const groups = {};
  for (const doc of docs) {
    const key = doc.projectName ?? "No Project";
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  return groups;
}
var buttonStyle = {
  padding: "6px 12px",
  fontSize: "13px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer"
};
var searchStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "14px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  outline: "none"
};
var docRowStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 14px",
  borderRadius: "6px",
  border: "1px solid #eee",
  background: "#fafafa",
  cursor: "pointer"
};
var contentStyle = {
  padding: "20px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#fafafa"
};
export {
  DocumentsPage,
  DocumentsSidebarLink
};
//# sourceMappingURL=index.js.map
