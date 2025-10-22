// src/components/quizzes/ResultModal.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import supabase from "@lib/supabaseClient.js";
import QuizRadarChart from "@components/quizzes/QuizRadarChart.jsx";
import { labelsMap } from "@components/quizzes/labels.js";
import { remapTotalsKeys as migrateTotals } from "@components/quizzes/normalizeTotals.js";
import { normalizeTotals as scaleTotals } from "@lib/quizMath.js";

/* ---------- Archetype Dual helpers (same as your tab) ---------- */
const ARCH_DUAL_LABELS = {
  role_Navigator: "Navigator", role_Protector: "Protector", role_Architect: "Architect",
  role_Guardian: "Guardian",  role_Artisan: "Artisan",     role_Catalyst: "Catalyst",
  role_Nurturer: "Nurturer",  role_Herald: "Herald",       role_Seeker: "Seeker",
  energy_Muse: "Muse", energy_Sage: "Sage", energy_Visionary: "Visionary",
  energy_Healer: "Healer", energy_Warrior: "Warrior", energy_Creator: "Creator",
  energy_Lover: "Lover", energy_Magician: "Magician", energy_Rebel: "Rebel",
  energy_Caregiver: "Caregiver", energy_Sovereign: "Sovereign", energy_Jester: "Jester",
};
const ARCH_DUAL_ALLOWED = new Set(Object.keys(ARCH_DUAL_LABELS));
function flattenArchetypeDualTotals(totals = {}) {
  if (!totals || typeof totals !== "object") return totals;
  const out = {};
  if (totals.role && typeof totals.role === "object") {
    for (const [k, v] of Object.entries(totals.role)) out[`role_${k}`] = Number(v) || 0;
  }
  if (totals.energy && typeof totals.energy === "object") {
    for (const [k, v] of Object.entries(totals.energy)) out[`energy_${k}`] = Number(v) || 0;
  }
  return Object.keys(out).length ? out : totals;
}
function sanitizeArchetypeDualTotals(totals = {}) {
  if (!totals || typeof totals !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(totals)) {
    const m = String(k).match(/^(role|energy)[_\- ]+(.+)$/i);
    if (!m) continue;
    const axis = m[1].toLowerCase();
    let name = m[2].trim().replace(/\s+/g, " ");
    name = name
      .split(" ")
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s))
      .join(" ");
    const key = `${axis}_${name}`;
    if (ARCH_DUAL_ALLOWED.has(key)) out[key] = Number(v) || 0;
  }
  return out;
}
function onlyAllowedTotals(t = {}) {
  const out = {};
  for (const [k, v] of Object.entries(t || {})) {
    if (ARCH_DUAL_ALLOWED.has(k)) out[k] = Number(v) || 0;
  }
  return out;
}
function labelsForTotals(totals = {}, rawLabels = {}) {
  const out = {};
  for (const k of Object.keys(totals || {})) {
    if (rawLabels[k]) out[k] = rawLabels[k];
    else out[k] = k.replace(/^.*?_/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }
  return out;
}

/* ---------- Text pagination ---------- */
function splitIntoPages(raw = "", target = 1000) {
  const text = String(raw || "").trim();
  if (!text) return [];
  const paras = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  const pages = [];
  let buf = "";
  for (const p of paras) {
    // if adding this paragraph makes it too long, flush the buffer as a page
    if ((buf + (buf ? "\n\n" : "") + p).length > target && buf) {
      pages.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) pages.push(buf);

  // If any single paragraph is still very long, soft-break it
  const softened = [];
  for (const page of pages) {
    if (page.length <= target * 1.75) {
      softened.push(page);
      continue;
    }
    const sentences = page.split(/(?<=[.!?])\s+/);
    let cur = "";
    for (const s of sentences) {
      if ((cur + " " + s).trim().length > target && cur) {
        softened.push(cur.trim());
        cur = s;
      } else {
        cur = (cur ? cur + " " : "") + s;
      }
    }
    if (cur) softened.push(cur.trim());
  }
  return softened;
}

/* =======================================================================
   ResultModal
   Props: open, onClose, slug, attempt, userId
   ======================================================================= */
export default function ResultModal({ open, onClose, slug, attempt, userId }) {
  const shellRef = useRef(null);

  // Active attempt shown in the right column + chart
  const [activeAttempt, setActiveAttempt] = useState(attempt || null);
  // All attempts for this quiz (newest → oldest) to allow switching
  const [past, setPast] = useState([]);
  const [loadingPast, setLoadingPast] = useState(false);

  // When modal opens or attempt prop changes, seed state
  useEffect(() => {
    if (!open) return;
    setActiveAttempt(attempt || null);
  }, [open, attempt]);

  // Fetch past attempts for this user + slug (used for switching)
  useEffect(() => {
    let alive = true;
    if (!open || !userId || !slug) return;

    (async () => {
      setLoadingPast(true);
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_slug, result_title, result_key, result_summary, result_body, result_text, result_totals, meta, completed_at, created_at")
        .eq("user_id", userId)
        .eq("quiz_slug", slug)
        .order("completed_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (!alive) return;
      if (!error && Array.isArray(data)) {
        setPast(data);
        // If no seed attempt, pick the newest
        if (!activeAttempt && data.length) setActiveAttempt(data[0]);
      }
      setLoadingPast(false);
    })();

    return () => { alive = false; };
  }, [open, userId, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on ESC / click outside content
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") onClose?.(); }
    function onClick(e) {
      const s = shellRef.current;
      if (!s) return;
      if (e.target === s) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  /* ---------- Build chart props from activeAttempt ---------- */
  const chartConfig = useMemo(() => {
    const a = activeAttempt;
    if (!a) return null;

    const slugLocal = a.quiz_slug || slug || "";
    const isDual = slugLocal === "archetype-dual" || slugLocal === "archetype_dual";
    const isPref = slugLocal === "archetype-preference" || slugLocal === "archetype_preference";
    const isArchetype = isDual || isPref;

    const rawTotals = a.result_totals || {};
    let migrated;
    if (isArchetype) {
      const flattened = flattenArchetypeDualTotals(rawTotals);
      const sanitized = sanitizeArchetypeDualTotals(flattened);
      migrated = onlyAllowedTotals(sanitized);
    } else {
      migrated = migrateTotals(slugLocal, rawTotals) || {};
    }

    const rawLabels =
      (labelsMap[slugLocal] && Object.keys(labelsMap[slugLocal]).length
        ? labelsMap[slugLocal]
        : (isArchetype ? ARCH_DUAL_LABELS : {})) || {};

    const metaMax = a?.meta?.max_raw || null;
    const hasWeightedShape = !!metaMax && typeof metaMax === "object" && !isArchetype;

    const totalsRawForChart = hasWeightedShape ? migrated : undefined;
    const maxRawForChart    = hasWeightedShape ? (migrateTotals(slugLocal, metaMax) || {}) : undefined;

    const numericTotals = Object.fromEntries(
      Object.entries(migrated).filter(([, v]) => Number.isFinite(Number(v)))
    );

    const totalsForChart = hasWeightedShape
      ? {}
      : (isArchetype
          ? numericTotals
          : scaleTotals(numericTotals, rawLabels, 10));

    const labelsForChart = hasWeightedShape
      ? labelsForTotals(totalsRawForChart, rawLabels)
      : labelsForTotals(totalsForChart, rawLabels);

    const dynamicMax = isArchetype
      ? Math.max(10, ...Object.values(totalsForChart || {}).map(Number), 10)
      : 10;

    const friendlyTitle =
      labelsMap?.[slugLocal]?.title ||
      slugLocal.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

    return {
      title: friendlyTitle,
      totals: hasWeightedShape ? undefined : totalsForChart,
      totalsRaw: hasWeightedShape ? totalsRawForChart : undefined,
      maxRaw: hasWeightedShape ? maxRawForChart : undefined,
      labels: labelsForChart,
      maxValue: dynamicMax,
    };
  }, [activeAttempt, slug]);

  /* ---------- Narrative pagination ---------- */
  const pages = useMemo(() => {
    if (!activeAttempt) return [];
    const text =
      activeAttempt.result_body ||
      activeAttempt.result_text ||
      activeAttempt.result_long ||
      activeAttempt.result_summary ||
      "";
    return splitIntoPages(text, 1100);
  }, [activeAttempt]);

  const [pageIdx, setPageIdx] = useState(0);
  useEffect(() => { setPageIdx(0); }, [activeAttempt?.id]);

  if (!open) return null;

  return (
    <div ref={shellRef} className="modal" style={{ zIndex: 1001 }}>
      <div className="modalInner">
        {/* Header */}
        <div className="glass-header" style={{ padding: "12px 16px" }}>
          <h2 style={{ margin: 0 }}>
            {chartConfig?.title || (activeAttempt?.result_title || "Result")}
          </h2>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>

        {/* Body */}
        <div className="modalBody" style={{ gap: 16 }}>
          {/* Left: chart */}
          <div>
            <div className="surface" style={{ padding: 12 }}>
              {chartConfig ? (
                <QuizRadarChart
                  title="Your distribution"
                  subtitle={`From ${chartConfig.title}`}
                  mode="percent"
                  totals={chartConfig.totals}
                  totalsRaw={chartConfig.totalsRaw}
                  maxRaw={chartConfig.maxRaw}
                  labels={chartConfig.labels}
                  maxValue={chartConfig.maxValue}
                  height={360}
                  width={360}
                  allowDownload={true}
                />
              ) : (
                <div style={{ padding: 16, opacity: 0.7 }}>Loading chart…</div>
              )}
            </div>
          </div>

          {/* Right: narrative + pager + past attempts */}
          <div>
            <div className="surface" style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Past results</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className="btn btn-action"
                    onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
                    disabled={pageIdx <= 0 || pages.length <= 1}
                    aria-label="Previous page"
                  >
                    ← Prev
                  </button>
                  <div className="pill">Result {pages.length ? (pageIdx + 1) : 0} / {pages.length || 0}</div>
                  <button
                    className="btn btn-action"
                    onClick={() => setPageIdx((i) => Math.min((pages.length - 1), i + 1))}
                    disabled={pageIdx >= pages.length - 1 || pages.length <= 1}
                    aria-label="Next page"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <div
                className="prose"
                style={{
                  background: "color-mix(in srgb, var(--c-surface-2) 85%, #000 15%)",
                  border: "1px solid var(--c-border-subtle)",
                  borderRadius: 12,
                  padding: 16,
                  minHeight: 240,
                  lineHeight: 1.75,
                }}
              >
                {pages.length ? (
                  pages[pageIdx].split(/\n{2,}/).map((p, i) => <p key={i} style={{ margin: "0 0 12px" }}>{p}</p>)
                ) : (
                  <div style={{ opacity: 0.8 }}>No narrative for this result yet.</div>
                )}
              </div>

              {/* Past attempts list (switcher) */}
              <div style={{ marginTop: 14, borderTop: "1px solid var(--c-border-subtle)", paddingTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, opacity: .9 }}>Previous attempts</div>
                {loadingPast ? (
                  <div style={{ opacity: .8 }}>Loading…</div>
                ) : !past.length ? (
                  <div style={{ opacity: .7 }}>No prior results yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {past.map((r) => (
                      <button
                        key={r.id}
                        className="btn btn--ghost"
                        style={{
                          textAlign: "left",
                          justifyContent: "flex-start",
                          borderRadius: 10,
                          border: "1px solid var(--c-border-subtle)",
                          padding: "10px 12px",
                          background: activeAttempt?.id === r.id
                            ? "color-mix(in srgb, var(--c-gold) 12%, transparent)"
                            : "transparent",
                        }}
                        onClick={() => setActiveAttempt(r)}
                        aria-current={activeAttempt?.id === r.id ? "true" : undefined}
                      >
                        <div style={{ display: "grid" }}>
                          <strong style={{ lineHeight: 1.25 }}>
                            {r.result_title || r.result_key || chartConfig?.title || "Result"}
                          </strong>
                          <small style={{ opacity: .75 }}>
                            {new Date(r.completed_at || r.created_at || Date.now()).toLocaleDateString()}
                          </small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
