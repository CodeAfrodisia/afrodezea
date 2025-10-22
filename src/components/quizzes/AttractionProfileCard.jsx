// src/components/quizzes/AttractionProfileCard.jsx
import React from "react";
import {
  splitVectors, rankVector, buildLabelIndex, composeAttractionLine
} from "@lib/attractionProfile.js";

export default function AttractionProfileCard({ totals, results }) {
  const labelIndex = buildLabelIndex(results);
  const { roles, elements } = splitVectors(totals);

  const rankedRoles = rankVector(roles).slice(0, 3);
  const rankedElems = rankVector(elements).slice(0, 3);

  const line = composeAttractionLine(rankedRoles, rankedElems, labelIndex);

  const chip = (key, pct) => (
    <span key={key}
      className="pill"
      title={`${labelIndex[key] || key} · ${pct}%`}
      style={{ border: "1px solid var(--hairline)", background: "rgba(255,255,255,.06)" }}
    >
      {(labelIndex[key] || key).replace(/^role_|^element_/i, "")} · {pct}%
    </span>
  );

  const bar = (key, pct) => (
    <div key={key} style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, opacity: .8 }}>{(labelIndex[key] || key).replace(/^role_|^element_/i, "")}</div>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "linear-gradient(145deg, var(--gold), var(--gold-2))"
        }} />
      </div>
    </div>
  );

  const hasData = rankedRoles.length || rankedElems.length;

  if (!hasData) return null;

  return (
    <section className="surface" style={{ padding: 16, display: "grid", gap: 12, borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Attraction Profile</h3>
      </div>

      <div style={{ opacity: .9 }}>
        {/* eslint-disable-next-line react/no-danger */}
        <div dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      </div>

      {/* Chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {rankedRoles.slice(0, 2).map(r => chip(r.key, r.pct))}
        {rankedElems.slice(0, 2).map(e => chip(e.key, e.pct))}
      </div>

      {/* Bars */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700, opacity: .9 }}>Top Roles</div>
        {rankedRoles.map(r => bar(r.key, r.pct))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700, opacity: .9 }}>Top Elements</div>
        {rankedElems.map(e => bar(e.key, e.pct))}
      </div>
    </section>
  );
}

