// src/pages/AdminRatings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listRecentRatings, updateRatingStatus } from "../lib/ratings.js";

function toCSV(rows) {
  const header = [
    "created_at","status","product_title","product_slug","email",
    "floral","fruity","woody","fresh","spicy","strength","comment"
  ];
  const esc = (v="") => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map(r => [
    r.created_at, r.product_id, r.email ?? "",
    r.floral, r.fruity, r.woody, r.fresh, r.spicy, r.strength,
    r.status, (r.comment ?? "").replace(/\n/g, " ")
  ].map(esc).join(","));
   const csv = [header, ...lines].map(a => a.map(x => `"${String(x).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ratings-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function AdminRatings() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  async function load() {
    try {
      setErr("");
      const data = await listRecentRatings({ limit: 200, status });
      setRows(data);
    } catch (e) {
      setErr(e.message || "Failed to load ratings.");
    }
  }

  useEffect(() => { load(); }, [status]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter(r =>
      (r.email || "").toLowerCase().includes(needle) ||
      (r.comment || "").toLowerCase().includes(needle) ||
      (r.products?.title || "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const act = async (id, next) => {
    setBusy(true);
    try {
      await updateRatingStatus(id, next);
      setRows(rs => rs.map(r => (r.id === id ? { ...r, status: next } : r)));
    } catch (e) {
      alert(e.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };
if (!import.meta.env.VITE_ADMIN_KEY) {
  return <div className="container" style={{padding:24}}>Admin disabled.</div>;
}
  return (
    <div className="container" style={{ padding: 24, display:"grid", gap: 12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <h1 className="display" style={{ margin:0 }}>Ratings Moderation</h1>
        <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
          <select className="input" value={status} onChange={e=>setStatus(e.target.value)} style={{ width:180 }}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            className="input"
            placeholder="Search email, product, comment…"
            value={q}
            onChange={e=>setQ(e.target.value)}
            style={{ width:300 }}
          />
          <button className="btn btn--gold" onClick={() => toCSV(filtered)}>Export CSV</button>
        </div>
      </div>

      {err && <div className="surface" style={{ padding:12, color:"#f88" }}>{err}</div>}

      <div className="surface" style={{ padding: 12, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:"1px solid var(--hairline)" }}>
              <th style={{ textAlign:"left", padding:8, whiteSpace:"nowrap" }}>When</th>
              <th style={{ textAlign:"left", padding:8 }}>Product</th>
              <th style={{ textAlign:"left", padding:8 }}>Email</th>
              <th style={{ textAlign:"left", padding:8 }}>Scores</th>
              <th style={{ textAlign:"left", padding:8, minWidth:320 }}>Comment</th>
              <th style={{ textAlign:"left", padding:8 }}>Status</th>
              <th style={{ textAlign:"left", padding:8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderTop:"1px solid var(--hairline)" }}>
                <td style={{ padding:8, whiteSpace:"nowrap" }}>
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td style={{ padding:8 }}>
                  <div style={{ display:"grid" }}>
                    <strong>{r.products?.title || "—"}</strong>
                    <small style={{ opacity:.75 }}>{r.products?.slug || "—"}</small>
                  </div>
                </td>
                <td style={{ padding:8, opacity:.9 }}>{r.email || "—"}</td>
                <td style={{ padding:8, whiteSpace:"nowrap" }}>
                  Flo {r.floral} • Fru {r.fruity} • Woo {r.woody} • Fre {r.fresh} • Sp {r.spicy} • Str {r.strength}
                </td>
                <td style={{ padding:8, maxWidth:500, whiteSpace:"pre-wrap" }}>{r.comment || "—"}</td>
                <td style={{ padding:8, textTransform:"capitalize" }}>{r.status}</td>
                <td style={{ padding:8, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => act(r.id, "verified")}>Verify</button>
                  <button className="btn btn--ghost" disabled={busy} onClick={() => act(r.id, "rejected")}>Reject</button>
                  <a
                    className="btn"
                    href={`/product/${r.products?.slug ?? ""}`}
                    target="_blank" rel="noreferrer"
                    style={{ textDecoration:"none" }}
                  >
                    View Product
                  </a>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={7} style={{ padding:12, opacity:.8 }}>No ratings match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
