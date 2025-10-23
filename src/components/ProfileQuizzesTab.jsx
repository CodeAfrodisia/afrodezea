// src/components/ProfileQuizzesTab.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@lib/supabaseClient.js";
import QuizRadarChart from "@components/quizzes/QuizRadarChart.jsx";
import ResultCard from "@components/quizzes/ResultCard.jsx";
import { labelsMap } from "@components/quizzes/labels.js";
import { remapTotalsKeys as migrateTotals } from "@components/quizzes/normalizeTotals.js";
import { normalizeTotals as scaleTotals } from "@lib/quizMath.js";
import { useAuth } from "@context/AuthContext.jsx";
import ResultModal from "@components/quizzes/ResultModal.jsx"; // modal

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */

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

const ARCH_DUAL_LABELS = {
  role_Navigator: "Navigator", role_Protector: "Protector", role_Architect: "Architect",
  role_Guardian: "Guardian",  role_Artisan: "Artisan",     role_Catalyst: "Catalyst",
  role_Nurturer: "Nurturer",  role_Herald: "Herald",       role_Seeker: "Seeker",
  energy_Muse: "Muse", energy_Sage: "Sage", energy_Visionary: "Visionary",
  energy_Healer: "Healer", energy_Warrior: "Warrior", energy_Creator: "Creator",
  energy_Lover: "Lover", energy_Magician: "Magician", energy_Rebel: "Rebel",
  energy_Caregiver: "Caregiver", energy_Sovereign: "Sovereign", energy_Jester: "Jester",
};

const ARCH_DUAL_ALLOWED = new Set([
  "role_Navigator","role_Protector","role_Architect","role_Guardian","role_Artisan",
  "role_Catalyst","role_Nurturer","role_Herald","role_Seeker",
  "energy_Muse","energy_Sage","energy_Visionary","energy_Healer","energy_Warrior",
  "energy_Creator","energy_Lover","energy_Magician","energy_Rebel","energy_Caregiver",
  "energy_Sovereign","energy_Jester",
]);

