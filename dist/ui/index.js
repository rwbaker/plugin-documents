// src/ui/index.tsx
import { useState } from "react";
import { usePluginData, usePluginAction } from "@paperclipai/plugin-sdk/ui";
import { jsx, jsxs } from "react/jsx-runtime";
function DocumentsPage({ context }) {
  const [query, setQuery] = useState("");
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
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: "4px" }, children: docs.map((doc) => /* @__PURE__ */ jsxs("div", { style: docRowStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontWeight: 500 }, children: doc.documentTitle }),
          /* @__PURE__ */ jsxs("span", { style: { color: "#666", marginLeft: "8px", fontSize: "13px" }, children: [
            doc.issueIdentifier,
            " \xB7 ",
            doc.issueTitle
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: "12px", color: "#999" }, children: new Date(doc.updatedAt).toLocaleDateString() })
      ] }, `${doc.issueId}-${doc.documentKey}`)) })
    ] }, projectName)),
    data?.lastIndexedAt && /* @__PURE__ */ jsxs("p", { style: { marginTop: "24px", fontSize: "12px", color: "#999" }, children: [
      "Last indexed: ",
      new Date(data.lastIndexedAt).toLocaleString()
    ] })
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
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #eee",
  background: "#fafafa"
};
export {
  DocumentsPage
};
//# sourceMappingURL=index.js.map
