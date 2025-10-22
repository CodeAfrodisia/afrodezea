import React from "react";

export default function Pagination({ page, pageCount, onPage, compact = false }) {
  return (
    <div style={{
      display: "flex", gap: 8, justifyContent: "center",
      marginTop: compact ? 8 : 14, alignItems: "center"
    }}>
      <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span style={{ opacity:.9 }}>{page} / {pageCount}</span>
      <button className="btn" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}