function onlyAllowedTotals(t = {}) {
  const out = {};
  for (const [k, v] of Object.entries(t || {})) {
    if (ARCH_DUAL_ALLOWED.has(k)) out[k] = Number(v) || 0;
  }
  return out;
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

function topOfPrefix(t = {}, prefix) {
  let best = null, bestV = -Infinity;
  for (const [k, v] of Object.entries(t)) {
    if (!k.startsWith(prefix)) continue;
    const n = Number(v) || 0;
    if (n > bestV) { bestV = n; best = k; }
  }
  return best ? (ARCH_DUAL_LABELS[best] || best) : null;
}

function labelsForTotals(totals = {}, rawLabels = {}) {
  const out = {};
  for (const k of Object.keys(totals || {})) {
    if (rawLabels[k]) out[k] = rawLabels[k];
    else out[k] = k.replace(/^.*?_/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }
  return out;
}

/* Soul helpers */
function stableKey(label = "", hash = "") {
  const k = (hash || label || "").toLowerCase().trim();
  return k || null;
}

/** Title helper to normalize headings (no pairings) */
function titleForSlug(slug = "") {
  const s = String(slug).toLowerCase();
  if (s === "archetype" || s === "archetype-dual" || s === "archetype_dual") return "Archetype";
  if (s === "archetype-preference" || s === "archetype_preference") return "Archetype Preference";
  return (labelsMap?.[slug]?.title) ||
         s.replace(/[-_]/g, " ").replace(/\b\w/g, m => m.toUpperCase());
}

/* ────────────────────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────────────────────── */

export function ProfileQuizzesTab({ userId, mode = "percent" }) {
  const navigate = useNavigate();

  const { user } = useAuth();
  const resolvedUserId = userId || user?.id || null;

  const [attempts, setAttempts] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const inFlightRef = useRef(false);
  const loadedForUserRef = useRef(null);
  const [soulPeopleState, setSoulPeopleState] = useState([]);

  // Sorting for Soul list
  const [soulSort, setSoulSort] = useState("newest"); // 'newest' | 'az' | 'za'
  const subjectHashRef = useRef("");

  // Delete state (soul attempts)
  const [deletingId, setDeletingId] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // { slug, attempt }
  const closeModal = () => setModal(null);



  async function handleDeleteSoulAttempt(id) {
    if (!id) return;
    if (!window.confirm("Delete this saved result? This cannot be undone.")) return;
    try {
      setDeletingId(id);
      const { error } = await supabase.from("quiz_attempts").delete().eq("id", id);
      if (error) throw error;
      setSoulPeopleState(list => list.filter(p => p.id !== id));
    } catch (e) {
      alert(e?.message || "Could not delete.");
    } finally {
      setDeletingId(null);
    }
  }

  const cacheKey = resolvedUserId ? `quiz_attempts_cache:${resolvedUserId}` : null;

  const hydrateFromCache = useCallback(() => {
    if (!cacheKey) return false;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setAttempts(parsed);
        return true;
      }
    } catch {}
    return false;
  }, [cacheKey]);

  const persistCache = useCallback((list) => {
    if (!cacheKey) return;
    try { sessionStorage.setItem(cacheKey, JSON.stringify(list || [])); } catch {}
  }, [cacheKey]);

  const fetchLatest = useCallback(async (uid) => {
    if (!uid) return { latestBySlug: [], soulPeople: [] };

    const { data: viewData, error: viewErr } = await supabase
      .from("quiz_attempts_latest")
      .select("quiz_slug,result_key,result_title,result_summary,result_totals,meta,completed_at,created_at")
      .eq("user_id", uid);

    let latestBySlug = [];
    if (!viewErr && Array.isArray(viewData) && viewData.length) {
      latestBySlug = viewData;
    } else {
      const { data: raw, error } = await supabase
        .from("quiz_attempts")
        .select("quiz_slug,result_key,result_title,result_summary,result_totals,meta,completed_at,created_at")
        .eq("user_id", uid)
        .order("completed_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      const bySlug = {};
      for (const r of raw || []) if (!bySlug[r.quiz_slug]) bySlug[r.quiz_slug] = r;
      latestBySlug = Object.values(bySlug);
    }

    // Soul-connection list
    const { data: soulRows, error: soulErr } = await supabase
      .from("quiz_attempts")
      .select("id,quiz_slug,result_key,result_title,completed_at,subject_label,subject_hash,meta")
      .eq("user_id", uid)
      .in("quiz_slug", ["soul-connection", "soul_connection", "soulconnection"])
      .order("completed_at", { ascending: false })
      .limit(300);

    if (soulErr) return { latestBySlug, soulPeople: [] };

    const seen = new Set();
    const soulPeople = [];
    for (const row of soulRows || []) {
      const label = (row.subject_label || row.meta?.subject_label || "").trim();
      const hash  = (row.subject_hash  || row.meta?.subject_hash  || "").trim().toLowerCase();
      const dedupeKey = (hash || label || String(row.id)).toLowerCase();
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      soulPeople.push({
        id: row.id,
        label: label || "(Unnamed)",
        hash: hash || null,
        result: row.result_title || row.result_key || "—",
        when: row.completed_at,
      });
    }

    return { latestBySlug, soulPeople };
  }, []);

  useEffect(() => {
    if (!resolvedUserId) return;
    if (loadedForUserRef.current === resolvedUserId) return;
    if (inFlightRef.current) return;

    hydrateFromCache();

    inFlightRef.current = true;
    setErr("");
    setLoading(true);

    fetchLatest(resolvedUserId)
      .then(({ latestBySlug, soulPeople }) => {
        const next = Array.isArray(latestBySlug) ? latestBySlug : [];
        setAttempts(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        setSoulPeopleState(soulPeople || []);

        persistCache(next);
        loadedForUserRef.current = resolvedUserId;
      })
      .catch((e) => setErr(e?.message || "Could not load your quiz results."))
      .finally(() => {
        inFlightRef.current = false;
        setLoading(false);
      });
  }, [resolvedUserId, fetchLatest, hydrateFromCache, persistCache]);

  /* Sorted soul list */
  const sortedSoul = useMemo(() => {
    const list = [...(soulPeopleState || [])];
    if (soulSort === "az") return list.sort((a,b) => (a.label || "").localeCompare(b.label || "", undefined, { sensitivity: "base" }));
    if (soulSort === "za") return list.sort((a,b) => (b.label || "").localeCompare(a.label || "", undefined, { sensitivity: "base" }));
    return list.sort((a,b) => new Date(b.when) - new Date(a.when));
  }, [soulSort, soulPeopleState]);

  /* Cards */
  const cards = useMemo(() => {
    return (attempts || []).map((a) => {
      const slug = a.quiz_slug;
      const isArchetypeDual = slug === "archetype-dual" || slug === "archetype_dual";
      const isArchetypePreference = slug === "archetype-preference" || slug === "archetype_preference";
      const isSoul = slug === "soul-connection";

      const rawTotals = a.result_totals || {};
      const rawKeysCount = Object.keys(rawTotals || {}).length;

      let migrated;
      if (isArchetypeDual || isArchetypePreference) {
        const flattened = flattenArchetypeDualTotals(rawTotals);
        const sanitized = sanitizeArchetypeDualTotals(flattened);
        migrated = onlyAllowedTotals(sanitized);
      } else {
        migrated = migrateTotals(slug, rawTotals) || {};
      }

      const rawLabels =
        (labelsMap[slug] && Object.keys(labelsMap[slug]).length
          ? labelsMap[slug]
          : (isArchetypeDual || isArchetypePreference ? ARCH_DUAL_LABELS : {})) || {};

      const metaMax = a?.meta?.max_raw || null;
      const hasWeightedShape =
        !!metaMax && typeof metaMax === "object" && !isArchetypeDual && !isArchetypePreference;

      const totalsRawForChart = hasWeightedShape ? migrated : undefined;
      const maxRawForChart    = hasWeightedShape ? (migrateTotals(slug, metaMax) || {}) : undefined;

      const numericTotals = Object.fromEntries(
        Object.entries(migrated).filter(([, v]) => Number.isFinite(Number(v)))
      );

      const totalsForChart = hasWeightedShape
        ? {}
        : (isArchetypeDual || isArchetypePreference
            ? numericTotals
            : scaleTotals(numericTotals, rawLabels, 10));

      const labelsForChart = hasWeightedShape
        ? labelsForTotals(totalsRawForChart, rawLabels)
        : labelsForTotals(totalsForChart, rawLabels);

      const dynamicMax =
        (isArchetypeDual || isArchetypePreference)
          ? Math.max(10, ...Object.values(totalsForChart || {}).map(Number), 10)
          : 10;

      const isVector = rawKeysCount > 1;

      const topRole   = (isArchetypeDual || isArchetypePreference) ? topOfPrefix(totalsForChart, "role_")   : null;
      const topEnergy = (isArchetypeDual || isArchetypePreference) ? topOfPrefix(totalsForChart, "energy_") : null;
      const topPair   = (topRole && topEnergy) ? `${topRole} × ${topEnergy}` : null;

      const willHaveRows =
        (totalsRawForChart && Object.keys(totalsRawForChart).length > 0) ||
        (!hasWeightedShape && Object.keys(totalsForChart || {}).length > 0);

      return {
        attempt: a,
        slug,
        labels: labelsForChart,
        totals: isSoul ? {} : totalsForChart,    // no radar for Soul
        totalsRaw: isSoul ? undefined : totalsRawForChart,
        maxRaw: isSoul ? undefined : maxRawForChart,
        maxValue: isSoul ? 10 : dynamicMax,
        isVector,
        isArchetypeDual: isArchetypeDual || isArchetypePreference,
        isWeighted: hasWeightedShape,
        topPair,
        willHaveRows: isSoul ? true : willHaveRows,
        isSoul,
        soulPeople: isSoul ? sortedSoul : [],
      };
    });
  }, [attempts, sortedSoul]);

  /* ---- Derived list for charts + soul card ---- */
const vectorCards = useMemo(
  () => cards.filter(c => c.isVector || c.isSoul),
  [cards]
);

/* ---- Pagination (persistent + resilient) ---- */
const pageSize = 3;

// key depends on who is viewing
const pageKey = useMemo(
  () => (resolvedUserId ? `profile_quizzes_page:${resolvedUserId}` : "profile_quizzes_page:anon"),
  [resolvedUserId]
);

// seed from sessionStorage once
const [page, setPage] = useState(() => {
  const n = Number(sessionStorage.getItem(pageKey));
  return Number.isFinite(n) && n > 0 ? n : 1;
});

// persist whenever page changes
useEffect(() => {
  try { sessionStorage.setItem(pageKey, String(page)); } catch {}
}, [page, pageKey]);

// compute pages from current cards
const totalPages = Math.max(1, Math.ceil(vectorCards.length / pageSize));

// Guard against transient empties on visibility change or re-fetch
const prevLenRef = useRef(vectorCards.length);
useEffect(() => {
  const len = vectorCards.length;
  prevLenRef.current = len;
  if (len === 0) return; // don't clamp on momentary empties

  const maxPage = Math.max(1, Math.ceil(len / pageSize));
  if (page > maxPage) setPage(maxPage);
  // intentionally not depending on `page`
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [vectorCards.length]);

// slice the items for the current page
const clampedPage = Math.min(page, totalPages);
const firstIdx = (clampedPage - 1) * pageSize;
const pageItems = useMemo(
  () => vectorCards.slice(firstIdx, firstIdx + pageSize),
  [vectorCards, firstIdx]
);


  // ---- Pagination bits above stay the same ----
/* const totalPages = Math.max(1, Math.ceil(vectorCards.length / pageSize));

// Guard against transient empties on tab visibility changes
const prevLenRef = useRef(vectorCards.length);
 */
useEffect(() => {
  const len = vectorCards.length;
  const prevLen = prevLenRef.current;
  prevLenRef.current = len;

  // If list is momentarily empty (or smaller) during re-hydration, don't clamp yet.
  if (len === 0) return;

  const maxPage = Math.max(1, Math.ceil(len / pageSize));

  // Only clamp downward when the new max is truly smaller than before
  // AND the current page is out of range.
  if (page > maxPage) {
    setPage(maxPage);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [vectorCards.length]); // intentionally not depending on `page` to avoid a redundant cycle


  /* Early returns */
  if (err) {
    return <div className="surface" style={{ padding: 16 }}>{err}</div>;
  }
  if (loading && attempts.length === 0) {
    return <div className="surface" style={{ padding: 16 }}>Loading quiz results…</div>;
  }
  if (!loading && attempts.length === 0) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        No quiz results yet. Take a quiz to see your profile fill in.
      </div>
    );
  }

  /* Main render */
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {vectorCards.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(3, minmax(280px, 1fr))",
            }}
          >
            {pageItems.map(({ attempt, slug, labels, totals, totalsRaw, maxRaw, maxValue, topPair, isArchetypeDual, isSoul, soulPeople }) => {
  const friendlyTitle = titleForSlug(slug);

  // ✅ Keep this — it decides whether to draw weighted radar vs. normalized
  const weighted = Boolean(
    totalsRaw && maxRaw &&
    Object.keys(totalsRaw).length > 0 &&
    Object.keys(maxRaw).length > 0
  );

  // More stable key than just `slug`
  const uniqueKey =
    `${slug}:${attempt?.completed_at || attempt?.created_at || attempt?.id || attempt?.result_key || "v1"}`;

  return (
    <div key={uniqueKey} style={{ display: "grid", gap: 12 }}>
                  {isSoul ? (
                    <div className="surface" style={{ padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontWeight: 700 }}>{friendlyTitle}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <label style={{ fontSize: 12, opacity: 0.7 }}>Sort:</label>
                          <select
                            className="input"
                            value={soulSort}
                            onChange={(e) => setSoulSort(e.target.value)}
                            style={{ padding: "4px 8px" }}
                          >
                            <option value="newest">Newest</option>
                            <option value="az">A → Z</option>
                            <option value="za">Z → A</option>
                          </select>
                        </div>
                      </div>

                      {(!soulPeople || soulPeople.length === 0) ? (
                        <div style={{ opacity: .75 }}>
                          No saved people yet. Take the Soul-Connection quiz and enter a name.
                        </div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {soulPeople.map((p) => (
                            <div
                              key={p.id}
                              className="surface"
                              style={{ padding: 10, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                            >
                              <div>
                                <div style={{ fontWeight: 700 }}>{p.label}</div>
                                <div style={{ opacity: .9 }}>{p.result}</div>
                                <div style={{ opacity: .6, fontSize: 12 }}>
                                  {p.when ? new Date(p.when).toLocaleDateString() : ""}
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="btn btn--ghost"
                                  onClick={() => navigate(
                                    `/quiz/soul-connection?subject_label=${encodeURIComponent(p.label || "")}${
                                      p.hash ? `&subject_hash=${encodeURIComponent(p.hash)}` : ""
                                    }`
                                  )}
                                  title={`Retake for ${p.label}`}
                                >
                                  Retake
                                </button>
                                <button
                                  className="btn btn--ghost"
                                  onClick={() => handleDeleteSoulAttempt(p.id)}
                                  disabled={deletingId === p.id}
                                  title={`Delete ${p.label}`}
                                >
                                  {deletingId === p.id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Small header row with a dedicated "View Details" button */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {/* IMPORTANT: no pairing in the title */}
                        <div style={{ fontWeight: 700 }}>{friendlyTitle}</div>
                        <button
                          className="btn btn--ghost"
                          onClick={() => setModal({ slug, attempt })}
                          title="Open detailed results"
                        >
                          View Details
                        </button>
                      </div>

                      <QuizRadarChart
                        title={friendlyTitle}
                        mode="percent"
                        totals={weighted ? undefined : totals}
                        totalsRaw={weighted ? totalsRaw : undefined}
                        maxRaw={weighted ? maxRaw : undefined}
                        labels={labels}
                        maxValue={maxValue}
                        height={360}
                        width={360}
                        onOpenModal={() => setModal({ slug, attempt })}
                      />
                    </>
                  )}

                  <ResultCard
                    attempt={attempt}
                    quizTitle={friendlyTitle}
                    className="result-card-gold"
                  />
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              className="btn btn-action"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              ← Prev
            </button>

            <div className="pill" aria-live="polite" style={{ padding: "6px 12px" }}>
              Page {page} / {totalPages}
            </div>

            <button
              className="btn btn-action"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </>
      )}

      {/* Non-vector attempts (no radar) */}
      {attempts.some((a) => {
        const keys = Object.keys(a?.result_totals || {});
        return keys.length <= 1;
      }) && (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          {attempts
            .filter((a) => Object.keys(a?.result_totals || {}).length <= 1)
            .sort(
              (a, b) =>
                new Date(b.completed_at || b.created_at) -
                new Date(a.completed_at || a.created_at)
            )
            .map((a, i) => {
              const friendlyTitle = titleForSlug(a.quiz_slug);
              return (
                <div key={`${a.quiz_slug}-${i}`} className="result-card-gold">
                  <ResultCard attempt={a} quizTitle={friendlyTitle} />
                </div>
              );
            })}
        </div>
      )}

      {/* SHARED RESULT MODAL */}
      {modal && (
        <ResultModal
          open={!!modal}
          onClose={closeModal}
          slug={modal.slug}
          attempt={modal.attempt}
          userId={resolvedUserId}
        />
      )}
    </div>
  );
}

export default React.memo(ProfileQuizzesTab);
