// AccountDashboardShell.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useCallback,
  useRef,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import { useTheme } from "@lib/useTheme.jsx";
import { supabase } from "@lib/supabaseClient.js";
import WelcomeMessage from "@components/account/WelcomeMessage.jsx";
import DailyAffirmation from "@components/account/DailyAffirmation.jsx";
import { InsightProvider } from "@components/account/InsightContextProvider.jsx";
import InsightDisplay from "@components/account/InsightDisplay.jsx";
import BreathCard from "@components/account/BreathCard.jsx";
import QuizzesHub from "@components/quizzes/QuizzesHub.jsx";
import { useAuth } from "@context/AuthContext.jsx";
import { generateAnalysis } from "@lib/analysisClient.js";
import TodayTab from "@components/account/TodayTab.jsx";
import HeroWelcomeAffirmation from "@components/account/HeroWelcomeAffirmation.jsx";
import TodayRow from "@components/account/TodayRow.jsx";
import {
  getTodaysAffirmation,
  regenerateAffirmation,
} from "@lib/affirmations.js";

import Tab_PersonalizedInsights from "@components/account/InsightsTab.jsx";
import SoulProfileContainer from "@components/account/SoulProfileContainer.jsx";
import ProfileQuizzesTab from "@components/ProfileQuizzesTab.jsx";

import { sbSafe, ensureSessionFresh } from "@lib/sbSafe";
import useCachedEdge from "@lib/hooks/useCachedEdge.js";
import { loveProfileToHtml } from "@lib/loveProfileToHtml.js";

// Lazy tabs
const AchievementsAndStatsTabs = React.lazy(() =>
  import("@components/achievements/AchievementsAndStatsTabs.jsx").then(
    (m) => ({ default: m.default ?? m.AchievementsStatsTabs })
  )
);
import useSignalsVersion from "@lib/hooks/useSignalsVersion.js";
import { partitionQuizzesIntoPages } from "@lib/insightPaging.js";
import useMoodInsight from "@lib/hooks/useMoodInsight.js";

import ListsHub from "@components/lists/ListsHub.jsx";
import CalendarTab from "@components/account/CalendarTab.jsx";
import DashboardTour from "@components/tour/DashboardTour.jsx";
import TourTarget from "@components/tour/TourTarget.jsx";
import { useTourMode } from "@lib/hooks/useTourMode.js";



// --- KPI helpers (top of file) ---
const metricColStyle = { textAlign: "center" };
const labelStyle     = { marginBottom: 6, opacity: 0.9 };
const valueStyle     = { fontWeight: 700, color: "var(--c-head)", fontSize: "clamp(18px, 2.6vw, 28px)" };
const subStyle       = { opacity: 0.85, marginTop: 2, textTransform: "capitalize" }; // we’re capitalizing content in render
const ruleRowStyle   = { display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr", gap: 12, paddingBottom: 14 };
const ruleRowMood    = { display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr auto 1fr", gap: 12, paddingBottom: 14 };

const RuleGold = () => <hr className="rule-gold" />;
const RuleGoldV = () => <div className="rule-gold-vertical" />;
/* 
const g = (typeof globalThis !== 'undefined' ? globalThis : window);
console.log('[sb instance app/Shell] tag =', supabase && supabase.__probe);
console.log('[sb instance app/Shell] sameRef =', (supabase && g.__sb_ref) ? (supabase === g.__sb_ref) : null); */


/* ────────────────────────── Tiny primitives ────────────────────────── */
function TabsBar({ value, onChange, items, right, className = "", sticky = true }) {
  return (
    <div
      className={`ui-tabs tabsbar ${className}`.trim()}
      style={sticky ? { position: "sticky", top: 0, zIndex: 10 } : undefined}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {items.map((t) => {
          const selected = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              className="ui-tabs__btn tabbtn"
              aria-selected={selected}
              onClick={() => onChange(t.value)}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="ui-tabs__actions" style={{ marginLeft: "auto" }}>
        {right ?? null}
      </div>
    </div>
  );
}

/* ─ Convert generate-insights JSON → HTML for right panel ─ */
function insightsToHtml(insights) {
  if (!insights || typeof insights !== "object") return "<div>—</div>";

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // allow legacy markdown that might still come back
  function mdToInlineHtml(s = "") {
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
    return s;
  }
  function sanitizeInline(html) {
    if (!html) return "";
    let out = esc(html);
    out = mdToInlineHtml(out);
    return out;
  }
  const startCaseInline = (s = "") =>
    s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

  const renderSource = (src) =>
    src ? `<div class="insight-source" style="opacity:.7;font-size:.9em;margin-top:4px">${esc(src)}</div>` : "";

  const renderDomain = (key, d) => {
    if (!d) return "";
    const title = String(key || "").trim();
    const strength = esc(d.strength ?? "");
    const shadow = esc(d.shadow ?? "");
    const stress = sanitizeInline(d.stress ?? ""); // plain text expected now; sanitize anyway
    const micro = d.micro_practice
      ? { minutes: Number(d.micro_practice.minutes ?? 0) || "", text: esc(d.micro_practice.text ?? "") }
      : null;
    const partner = esc(d.partner_script ?? "");
    const deep = d.deep_link ? `<div style="margin-top:6px;opacity:.9">${esc(d.deep_link)}</div>` : "";
    const src = renderSource(d.source);

    return `
      <section class="insight-domain">
        <h4 style="margin:0;text-transform:capitalize">${esc(title)}</h4>
        ${strength ? `<p><strong>Strength:</strong> ${strength}</p>` : ""}
        ${shadow ? `<p><strong>Shadow:</strong> ${shadow}</p>` : ""}
        ${stress ? `<p>${stress}</p>` : ""}
        ${micro ? `<p><strong>Micro-practice (~${micro.minutes} min):</strong> ${micro.text}</p>` : ""}
        ${partner ? `<p><strong>Partner script:</strong> ${partner}</p>` : ""}
        ${deep}
        ${src}
      </section>
    `;
  };

  const arche = insights.archetype || {};
  const domains = insights.domains || {};
  const weaving = insights.weaving || {};
  const inserts = Array.isArray(insights.inserts) ? insights.inserts : [];

  const parts = [];

  // Archetype block
  if (arche.title || arche.ribbon || arche.source) {
    parts.push(`
      <section class="insight-archetype" style="padding:12px">
        ${arche.title ? `<strong>${esc(arche.title)}</strong>` : ""}
        ${arche.ribbon ? `<p style="margin:6px 0">${esc(arche.ribbon)}</p>` : ""}
        ${renderSource(arche.source)}
      </section>
    `);
  }

  // Domains
  for (const k of ["giving", "receiving", "apology", "forgiveness", "attachment"]) {
    parts.push(renderDomain(k, domains[k]));
  }

  // Weaving
  if (weaving && (weaving.principles || weaving.experiment_7day || weaving.notes || weaving.source)) {
    parts.push(`
      <section class="insight-weaving" style="padding:12px">
        <h4 style="margin:0">Weaving the threads</h4>
        ${
          Array.isArray(weaving.principles) && weaving.principles.length
            ? `<ul>${weaving.principles.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
            : ""
        }
        ${
          Array.isArray(weaving.experiment_7day) && weaving.experiment_7day.length
            ? `<div style="margin-top:6px"><strong>7-day experiment:</strong><ul>${weaving.experiment_7day
                .map((p) => `<li>${esc(p)}</li>`)
                .join("")}</ul></div>`
            : ""
        }
        ${
          Array.isArray(weaving.notes) && weaving.notes.length
            ? `<div style="margin-top:6px;opacity:.9">${weaving.notes.map((n) => `<div>${esc(n)}</div>`).join("")}</div>`
            : ""
        }
        ${renderSource(weaving.source)}
      </section>
    `);
  }

  // Personalized notes (NEW): prefer top-level personalized_notes, fallback to inserts
  const notes = [];
  if (Array.isArray(insights.personalized_notes)) {
    for (const n of insights.personalized_notes) {
      if (typeof n === "string" && n.trim()) notes.push(n.trim());
    }
  }
  // Back-compat: fold inserts in as notes
  if (inserts.length) {
    for (const it of inserts) {
      if (!it) continue;
      if (typeof it === "string" && it.trim()) {
        notes.push(it.trim());
      } else if (typeof it === "object" && typeof it.text === "string") {
        const label = it.domain ? `${startCaseInline(String(it.domain))}: ` : "";
        notes.push(`${label}${it.text.trim()}`);
      }
    }
  }

  if (notes.length) {
    parts.push(`
      <section class="insight-notes" style="padding:12px">
        <h4 style="margin:0">Personalized notes</h4>
        <ul>${notes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </section>
    `);
  }

  return `<div class="insights-wrap" style="display:grid;gap:12px">${parts.join("")}</div>`;
}


function ViewportPanel({ children }) {
  return (
    <div style={{ height: "calc(100vh - 220px)", overflow: "auto", padding: 16, boxSizing: "border-box" }}>
      {children}
    </div>
  );
}
function Split({ left, right }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: 16,
        alignItems: "stretch",     // 👈 make both grid items the same row height
      }}
    >
      <div style={{ height: "100%" }}>{left}</div>    {/* 👈 fill row height */}
      <div className="surface-1" style={{ padding: 16, borderRadius: 16, height: "100%" }}>
        {right}
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  const theme = useTheme();
  return (
    <div
      className="surface"
      style={{
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${theme?.border || "var(--hairline)"}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
function KPI({ label, value, sub, variant = "surface-2" }) {
  return (
    <div className={variant} style={{ display: "grid", gap: 6, minWidth: 180, padding: 16, borderRadius: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value ?? "—"}</div>
      {sub ? <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div> : null}
    </div>
  );
}
function batteryLabel(avg) {
  if (avg == null) return "—";
  if (avg >= 2.5) return "Mostly High";
  if (avg >= 1.5) return "Mostly Medium";
  return "Mostly Low";
}

/* ────────────────────────── Data helpers ────────────────────────── */
async function loadProfileBasics() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id || null;
  if (!userId) return { userId: null };

  console.log('[sb instance app]', supabase.__probe);


  const { data: profile } = await sbSafe(
    () =>
      supabase
        .from("profiles")
        .select("user_id, handle, display_name, bio, avatar_url")
        .eq("user_id", userId)
        .maybeSingle(),
    { label: "profiles.select" }
  );

  return {
    userId,
    username: profile?.display_name ?? null,
    archetype: null,
    streak: 0,
    lastMood: null,
    loveLanguage: null,
  };
}

// put near other small helpers
const isSoftADI = (x) => {
  if (!x || typeof x !== "object") return true;
  // our real generations always add .sources
  if (!x.sources) return true;
  const r = String(x.ribbon || "").toLowerCase();
  return r.includes("preparing your archetype insight");
};


async function loadKpis(userId) {
  if (!userId) {
    return {
      avgBattery: null,
      dominantLove: null,
      dominantNeed: null,
      needDays: 0,
      dominantMood: null,
      moodDays: 0,
      checkins: 0,
      lastMood: null,
    };
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rows } = await sbSafe(
    () =>
      supabase
        .from("moods")
        .select("created_at, social_battery, love_language, mood, need")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false }),
    { label: "moods.select" }
  );

  if (!rows?.length) {
    return {
      avgBattery: null,
      dominantLove: null,
      dominantNeed: null,
      needDays: 0,
      dominantMood: null,
      moodDays: 0,
      checkins: 0,
      lastMood: null,
    };
  }

  // latest record per day
  const latestByDay = {};
  for (const r of rows) {
    const k = new Date(r.created_at).toISOString().slice(0, 10);
    if (!latestByDay[k]) latestByDay[k] = r;
  }
  const deduped = Object.values(latestByDay);

  // battery avg (1..3)
  const map = { low: 1, medium: 2, high: 3 };
  const batteries = deduped
    .map((d) => map[(d.social_battery || "").toLowerCase()])
    .filter(Boolean);
  const avgBattery = batteries.length
    ? +(batteries.reduce((a, b) => a + b, 0) / batteries.length).toFixed(1)
    : null;

  // dominant love language
  const loveCounts = {};
  for (const d of deduped) {
    if (d.love_language) loveCounts[d.love_language] = (loveCounts[d.love_language] || 0) + 1;
  }
  let dominantLove = null, loveMax = 0;
  for (const [k, v] of Object.entries(loveCounts)) {
    if (v > loveMax) { dominantLove = k; loveMax = v; }
  }

  // dominant need (normalized lower-case)
  const needCounts = {};
  for (const d of deduped) {
    const n = String(d.need || "").trim().toLowerCase();
    if (n) needCounts[n] = (needCounts[n] || 0) + 1;
  }
  let dominantNeed = null, needMax = 0;
  for (const [k, v] of Object.entries(needCounts)) {
    if (v > needMax) { dominantNeed = k; needMax = v; }
  }

  // dominant mood (normalized lower-case)
  const moodCounts = {};
  for (const d of deduped) {
    const m = String(d.mood || "").trim().toLowerCase();
    if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
  }
  let dominantMood = null, moodMax = 0;
  for (const [k, v] of Object.entries(moodCounts)) {
    if (v > moodMax) { dominantMood = k; moodMax = v; }
  }

  const lastMood = rows[0]?.mood ?? null;

  return {
    avgBattery,
    dominantLove,
    dominantNeed,   // e.g., "focus"
    needDays: needMax || 0,
    dominantMood,   // e.g., "grateful"
    moodDays: moodMax || 0,
    checkins: deduped.length,
    lastMood,
  };
}


const RECEIVING_SLUGS = ["love-language-receiving", "love_language_receiving", "love-language"];
const GIVING_SLUGS = ["love-language-giving", "love_language_giving"];
const APOLOGY_SLUGS = ["apology-style", "apology_language", "apology-language", "apology", "repair-style", "repair_apology"];
const FORGIVENESS_SLUGS = ["forgiveness-language", "forgiveness_language", "forgiveness", "repair-forgiver", "repair_forgiver"];
const ATTACHMENT_SLUGS = ["attachment-style", "attachment_style", "attachment"];

function pickLatest(obj, slugList) {
  for (const s of slugList) if (obj[s]) return obj[s];
  return null;
}


// Binds window.runProfileDiag() once so you can trigger a full profiles SELECT/UPSERT check
function useBindProfilesDiag() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.runProfileDiag = async function runProfileDiag() {
      const supa = window.supabase; // shared client from supabaseClient.js
      const start = Date.now();
      const t = (label, extra = {}) =>
        console.log(`[app-profiles diag] ${label}`, { t: Date.now() - start, ...extra });

      try {
        t("begin");
        const { data: s1, error: e1 } = await supa.auth.getSession();
        if (e1) throw e1;
        const uid = s1?.session?.user?.id;
        t("session", { hasSession: !!s1?.session, uid });

        // SELECT (may be null first time)
        const { data: sel, error: selErr } = await supa
          .from("profiles")
          .select("user_id,handle")
          .eq("user_id", uid)
          .maybeSingle();
        t("select", { ok: !selErr, row: sel || null, err: selErr?.message || null });

        // UPSERT (should succeed if RLS is correct)
        const handle = "debug_" + Math.random().toString(36).slice(2, 6);
        const { data: up, error: upErr } = await supa
          .from("profiles")
          .upsert({ user_id: uid, handle }, { onConflict: "user_id" })
          .select("user_id,handle")
          .maybeSingle();
        t("upsert", { ok: !upErr, row: up || null, err: upErr?.message || null });

        t("done");
      } catch (err) {
        t("caught", { message: err?.message || String(err) });
      }
    };
  }, []);
}

// Tiny debug button that only shows when auth is ready with a user (hidden in prod)
function DebugProfilesDiagButton() {
  const { ready, user } = useAuth();
   console.log('[DebugProfilesDiagButton] render', { ready, hasUser: !!user, prod: import.meta.env.PROD });
  if (!ready || !user) return null;
  if (import.meta.env.PROD) return null;
  console.log('import.meta.env.VITE_SUPABASE_ANON_KEY')

  return (
    <button
      onClick={() => window.runProfileDiag?.()}
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 9999,
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #999",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      Run Profiles Diag
    </button>
  );
}



/* ────────────────────────── Main ────────────────────────── */
export default function AccountDashboardShell() {
  const theme = useTheme();
  const { user, ready, sessions } = useAuth();
  const shellLoading = !ready; // the ONLY top-level loading flag

  const navigate = useNavigate();

  
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [archetype, setArchetype] = useState(null);
  const [streak, setStreak] = useState(0);
  const [kpi, setKpi] = useState({
  avgBattery: null,
  dominantLove: null,
  dominantNeed: null,
  needDays: 0,
  dominantMood: null,
  moodDays: 0,
  checkins: 0,
  lastMood: null, // keep if you use it elsewhere (not shown)
});





  const [handle, setHandle] = useState(null);

  const [affirmationText, setAffirmationText] = useState("");
  const [affirmationLoading, setAffirmationLoading] = useState(false);

  const [checkinStep, setCheckinStep] = useState(1);
  const [checkinSessionId, setCheckinSessionId] = useState(0);

  const [loveTab, setLoveTab] = useState("self");
  const [loveQuizzes, setLoveQuizzes] = useState({});
  const [fatal, setFatal] = useState(null);

  const [bundle, setBundle] = useState({ overview_html: "", modals: {}, used_inputs_banner: "" });
  const [activeModal, setActiveModal] = useState(null);

  // (Right rail content pieces)
  const [insightsHtml, setInsightsHtml] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");

  const [tab, setTab] = useState("today"); // today | achv | profile | quizzes | settings
  const [pTab, setPTab] = useState("mood"); // mood | love | archetype | quizzes
  // getters (stable references not required for this usage)
  const getTab = () => tab;
  const getPTab = () => pTab;

  // Archetype DB-first fast-path (optional pre-hydrate)
  const [adiFast, setAdiFast] = useState(null);
  const [adiFastTried, setAdiFastTried] = useState(false);

// Inline check-in visibility
const [showCheckin, setShowCheckin] = useState(false);

const devNoCache = useMemo(() => /(?:\?|&)nocache=1\b/.test(location.search), []);


const [welcome, setWelcome] = useState(null);
const [welcomeLoading, setWelcomeLoading] = useState(false);
const [welcomeError, setWelcomeError] = useState("");

const [lovePage, setLovePage] = React.useState(1);
const [quizPage, setQuizPage] = React.useState(1);

// Pagination state for right-column insights
const [pageMood, setPageMood] = useState(1);
const [pageLove, setPageLove] = useState(1);
const [pageArch, setPageArch] = useState(1);
const [pageQuizzes, setPageQuizzes] = useState(1);


 // pin the in-app diagnostic function on window
  useBindProfilesDiag();

console.log("[Shell render gates]", {
  ready,
  userId,
  shellLoading,
  tab,
  pTab,
});




const g = (typeof globalThis !== 'undefined' ? globalThis : window);
console.log('[Shell/useAuth] ready=', ready, 'userId=', user?.id || null, 'clientTag=', supabase && supabase.__probe, 'sameRef=', !!(supabase && g.__sb_ref && supabase === g.__sb_ref));


// add this line temporarily somewhere near the top-level of AccountDashboardShell:
useEffect(()=>{ console.log({fatal, userId}); }, [fatal, userId]);


/* useEffect(() => {
  let alive = true;
  (async () => {
    // if AuthContext already has a user, don’t do anything here
    if (user?.id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;
      if (session?.user?.id && !userId) setUserId(session.user.id);
    } catch (e) {
      console.warn('[shell bootstrap] getSession err', e);
    } finally {
      if (alive && loading) setLoading(false);
    }
  })();
  return () => { alive = false; };
}, []); // ← leave this with empty deps, but prefer removing it entirely */


// Auth → Shell userId sync; no global spinner control here
useEffect(() => {
  if (!ready) return;               // only run once AuthContext hydrated
  if (!user?.id) {
    setUserId(null);
    return;                         // do NOT toggle setLoading here
  }
  if (userId !== user.id) setUserId(user.id);
}, [ready, user?.id]);              // (don’t include `loading` in deps)



useEffect(() => {
  const sp  = new URLSearchParams(window.location.search);
  const t   = sp.get("tab");
  const p   = sp.get("ptab");
  const foc = sp.get("focus");

  // only set if different to avoid needless renders
  if (t && t !== tab) setTab(t);
  if (p && p !== pTab) setPTab(p);

  if (foc === "insights") {
    setTimeout(() => {
      document
        .querySelector('[data-anchor="quiz-insights"]')
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
  // run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); 




useEffect(() => {
  // Reset to first page whenever tab changes so users always start at the top
  if (pTab === "mood") setPageMood(1);
  if (pTab === "love") setPageLove(1);
  if (pTab === "archetype") setPageArch(1);
  if (pTab === "quizzes") setPageQuizzes(1);
}, [pTab]);


// reset page when switching tabs so we always start at 1
React.useEffect(() => {
  if (pTab === "love") setLovePage(1);
  if (pTab === "quizzes") setQuizPage(1);
}, [pTab]);



// stable date key for today
const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

// Build the new data payload (until GPT wiring lands, we hydrate with what we have)
const welcomeData = useMemo(() => ({
  welcome: {
    greeting: username ? `Welcome back, ${username}` : "Welcome back, love.",
    // Leave lines empty to let the component show your legacy supportive message,
    // or put a single line here if you want it to appear instead:
    // lines: ["Your space is ready."],
    nudge: { kind: "none" }, // "breath" | "product" | "gift" | "none"
  },
  affirmation: {
    id: `aff:${todayStr}`,     // any stable id is fine
    text: affirmationText || "", // falls back to legacy prop inside the component
    tone: "warm",
  },
  provenance: { cached: !devNoCache, date: todayStr },
}), [username, affirmationText, todayStr, devNoCache]);



const breathRef = useRef(null);


// --- utils for section-aware pagination (keep whole sections when possible)
function stripTags(s = "") {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlToSections(html) {
  if (!html || typeof html !== "string") return [];
  // ✅ trim only whitespace between tags, not between a tag and text
const normalized = html
  .replace(/\s+</g, "<")             // trim space before tags
  .replace(/>\s+(?=<)/g, ">");       // trim only when the *next* char is a "<"

  const parts = normalized
    .split(/(?=<h[2-4][^>]*>)/i)
    .map(s => s.trim())
    .filter(Boolean);

  const sections = parts.map((block, i) => {
    const m = block.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i);
    const title = m ? stripTags(m[1]) : (i === 0 ? "Overview" : `Section ${i+1}`);
    const words = stripTags(block).split(/\s+/).filter(Boolean).length;
    return { title, html: block, words };
  });

  if (!sections.length) {
    const words = stripTags(normalized).split(/\s+/).filter(Boolean).length;
    return [{ title: "Overview", html: normalized, words }];
  }
  return sections;
}

function splitSectionByParagraphs(section, wordBudget = 280) {
  const paras = section.html
    .split(/(?=<p\b|<ul\b|<ol\b|<h[5-6]\b|<blockquote\b)/i)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  let cur = [];
  let curWords = 0;
  const w = (s) => stripTags(s).split(/\s+/).filter(Boolean).length;

  paras.forEach(p => {
    const pw = w(p);
    if ((curWords + pw) > wordBudget && cur.length) {
      chunks.push(cur.join(""));
      cur = [p];
      curWords = pw;
    } else {
      cur.push(p);
      curWords += pw;
    }
  });
  if (cur.length) chunks.push(cur.join(""));

  return chunks.map((html, i) => ({
    title: i === 0 ? section.title : `${section.title} (cont.)`,
    html,
    words: w(html),
  }));
}

function buildPagesFromSections(
  sections,
  { wordBudget = 280, maxSectionsPerPage = 2 } = {}
) {
  const pages = [];
  let cur = [];
  let used = 0;

  const pushPage = () => {
    if (cur.length) { pages.push(cur); cur = []; used = 0; }
  };

  sections.forEach(sec => {
    const fitsWords = (used + sec.words) <= wordBudget;
    const fitsCount = cur.length < maxSectionsPerPage;

    if (sec.words > wordBudget) {
      // Too big → split by paragraphs, then pack
      const minis = splitSectionByParagraphs(sec, wordBudget);
      minis.forEach(ms => {
        const fitsW = (used + ms.words) <= wordBudget;
        const fitsC = cur.length < maxSectionsPerPage;
        if (!(fitsW && fitsC) && cur.length) pushPage();
        cur.push(ms); used += ms.words;
      });
      return;
    }

    if (!(fitsWords && fitsCount) && cur.length) pushPage();
    cur.push(sec); used += sec.words;
  });

  pushPage();
  return pages; // Array<Array<section>>
}



function SectionsPage({ pageSections }) {
  const combined = pageSections.map(s => s.html).join("");
  return (
    <div
      className="dossier-render"
      dangerouslySetInnerHTML={{ __html: combined }}
    />
  );
}






const handleStartBreath = useCallback((variant) => {
  console.log("[welcome CTA] start breath:", variant); // wire to your breath modal
  // variant will be "box" or "4-7-8" from the welcome nudge
  const norm = (v) => (v === '4-7-8' ? '478' : 'box');
breathRef.current?.start(norm(variant));
}, []);

// Optional CTA handlers (you can swap these to your real modals later)


const handleOpenProductQuickBuy = React.useCallback((p) => {
  // Quick, safe default: route to PDP with a query that your PDP can use to open a modal
  if (p?.slug) navigate(`/product/${p.slug}?quick=1`);
}, [navigate]);

const handleRedeemGift = React.useCallback((gift) => {
  console.log("[welcome CTA] redeem gift:", gift);
  // open your gift modal or route where you handle redemptions
}, []);

const handleSaveAffirmation = React.useCallback(async (text, id) => {
  if (!user?.id || !text) return;
  await sbSafe(
    () => supabase.from("affirmations_saved").insert({
      user_id: user.id,
      affirmation_id: id ?? null,
      text,
    }),
    { label: "affirmations_saved.insert" }
  );
  // toast is optional; if you have one wired:
  // toast.success("Affirmation saved");
}, [user?.id]);







 const fetchWelcome = useCallback(async ({ force = false } = {}) => {
  if (!userId) return;
  setWelcomeLoading(true);
  setWelcomeError("");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await supabase.functions.invoke("welcome-message", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: { user_id: userId, force: force ? 1 : 0 }, // body field is optional; auth header is enough
    });
    if (resp.error) throw new Error(resp.error.message || "welcome-message failed");
    setWelcome(resp.data?.welcome ?? null); // edge returns { welcome, cached }
  } catch (e) {
    setWelcomeError(String(e?.message || e));
  } finally {
    setWelcomeLoading(false);
  }
}, [userId]);




/* useEffect(() => {
  let alive = true;
  (async () => {
    if (!userId) return;
    try {
      const ok = await ensureSessionFresh();
      if (!ok) { setFatal("Your session expired. Please sign in again."); return; }

      const res = devNoCache
        ? await regenerateAffirmation(userId) // force new text in dev
        : await getTodaysAffirmation(userId); // normal cached path

      if (alive) setAffirmationText(res.text);
    } catch {}
  })();
  return () => { alive = false; };
}, [userId, devNoCache]); */







  useEffect(() => {
  let alive = true;
  (async () => {
    if (!userId || pTab !== "archetype") return;
    try {
      const { data } = await supabase
        .from("user_insights_latest")
        .select("archetype_deep_data, payload, updated_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!alive) return;
      const cached =
        data?.archetype_deep_data ??
        data?.payload?.archetype_deep?.data ??
        data?.payload?.archetype_deep ??
        null;

      setAdiFast(cached);
      setAdiFastTried(true);
    } catch {
      if (alive) setAdiFastTried(true);
    }
  })();
  return () => { alive = false; };
}, [userId, pTab]);






// 1) Stored daily mood insight (RPC-backed, stable)
const {
  loading: moodRPCLoading,
  error:   moodRPCError,
  text:    moodRPCText,
  refresh: refreshMoodRPC,
} = useMoodInsight(userId);

// Track if we've already persisted this session (prevents repeated posts)
const moodPersistedRef = React.useRef(false);

// ✅ Only fetch from Edge when:
// - we have a user
// - we're on the Mood tab
// - the RPC read has finished (not loading)
// - the RPC read did NOT error
// - the RPC returned no text
// - we haven't already persisted during this session
const wantsEdge =
  !!userId &&
  pTab === "mood" &&
  !moodRPCLoading &&
  !moodRPCError &&
  !moodRPCText &&
  !moodPersistedRef.current;

// 2) Edge analysis (now properly gated)
const {
  data:    moodEdge,
  loading: moodEdgeLoading,
  error:   moodEdgeError,
  refresh: refreshMoodEdge,
} = useCachedEdge(
  "profile-analysis",
  wantsEdge ? { user_id: userId, section: "mood" } : null,
  { enabled: wantsEdge }
);

// Persist only when we truly have no stored text, the RPC read didn't error, and Edge produced something
useEffect(() => {
  if (!userId) return;
  if (moodRPCText) return;            // we already have stored text
  if (moodPersistedRef.current) return; // prevent duplicate writes within this session

  const edgeText =
    moodEdge?.summary ||
    moodEdge?.text ||
    moodEdge?.analysis?.summary ||
    moodEdge?.analysis?.mood?.summary ||
    "";

  if (!edgeText) return;

  (async () => {
    try {
      console.debug("[mood persist] calling set_mood_insight_text", { userId });
      await supabase.rpc("set_mood_insight_text", { p_user: userId, p_text: edgeText });
      moodPersistedRef.current = true;
      // optional: pull the saved row immediately
      refreshMoodRPC?.();
    } catch (e) {
      const code = e?.code || "";
      const msg = String(e?.message || "");
      // Postgres unique violation (23505) often surfaces as HTTP 409 via PostgREST.
      if (code === "23505" || /409\b/.test(msg)) {
        console.debug("[mood persist] concurrent write; treating as success");
        moodPersistedRef.current = true;
        refreshMoodRPC?.();
        return;
      }
      console.warn("[RPC set_mood_insight_text] failed", e);
    }
  })();
}, [userId, moodRPCText, moodEdge, refreshMoodRPC]);









const effectiveText =
  moodRPCText ||
  moodEdge?.summary ||
  moodEdge?.text ||
  moodEdge?.analysis?.summary ||
  moodEdge?.analysis?.mood?.summary ||
  "";

const effectiveLoading = moodRPCLoading || (!moodRPCText && moodEdgeLoading);
const effectiveError   = moodRPCError   || (!moodRPCText && moodEdgeError);


// keep old prop usages working
const refreshMood = refreshMoodEdge || (() => {});


  // Love profile
  const {
    data: loveProfile,
    loading: loveLoading,
    error: loveError,
    refresh: refreshLove,
  } = useCachedEdge(
    "love-profile",
    userId && pTab === "love" ? { user_id: userId } : null,
    {
      key: userId ? `love:${userId}:v1` : "love:anon",
      staleMs: 24 * 60 * 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnVisible: false,
      enabled: !!userId && pTab === "love",
    fetcherInit: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
    },
  }
);

// ── Archetype Deep Insights (peek DB first; only POST if needed)
const wantArchetype = !!userId && pTab === "archetype";

// keep using your existing DB-fast peek (adiFast / adiFastTried)
// …


// Always allow a background refresh when on Archetype tab
 const [adiForceNonce, setAdiForceNonce] = useState(0);

// Always prepare a body when you're on the Archetype tab
const archPayload = useMemo(
  () =>
    userId && pTab === "archetype"
      ? { user_id: userId, include_journals: false, days: 30, force: adiForceNonce > 0 }
      : null,
  [userId, pTab, adiForceNonce]
);

// Key MUST include the nonce so the hook treats it as a new fetch
const archKey = useMemo(
  () => (userId ? `adi:${userId}:30d:v3-s1:${adiForceNonce}` : "adi:anon"),
  [userId, adiForceNonce]
);

// optional: client-side guard so we POST only once per signature/key
const postedRef = useRef(false);




function MostFrequentNeed({ userId }) {
  const [need, setNeed] = React.useState(null);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from("moods")
        .select("need, created_at")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      if (!alive) return;

      // latest per day only
      const byDay = new Map();
      (data || []).forEach(r => {
        const k = new Date(r.created_at).toISOString().slice(0,10);
        if (!byDay.has(k)) byDay.set(k, r);
      });

      const freq = {};
      Array.from(byDay.values()).forEach(r => {
        const n = String(r.need || "").trim();
        if (!n) return;
        freq[n] = (freq[n] || 0) + 1;
      });

      let top = null, max = 0;
      Object.entries(freq).forEach(([k,v]) => { if (v > max) { top = k; max = v; } });
      setNeed(top);
      setCount(max);
    })();
    return () => { alive = false; };
  }, [userId]);

  return (
    <div className="surface-2" style={{ display:"grid", gap:6, padding:16, borderRadius:12 }}>
      <div className="kpi label" style={{ marginBottom: 2 }}>Most Frequent Need (30d)</div>
      <div style={{ fontWeight:700, fontSize:18 }}>{need || "—"}</div>
      {need ? <div className="kpi-sub" style={{ opacity:.85 }}>{count} day{count===1?"":"s"}</div> : null}
    </div>
  );
}





// log once when we *intend* to POST
useEffect(() => {
  if (archPayload && !postedRef.current) {
    console.log("[ADI POST payload]", archPayload);
  }
}, [archPayload]);

/* const archPayload =
  userId && pTab === "archetype"
    ? { user_id: userId, include_journals: false, days: 30 }
    : null; */
    

const {
  data: archDeep,
  loading: archDeepLoading,
  error: archDeepError,
  refresh: refreshArchDeep,
} = useCachedEdge("archetype-deep-insights", archPayload, {
  enabled: !!archPayload,
  key: archKey,
  staleMs: 0,
  timeoutMs: 60000,
  revalidateOnFocus: false,
  revalidateOnVisible: false,
  fetcherInit: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
        "Content-Type": "application/json",       // 👈 required so req.json() works
        "Accept": "application/json",
      },
    };
  },
});

// Split a long HTML string into multiple pages.
// - Prefer splitting at <h2>/<h3>/<h4>; otherwise chunk by ~maxChars.
// - Returns an array of HTML strings (safe to render with dangerouslySetInnerHTML,
//   exactly like you were already doing).
// ---- simple HTML paginator (same one we used for Archetype) ----
function paginateHtml(html = "", {
  // keep each page roughly the height of the right rail; tune as needed
  MAX_CHARS = 1800,
  MAX_BLOCKS = 14, // count of paragraphs/list items/headings per page
} = {}) {
  if (!html) return [[]];

  // split on natural "reading blocks"
  const blocks = html
    .split(/(?=<\/p>|<\/li>|<\/h[1-6]>|<br\s*\/?>)/ig)
    .map(s => s.trim())
    .filter(Boolean);

  const pages = [];
  let page = [];
  let charCount = 0;

  for (const b of blocks) {
    const nextLen = charCount + b.length;
    const nextBlocks = page.length + 1;
    if ((nextLen > MAX_CHARS || nextBlocks > MAX_BLOCKS) && page.length) {
      pages.push(page);
      page = [];
      charCount = 0;
    }
    page.push(b);
    charCount += b.length;
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}

function PagedHtml({ html, page, onPageChange, maxChars = 1800, maxBlocks = 14 }) {
  const pages = React.useMemo(
    () => paginateHtml(html, { MAX_CHARS: maxChars, MAX_BLOCKS: maxBlocks }),
    [html, maxChars, maxBlocks]
  );
  const p = Math.min(Math.max(1, page), pages.length);
  return (
    <>
      <div
        className="dossier-render"
        // no scroll; we page instead
        style={{ overflow: "hidden" }}
        dangerouslySetInnerHTML={{ __html: pages[p - 1]?.join("") || "" }}
      />
      {pages.length > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button className="btn btn--ghost" disabled={p <= 1} onClick={() => onPageChange(p - 1)}>← Prev</button>
          <span style={{ alignSelf: "center", opacity: .8 }}>Page {p} / {pages.length}</span>
          <button className="btn btn--ghost" disabled={p >= pages.length} onClick={() => onPageChange(p + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}

// ---------- helpers (put these near the component top, once) ----------
function stripHtml(s = "") {
  return String(s || "").replace(/<script[\s\S]*?<\/script>/gi, "")
                        .replace(/<style[\s\S]*?<\/style>/gi, "")
                        .replace(/<!--[\s\S]*?-->/g, "")
                        .trim();
}

// Very simple paragraph splitter that preserves basic <p>/<li>/<br> blocks.
function toParas(html = "") {
  const clean = stripHtml(html);
  if (!clean) return [];
  // Split on paragraphs / list items / double breaks; keep tags so we can rejoin as HTML.
  const parts = clean
    .split(/(?:<\/p>|<\/li>|<br\s*\/?>\s*<br\s*\/?>)/i)
    .map(x => x.replace(/^\s*<p[^>]*>/i, "")
               .replace(/^\s*<li[^>]*>/i, "")
               .trim())
    .filter(Boolean);
  return parts;
}

// Turn paragraphs into ~equal pages based on a character target
function paginateParas(paras, targetChars = 1600, minFirstPage = 600) {
  const pages = [];
  let cur = [];
  let count = 0;

  const push = () => {
    if (!cur.length) return;
    pages.push(cur.join("\n\n"));
    cur = [];
    count = 0;
  };

  paras.forEach((p, idx) => {
    const need = pages.length === 0 ? Math.max(minFirstPage, targetChars) : targetChars;
    if (count && (count + p.length) > need) {
      push();
    }
    cur.push(p);
    count += p.length;
    // If last item, flush
    if (idx === paras.length - 1) push();
  });

  // Safety: never return empty
  return pages.length ? pages : [""];
}

// Generic renderer with centered pager
function PagedInsight({ html, page, setPage, targetChars, minFirstPage }) {
  const paras = toParas(html || "");
  const pages = paginateParas(paras, targetChars, minFirstPage);
  const pcount = pages.length;
  const clamped = Math.min(Math.max(page, 1), pcount);

  useEffect(() => {
    if (page !== clamped) setPage(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pcount]);

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight: 380 }}>
      <div
        className="dossier-render"
        style={{ flex: 1 }}
        dangerouslySetInnerHTML={{ __html: pages[clamped - 1] }}
      />
      {pcount > 1 && (
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop: 12 }}>
          <button
            className="btn btn--ghost"
            onClick={() => setPage(Math.max(1, clamped - 1))}
            disabled={clamped <= 1}
          >
            ← Prev
          </button>
          <span style={{ alignSelf:"center", opacity:.75 }}>
            Page {clamped} / {pcount}
          </span>
          <button
            className="btn btn--ghost"
            onClick={() => setPage(Math.min(pcount, clamped + 1))}
            disabled={clamped >= pcount}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}




// unify deep-insight source into one value the whole component can use
const adiCombined = useMemo(() => {
  // prefer direct insights from the Edge call; fall back to the peek
  const raw = archDeep?.insights ?? archDeep ?? adiFast ?? null;

  // unwrap legacy shape: { data, signature, at } → data
  const unwrapped = raw && typeof raw === "object" && "data" in raw && !("ribbon" in raw)
    ? raw.data
    : raw;

  if (!unwrapped || typeof unwrapped !== "object" || isSoftADI(unwrapped)) return null;

  // light client-side guard so the renderer never breaks on sparse output
  return {
    ribbon: unwrapped.ribbon ?? null,
    portrait: Array.isArray(unwrapped.portrait)
      ? unwrapped.portrait
      : (unwrapped.portrait ? [String(unwrapped.portrait)] : []),
    compatibility: unwrapped.compatibility && typeof unwrapped.compatibility === "object"
      ? unwrapped.compatibility
      : null,
    conflict: unwrapped.conflict && typeof unwrapped.conflict === "object"
      ? unwrapped.conflict
      : null,
    self_care: unwrapped.self_care && typeof unwrapped.self_care === "object"
      ? unwrapped.self_care
      : null,
    patterns: Array.isArray(unwrapped.patterns) ? unwrapped.patterns : [],
    sources: unwrapped.sources ?? null,
  };
}, [archDeep, adiFast]);



useEffect(() => {
  if (archPayload && wantArchetype && adiFastTried && !adiFast) {
    console.log("[ADI POST payload]", archPayload);
  }
}, [archPayload, wantArchetype, adiFastTried, adiFast]);

const signalsVersion = useSignalsVersion(userId);

  // Quizzes → generate-insights (JSON) — cached, gated, no auto revalidate
const {
  data: gi,
  loading: giLoading,
  error: giError,
  isFetching: giFetching,
  refresh: refreshInsights,
} = useCachedEdge(
  "generate-insights",
  userId && pTab === "quizzes"
    ? {
        user_id: userId,
        domains: ["giving","receiving","apology","forgiveness","attachment","weaving"],
        signals_hint: signalsVersion,      // <— extra field (server ignores), busts client cache deterministically
      }
    : null,
  {
    enabled: !!userId && pTab === "quizzes",
    revalidateOnMount: true,              // <— safe to keep on; cheap if server cache hits
    revalidateOnFocus: false,
    revalidateOnVisible: false,
    timeoutMs: 60_000,
    staleMs: 0,                           // <— since key changes when signalsVersion changes, no need to keep TTL
    minIntervalMs: 2_000,
    storage: "local",
    key: `generate-insights:v4:${userId}:${signalsVersion}`, // <— key tied to signalsVersion
  fetcherInit: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ""}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };
    },
  }
);
// 🔝 put these near your other effects (top-level in AccountDashboardShell)
useEffect(() => {
  console.log("[ADI] archPayload enabled?", !!archPayload);
  console.log("[ADI] archPayload value:", archPayload);
}, [archPayload]);

useEffect(() => {
  if (archDeepLoading) console.log("[ADI] loading…");
  if (archDeepError)   console.error("[ADI] error:", archDeepError);
  if (archDeep)        console.log("[ADI] data:", archDeep);
}, [archDeepLoading, archDeepError, archDeep]);

useEffect(() => {
  console.log("[ADI] gates", {
    hasUser: !!userId,
    pTab,
    adiFastTried,
    hasAdiFast: !!adiFast,
  });
}, [userId, pTab, adiFastTried, adiFast]);


// optional: single retry if the very first call timed out
useEffect(() => {
  if (!/timed out/i.test(giError || "")) return;
  const t = setTimeout(() => refreshInsights(), 8_000);
  return () => clearTimeout(t);
}, [giError, refreshInsights]);



  const refreshLoveRef = useRef(refreshLove);
  const refreshArchDeepRef = useRef(refreshArchDeep);
  useEffect(() => {
    refreshLoveRef.current = refreshLove;
  }, [refreshLove]);
  useEffect(() => {
    refreshArchDeepRef.current = refreshArchDeep;
  }, [refreshArchDeep]);

  useEffect(() => {
    if (pTab === "archetype" && archDeep) {
      console.log("[archDeep]", archDeep);
    }
  }, [archDeep, pTab]);

  // Remove the manual generate-insights effect (was duplicating calls)

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      supabase.getChannels().forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  // Initial bootstrap replacement
  useEffect(() => {
  let live = true;
  (async () => {
    if (!userId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session — please sign in again.");

      const basics = await loadProfileBasics();
      if (!live) return;
      setUsername(basics.username);
      setArchetype(basics.archetype);
      setStreak(basics.streak ?? 0);

      const [nextKpi, lq] = await Promise.all([
        loadKpis(userId),
        loadLoveQuizzes(userId),
      ]);
      if (!live) return;
      setKpi(nextKpi);
      setLoveQuizzes(lq);
    } catch (e) {
      if (live) setFatal(e?.message || "Something went wrong.");
    }
  })();
  return () => { live = false; };
}, [userId]);



const quizzesHtml = useMemo(
  () => insightsToHtml(gi?.insights || gi || {}),
  [gi]
);
const quizzesPages = useMemo(
  () => partitionQuizzesIntoPages(quizzesHtml, { maxWeight: 14 }), // tweak 12–16 to fit your “no scroll” goal
  [quizzesHtml]
);
const totalQ = quizzesPages.length;
const currentQ = quizzesPages[pageQuizzes - 1];

  useEffect(() => {
  if (!userId) return;
  let alive = true;
  (async () => {
    await fetchWelcome({ force: false });
  })();
  return () => { alive = false; };
}, [userId, fetchWelcome]);



  function onOpenModal(slug) {
    if (bundle?.modals?.[slug]) setActiveModal(slug);
  }
  function onCloseModal() {
    setActiveModal(null);
  }

  /* useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      try {
        const ok = await ensureSessionFresh();
        if (!ok) {
          setFatal("Your session expired. Please sign in again.");
          return;
        }
        const { text } = await getTodaysAffirmation(userId);
        if (alive) setAffirmationText(text);
      } catch (e) {
        // non-fatal
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]); */

 /*  useEffect(() => {
    async function onFocus() {
      if (fatal) {
        setFatal("");
        const ok = await ensureSessionFresh();
        if (!ok) {
          setFatal("Your session expired. Please sign in again.");
        }
      }
    }
    const vh = () => document.visibilityState === "visible" && onFocus();
    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", vh);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", vh);
    };
  }, [fatal]); */

  useEffect(() => {
    const id = setInterval(async () => {
      supabase.auth.getSession();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Live-refresh when quiz_attempts change
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`quiz_attempts:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_attempts", filter: `user_id=eq.${userId}` },
        async () => {
          try {
            const lq = await loadLoveQuizzes(userId);
            setLoveQuizzes(lq);
             if (pTab === "love") refreshLoveRef.current?.();
         if (pTab === "archetype") {
           // Invalidate the peek so the gated hook re-runs once
           setAdiFast(null);
         }
         if (pTab === "quizzes") refreshInsights?.();
          } catch {}
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, pTab, refreshInsights]);

/*   // DEV console helper
  useEffect(() => {
    window.__adiTest = async () => {
      const resp = await supabase.functions.invoke("archetype-deep-insights", {
        body: { user_id: userId, include_journals: false, days: 30 },
      });
      console.log("[__adiTest] full resp:", resp);
      return resp;
    };
  }, [userId]); */

useEffect(() => {
  (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // harmless ping, but with JWT so we see 200 instead of 401 in logs
    await supabase.functions
      .invoke("archetype-deep-insights", {
        method: "GET",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        // optional: you can pass query via body if your handler reads it
        body: { mode: "ping" },
      })
      .catch(() => {});
  })();
}, []);

  
useEffect(() => {
  if (pTab === "archetype") setPage(1);
}, [pTab]);


  // Live-refresh when moods change
useEffect(() => {
  if (!userId) return;
  const channel = supabase
    .channel(`moods:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "moods", filter: `user_id=eq.${userId}` },
      async () => {
        try {
          const nextKpi = await loadKpis(userId);
          setKpi(nextKpi);
          if (pTab === "mood") {
            refreshMoodRPC?.();  // 👈 use the RPC reader, not the Edge refresh
          }
        } catch {}
      }
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [userId, pTab, refreshMoodRPC]);


  useEffect(() => {
  if (process.env.NODE_ENV === "production") return;
  (async () => {
    try {
      const u = await supabase.auth.getUser();
      const s = await supabase.auth.getSession();
      console.log("[auth] user:", u?.data?.user?.id || null);
      console.log("[auth] session?", !!s?.data?.session, s?.data?.session?.expires_at);
    } catch (e) {
      console.log("[auth] diag error:", e?.message || e);
    }
  })();
}, []);




  /* ───────────────── Panels ───────────────── */
  const [today, setToday] = useState({
    responses: {
      mood: "",
      social_battery: "",
      love_language: "",
      need: "",
      follow_up: "",
      journal: "",
    },
    submissionStatus: "idle",
    isEditing: true,
    isReadOnlyView: false,
    selectedDate: new Date().toISOString(),
  });

  const [analysis, setAnalysis] = useState({ mood: "", love: "", archetype: "", quizzes: "" });
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const updateResponses = useCallback((next) => {
    setToday((s) => {
      const nextVal = typeof next === "function" ? next(s.responses) : next;
      if (nextVal === s.responses) return s;
      return { ...s, responses: nextVal };
    });
  }, []);
  const setEditingStable = useCallback((updater) => {
    setToday((s) => {
      const nextVal = typeof updater === "function" ? updater(s.isEditing) : updater;
      if (s.isEditing === nextVal) return s;
      return { ...s, isEditing: nextVal };
    });
  }, []);
  const setReadOnlyStable = useCallback((updater) => {
    setToday((s) => {
      const nextVal = typeof updater === "function" ? updater(s.isReadOnlyView) : updater;
      if (s.isReadOnlyView === nextVal) return s;
      return { ...s, isReadOnlyView: nextVal };
    });
  }, []);
  const setSelectedDateStable = useCallback((updater) => {
    setToday((s) => {
      const nextVal = typeof updater === "function" ? updater(s.selectedDate) : updater;
      if (s.selectedDate === nextVal) return s;
      return { ...s, selectedDate: nextVal };
    });
  }, []);
  const setSubmissionStatusStable = useCallback((updater) => {
    setToday((s) => {
      const nextVal = typeof updater === "function" ? updater(s.submissionStatus) : updater;
      if (s.submissionStatus === nextVal) return s;
      return { ...s, submissionStatus: nextVal };
    });
  }, []);
  const noopTab = useCallback(() => {}, []);
  const noopActive = useCallback(() => {}, []);
  const noopJournal = useCallback(() => {}, []);

  async function handleRegenerateAffirmation() {
    if (!userId) return;
    setAffirmationLoading(true);
    try {
      const { text } = await regenerateAffirmation(userId);
      setAffirmationText(text);
    } finally {
      setAffirmationLoading(false);
    }
  }
  async function handleTryAgain() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setFatal(null);
        return;
      }
      await supabase.auth.refreshSession();
      const {
        data: { session: s2 },
      } = await supabase.auth.getSession();
      if (s2) setFatal(null);
      else window.location.href = "/account?tab=settings";
    } catch {
      window.location.href = "/account?tab=settings";
    }
  }
  async function loadLoveQuizzes(userId) {
    if (!userId) return {};
    const RECEIVING_SLUGS = ["love-language-receiving", "love_language_receiving", "love-language"];
    const GIVING_SLUGS = ["love-language-giving", "love_language_giving"];
    const APOLOGY_SLUGS = ["apology-style", "apology_language", "apology-language", "apology", "repair-style", "repair_apology"];
    const FORGIVENESS_SLUGS = ["forgiveness-language", "forgiveness_language", "forgiveness", "repair-forgiver", "repair_forgiver"];
    const ATTACHMENT_SLUGS = ["attachment-style", "attachment_style", "attachment"];
    const ALL = [...RECEIVING_SLUGS, ...GIVING_SLUGS, ...APOLOGY_SLUGS, ...FORGIVENESS_SLUGS, ...ATTACHMENT_SLUGS];

    const { data, error } = await sbSafe(
      () =>
        supabase
          .from("quiz_attempts_latest")
          .select("quiz_slug, result_key, result_title, result_summary, result_totals, completed_at")
          .eq("user_id", userId)
          .in("quiz_slug", ALL)
          .order("completed_at", { ascending: false }),
      { label: "quiz_attempts_latest.love-set" }
    );

    if (error) {
      console.warn("[love quizzes] fallback to quiz_attempts due to error:", error);
      const { data: raw } = await supabase
        .from("quiz_attempts")
        .select("quiz_slug, result_key, result_title, result_summary, result_totals, completed_at")
        .eq("user_id", userId)
        .in("quiz_slug", ALL)
        .order("completed_at", { ascending: false });
      return Array.isArray(raw) ? indexBySlug(raw) : {};
    }

    return Array.isArray(data) ? indexBySlug(data) : {};

    function indexBySlug(rows) {
      const by = {};
      for (const r of rows) {
        if (!by[r.quiz_slug]) by[r.quiz_slug] = r;
      }
      return by;
    }
  }

  async function handleShareAffirmation() {
    try {
      if (!user?.id) return;
      console.info("[share affirmation] would publish:", affirmationText);
    } catch (e) {
      console.error("[share affirmation]", e);
    }
  }
  async function goToProfile() {
    try {
      if (!user?.id) return;
      let h = handle;
      if (!h) {
        const { data } = await supabase.from("profiles").select("handle").eq("user_id", user.id).maybeSingle();
        h = data?.handle || null;
      }
      if (h) navigate(`/u/${h}`);
      else navigate("/account?tab=settings");
    } catch (e) {
      navigate("/account?tab=settings");
    }
  }
  async function regenerate(topic) {
    if (!userId) return;
    setAnalysisLoading(true);
    try {
      const text = await generateAnalysis({ userId, topic });
      setAnalysis((prev) => ({ ...prev, [topic]: text }));
    } finally {
      setAnalysisLoading(false);
    }
  }
  const headline = useMemo(() => (username ? `Welcome back, ${username}` : "Welcome back"), [username]);
  const handleSetupProfile = useCallback(async () => {
    try {
      if (!user?.id) return;
      const base =
        (user.email?.split("@")[0] || "user").toLowerCase().replace(/[^a-z0-9._]/g, "_").slice(0, 24) || "user";
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, handle: base }, { onConflict: "id" })
        .select("handle")
        .single();
      if (error) {
        console.error("[profiles] upsert failed:", error);
        return;
      }
      setHandle(data?.handle || base);
    } catch (e) {
      console.warn("Failed to set up profile:", e);
    }
  }, [user?.id]);
  

  function startCase(s = "") {
    return s.replace(/[_-]+/g, " ").replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));
  }
// put this where RightPlate is defined
const RightPlate = ({ children, minHeight = 420 }) => (
  <section
    className="plate group--corners plate--charcoal"
    style={{
      position: "relative",
      padding: 16,
      borderRadius: 12,
      minHeight,
      height: "100%",           // 👈 fill the grid row height
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <span
      className="corners"
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
    {children}
  </section>
);



  

  /* ───────────────── Panels ───────────────── */
function TodayPanel() {
  return (
    <div style={{ display: "grid", gap: 26 }}>
      <div className="">
        <section
          className="plate group--halo group--corners"
          style={{ padding: 24, background: "#121212" }}
        >
          <HeroWelcomeAffirmation
            data={welcome ?? welcomeData} // ← prefer edge, fallback to local
            username={username}
            streak={streak}
            theme={theme}
            affirmation={welcome?.affirmation?.text || affirmationText} // ← lean on edge text
            onStartBreath={handleStartBreath}
            onOpenProductQuickBuy={handleOpenProductQuickBuy}
            onRedeemGift={handleRedeemGift}
            onSaveAffirmation={handleSaveAffirmation}
            layout="merged"
          />
          
        </section>
      </div>

      <div className="lane">
        <div className="gutter-grid">
          {/* Stable tour anchor for Step 2 */}
          <section
            className="plate group--halo group--corners"
            style={{ padding: 16, background: "#121212" }}
            data-tour="today-checkin"
          >
            <div className="section-title" style={{ marginBottom: 10 }} />
            {!showCheckin ? (
              <div
                style={{ display: "grid", gridTemplateRows: "auto 1fr", minHeight: 260 }}
              >
                <div style={{ textAlign: "center" }}>
                  <h2 style={{ margin: 0, marginBottom: 8, fontSize: 22 }}>Today</h2>
                  <p style={{ opacity: 0.85, margin: 0 }}>
                    Ready to check in for today? Log mood, notes, and reflections.
                  </p>
                  
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <button
                    className="btn btn-outline-gold"
                    onClick={() => {
                      setCheckinSessionId((n) => n + 1);
                      setShowCheckin(true);
                      setCheckinStep(1);
                      setSubmissionStatusStable("idle");
                      setEditingStable(true);
                      setReadOnlyStable(false);
                      updateResponses({
                        mood: "",
                        social_battery: "",
                        love_language: "",
                        need: "",
                        follow_up: "",
                        journal: "",
                        archetype: today.responses.archetype || "",
                      });
                      setSelectedDateStable(new Date().toISOString());
                    }}
                  >
                    Check in
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <h2 style={{ margin: 0 }}>Today</h2>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setShowCheckin(false);
                      setCheckinStep(1);
                    }}
                  >
                    Back
                  </button>
                </div>
                {/* The embedded flow sits inside the same tour anchor */}
                <TodayTab
                  key={checkinSessionId}
                  userId={userId}
                  step={checkinStep}
                  setStep={setCheckinStep}
                  currentTab="today"
                  setCurrentTab={() => {}}
                  responses={today.responses}
                  setResponses={updateResponses}
                  isEditing={today.isEditing}
                  setIsEditing={setEditingStable}
                  isReadOnlyView={today.isReadOnlyView}
                  setIsReadOnlyView={setReadOnlyStable}
                  selectedDate={today.selectedDate}
                  setSelectedDate={setSelectedDateStable}
                  setActiveTab={() => {}}
                  setJournalDetails={() => {}}
                  journalDetails={null}
                  activeTab="today"
                  hasManuallySetStep={false}
                  submissionStatus={today.submissionStatus}
                  setSubmissionStatus={setSubmissionStatusStable}
                  theme={theme}
                  variant="embedded"
                  title={null}
                  prefill={false}
                  onSaved={refreshMood}
                />
              </div>
            )}
          </section>

          <section
            className="plate group--halo group--corners"
            style={{ padding: 16, background: "#121212" }}
          >
            <BreathCard ref={breathRef} />
          </section>
        </div>
      </div>
    </div>
  );
}

function AchievementsPanel() {
  return (
    // Stable tour anchor for Step 5 (OK to highlight whole section)
    <section
      className="plate group--corners"
      style={{ padding: 16 }}
      data-tour="achv-kpis"
    >
      <span className="corners" />
      <Suspense fallback={<div style={{ opacity: 0.7 }}>Loading Achievements &amp; Stats…</div>}>
        <AchievementsAndStatsTabs />
      </Suspense>
    </section>
  );
}


  // Treat an ADI object with no visible fields as "empty" for UI purposes
function isEmptyADI(adi) {
  if (!adi || typeof adi !== "object") return true;
  const hasRibbon = !!adi.ribbon;
  const hasPortrait = Array.isArray(adi.portrait) && adi.portrait.length > 0;
  const hasCompat =
    adi.compatibility &&
    (
      (Array.isArray(adi.compatibility.natural_fits) && adi.compatibility.natural_fits.length > 0) ||
      (Array.isArray(adi.compatibility.likely_friction) && adi.compatibility.likely_friction.length > 0)
    );
  const hasConflict =
    adi.conflict &&
    (
      !!adi.conflict.apology_vs_forgiveness ||
      (Array.isArray(adi.conflict.scripts) && adi.conflict.scripts.length > 0)
    );
  const hasSelfCare =
    adi.self_care &&
    (
      !!adi.self_care.love_self ||
      (Array.isArray(adi.self_care.micro_practices) && adi.self_care.micro_practices.length > 0)
    );
  const hasPatterns = Array.isArray(adi.patterns) && adi.patterns.length > 0;

  return !(hasRibbon || hasPortrait || hasCompat || hasConflict || hasSelfCare || hasPatterns);
}


  function PersonalityPanel() {
  // --- quiz rows ---
  const receivingRow = pickLatest(loveQuizzes, RECEIVING_SLUGS);
  const givingRow    = pickLatest(loveQuizzes, GIVING_SLUGS);
  const apologyRow   = pickLatest(loveQuizzes, APOLOGY_SLUGS);
  const attachRow    = pickLatest(loveQuizzes, ATTACHMENT_SLUGS);

  // --- Most Frequent Mood / Need (last 30d, latest entry per day) ---
  const [mfMood, setMfMood] = React.useState(null);
  const [mfNeed, setMfNeed] = React.useState(null);

  const hasUser = Boolean(userId);

  React.useEffect(() => {
    if (!userId) return;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: rows, error } = await supabase
        .from("moods")
        .select("created_at, mood, need")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(rows)) { setMfMood(null); setMfNeed(null); return; }

      const latestByDay = {};
      for (const r of rows) {
        const k = new Date(r.created_at).toISOString().slice(0, 10);
        if (!latestByDay[k]) latestByDay[k] = r;
      }
      const deduped = Object.values(latestByDay);

      const freq = (arr, key) => {
        const c = {};
        for (const r of arr) {
          const v = (r[key] || "").trim();
          if (!v) continue;
          c[v] = (c[v] || 0) + 1;
        }
        let best = null, max = 0;
        for (const [k, v] of Object.entries(c)) { if (v > max) { best = k; max = v; } }
        return best;
      };

      const toTitle = (s = "") =>
        s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

      const mood = freq(deduped, "mood");
      const need = freq(deduped, "need");

      setMfMood(mood ? toTitle(mood) : null);
      setMfNeed(need ? toTitle(need) : null);
    })();
  }, [userId]);

  // centered, no-pill styles
  const metricColStyle = { textAlign: "center" };
  const labelStyle = { marginBottom: 6, opacity: 0.9 };   // no border/padding/radius
  const valueStyle = {
    fontWeight: 700,
    color: "var(--c-head)",
    fontSize: "clamp(18px, 2.6vw, 28px)",
  };
  const subStyle = { opacity: 0.85, marginTop: 2 };

  // Simple pager (define before usage)
  function InlinePager({ page, pages, onPage }) {
    if (!pages || pages <= 1) return null;
    return (
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <span style={{ alignSelf: "center", opacity: 0.9 }}>{page} / {pages}</span>
        <button className="btn btn--ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    );
  }
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [pTab]);

  useEffect(() => {
    if (pTab === "quizzes") {
      console.log("[GI] loading:", giLoading, "error:", giError, "hasData:", !!gi);
    }
  }, [pTab, giLoading, giError, gi]);

  useEffect(() => {
    if (pTab === "love") {
      console.log("[LOVE] loading:", loveLoading, "error:", loveError, "hasData:", !!loveProfile);
    }
  }, [pTab, loveLoading, loveError, loveProfile]);

  // titles
  const receivingTitle = receivingRow?.result_title || (receivingRow?.result_key ? startCase(receivingRow.result_key) : "—");
  const givingTitle    = givingRow?.result_title    || (givingRow?.result_key    ? startCase(givingRow.result_key)    : "—");
  const apologyTitle   = apologyRow?.result_title || "—";
  const attachTitle    = attachRow?.result_title  || "—";

  const subItems = [
    { value: "mood",      label: "Mood" },
    { value: "love",      label: "Love" },
    { value: "archetype", label: "Archetype" },
    { value: "quizzes",   label: "Quiz Insights" },
  ];

  // TOUR: mode & target wrappers
  const tourMode = useTourMode();

  const left = (
    <section
      className="plate group--corners plate--charcoal"
      style={{ padding: 0, borderRadius: 12, height: "100%", display: "flex", flexDirection: "column" }}
    >
      <span className="corners" />

      {/* Tabs (tour target) */}
      <div data-tour="tabs-bar">
        <TabsBar value={pTab} onChange={setPTab} items={subItems} className="ui-tabs--no-rail" sticky={false} />
      </div>

      <div style={{ padding: 16 }}>
        {pTab === "mood" && (
          <div style={{ display: "grid", gap: 16 }}>
            {/* === Mood KPIs (30d) — tour target with fallback placeholder === */}
            <TourTarget
              id="mood-kpis"
              placeholderTitle="Your Snapshot"
              placeholderBody="As you check in, this row will show your most frequent mood, needs, and social battery."
              style={{ marginBottom: 0 }}
            >
              {(kpi?.checkins || kpi?.avgBattery != null || kpi?.dominantLove || mfMood || mfNeed || tourMode) && (
                <div
                  className="love-metrics"
                  data-tour="mood-kpis"  
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr auto 1fr",
                    gap: 12,
                    paddingBottom: 14,
                  }}
                >
                  {/* Check-ins (30d) */}
                  <div style={metricColStyle}>
                    <div className="kpi label" style={labelStyle}>Check-ins (30d)</div>
                    <div style={valueStyle}>{tourMode ? (kpi?.checkins || 12) : (kpi?.checkins || 0)}</div>
                  </div>

                  <div className="rule-gold-vertical" />

                  {/* Avg Social Battery */}
                  <div style={metricColStyle}>
                    <div className="kpi label" style={labelStyle}>Avg Social Battery</div>
                    <div style={valueStyle}>
                      {kpi?.avgBattery != null
                        ? `${kpi.avgBattery} / 3`
                        : (tourMode ? "2.1 / 3" : "—")}
                    </div>
                    <div className="kpi-sub" style={subStyle}>
                      {kpi?.avgBattery != null
                        ? batteryLabel(kpi.avgBattery)
                        : (tourMode ? "Mostly Medium" : "—")}
                    </div>
                  </div>

                  <div className="rule-gold-vertical" />

                  {/* Most Needed Love Language */}
                  <div style={metricColStyle}>
                    <div className="kpi label" style={labelStyle}>Most Needed Love Language</div>
                    <div style={valueStyle}>
                      {kpi?.dominantLove ? startCase(kpi.dominantLove) : (tourMode ? "Quality Time" : "—")}
                    </div>
                    <div className="kpi-sub" style={subStyle}>From Recent Check-Ins</div>
                  </div>

                  <div className="rule-gold-vertical" />

                  {/* Most Frequent Mood */}
                  <div style={metricColStyle}>
                    <div className="kpi label" style={labelStyle}>Most Frequent Mood</div>
                    <div style={valueStyle}>{mfMood || (tourMode ? "Calm" : "—")}</div>
                    <div className="kpi-sub" style={subStyle}>From Recent Check-Ins</div>
                  </div>

                  <div className="rule-gold-vertical" />

                  {/* Most Frequent Need */}
                  <div style={metricColStyle}>
                    <div className="kpi label" style={labelStyle}>Most Frequent Need</div>
                    <div style={valueStyle}>{mfNeed || (tourMode ? "Focus" : "—")}</div>
                    <div className="kpi-sub" style={subStyle}>From Recent Check-Ins</div>
                  </div>
                </div>
              )}
            </TourTarget>

            <hr className="rule-gold" />

            {/* === Check-in Calendar — tour target with fallback === */}
            <TourTarget
              id="calendar"
              placeholderTitle="Check-in Calendar"
              placeholderBody="Each day you log appears here with color and battery cues."
            >
              <div className="unbox" style={{ display: "grid", gap: 14 }}>
                <div className="section-title" style={{ margin: "6px 0 8px" }}>
                  <div style={{ fontWeight: 700 }}>Check-in Calendar</div>
                  <span className="rule" />
                </div>

                <CalendarTab
                  userId={userId}
                  setCurrentTab={() => {}}
                  setResponses={updateResponses}
                  setIsEditing={setEditingStable}
                  setIsReadOnlyView={setReadOnlyStable}
                  setSelectedDate={setSelectedDateStable}
                  selectedDate={today.selectedDate}
                  setActiveTab={() => {}}
                  activeTab="calendar"
                  setStep={setCheckinStep}
                  hasManuallySetStep={{ current: false }}   // CalendarTab reads .current
                  submissionStatus={today.submissionStatus}
                  setSubmissionStatus={setSubmissionStatusStable}
                />
              </div>
            </TourTarget>
          </div>
        )}

        {pTab === "love" && (
          <>
            <div className="section-title" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Love</h3>
              <span className="rule" />
            </div>

            <div className="unbox">
              {/* Love KPIs — tour target */}
              <TourTarget
                id="love-kpis"
                placeholderTitle="Love Snapshot"
                placeholderBody="Your giving, receiving, and attachment patterns appear here as you take quizzes and check in."
              >
                {(receivingRow || givingRow || attachRow || kpi?.dominantLove || tourMode) && (
                  <div
                    className="love-metrics"
                    data-tour="love-kpis"  
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr",
                      gap: 12,
                      paddingBottom: 14,
                    }}
                  >
                    {/* Most Needed Love Language */}
                    <div style={metricColStyle}>
                      <div className="kpi label" style={labelStyle}>Most Needed Love Language</div>
                      <div style={valueStyle}>
                        {kpi?.dominantLove ? startCase(kpi.dominantLove) : (tourMode ? "Quality Time" : "—")}
                      </div>
                      <div className="kpi-sub" style={subStyle}>From Recent Check-Ins</div>
                    </div>

                    <div className="rule-gold-vertical" />

                    {/* Receiving Style */}
                    <div style={metricColStyle}>
                      <div className="kpi label" style={labelStyle}>Receiving Style</div>
                      <div style={valueStyle}>{receivingTitle !== "—" ? receivingTitle : (tourMode ? "Soft + Receptive" : "—")}</div>
                      <div className="kpi-sub" style={subStyle}>
                        {receivingRow?.result_key ? startCase(receivingRow.result_key) : (tourMode ? "Words of Affirmation" : "")}
                      </div>
                    </div>

                    <div className="rule-gold-vertical" />

                    {/* Giving Style */}
                    <div style={metricColStyle}>
                      <div className="kpi label" style={labelStyle}>Giving Style</div>
                      <div style={valueStyle}>{givingTitle !== "—" ? givingTitle : (tourMode ? "Practical + Warm" : "—")}</div>
                      <div className="kpi-sub" style={subStyle}>
                        {givingRow?.result_key ? startCase(givingRow.result_key) : (tourMode ? "Acts of Service" : "")}
                      </div>
                    </div>

                    <div className="rule-gold-vertical" />

                    {/* Attachment */}
                    <div style={metricColStyle}>
                      <div className="kpi label" style={labelStyle}>Attachment</div>
                      <div style={valueStyle}>{attachTitle !== "—" ? attachTitle : (tourMode ? "Secure Leaning" : "—")}</div>
                      <div className="kpi-sub" style={subStyle}>
                        {attachRow?.result_key ? startCase(attachRow.result_key) : (tourMode ? "Balanced Trust" : "")}
                      </div>
                    </div>
                  </div>
                )}
              </TourTarget>

              <hr className="rule-gold" />

              {/* Love subtabs */}
              <div
                className="ui-tabs ui-tabs--mini ui-tabs--separated"
                role="tablist"
                aria-label="Love view"
                style={{ margin: "12px 0 6px" }}
              >
                <button className="ui-tabs__btn" role="tab" aria-selected={loveTab === "self"}   onClick={() => setLoveTab("self")}>Self</button>
                <button className="ui-tabs__btn" role="tab" aria-selected={loveTab === "others"} onClick={() => setLoveTab("others")}>With Others</button>
              </div>

              {loveTab === "self" && (
                <div style={{ marginTop: 10 }}>
                  <div className="section-title" style={{ margin: "6px 0 8px" }}>
                    <div style={{ fontWeight: 700 }}>How to Care for Yourself</div>
                    <span className="rule" />
                  </div>

                  <div style={{ opacity: 0.9, lineHeight: 1.75 }}>
                    {receivingRow?.result_summary ? (
                      <p style={{ marginTop: 0 }}>{receivingRow.result_summary}</p>
                    ) : (
                      <p style={{ marginTop: 0 }}>
                        Your receiving style helps you refill. As you log check-ins, we'll tailor this section.
                      </p>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 600 }}>Repair (receiver)</div>
                      <div style={{ opacity: 0.85 }}>
                        {pickLatest(loveQuizzes, FORGIVENESS_SLUGS)?.result_title || "—"}
                      </div>
                    </div>

                    <ul style={{ marginTop: 12 }}>
                      {loveQuizzes["love-language"]?.result_summary ? (
                        <li>Plan one small practice that matches your receiving style this week.</li>
                      ) : null}
                      {kpi?.dominantLove ? (
                        <li>
                          When stressed, ask for <em>{startCase(kpi.dominantLove)}</em>—that’s what you’ve needed most lately.
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>
              )}

              {loveTab === "others" && (
                <div style={{ marginTop: 10 }}>
                  <div className="section-title" style={{ margin: "6px 0 8px" }}>
                    <div style={{ fontWeight: 700 }}>How You Tend to Love Others</div>
                    <span className="rule" />
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Giving style</div>
                      <div style={{ opacity: 0.85 }}>{givingTitle}</div>
                      {givingRow?.result_summary && <p style={{ marginTop: 6 }}>{givingRow.result_summary}</p>}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600 }}>Repair (apology)</div>
                      <div style={{ opacity: 0.85 }}>{apologyTitle}</div>
                      {apologyRow?.result_summary && <p style={{ marginTop: 6 }}>{apologyRow.result_summary}</p>}
                    </div>

                    <div>
                      <div style={{ fontWeight: 600 }}>Attachment Note</div>
                      <div style={{ opacity: 0.85 }}>{attachTitle}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, opacity: 0.9 }}>
                    <em>Tip:</em> If a partner needs a different language than you give naturally, try pairing your
                    style with one cue in theirs.
                  </div>
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <div className="section-title" style={{ margin: "6px 0 8px" }}>
                  <div style={{ fontWeight: 700 }}>Last 30 days</div>
                  <span className="rule" />
                </div>
                <div style={{ opacity: 0.9 }}>Check-ins: {kpi?.checkins || 0}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>
                  “Most needed love language” reflects your check-ins, not your baseline receiving style.
                </div>
              </div>
            </div>
          </>
        )}

        {pTab === "archetype" && (
          <>
            <div className="section-heading">
              <h3 style={{ margin: 0 }}>Archetype</h3>
            </div>
            <hr className="rule-gold" />
            <SoulProfileContainer userId={userId} adi={adiCombined} />
          </>
        )}

        {pTab === "quizzes" && (
          <>
            <div className="section-heading">
              <h3 style={{ margin: 0 }}>Your Quiz Results</h3>
            </div>
            <hr className="rule-gold" />
            <ProfileQuizzesTab userId={userId} />
          </>
        )}
      </div>
    </section>
  );
/* 
  const [pageLove, setPageLove] = useState(1);
  const [pageQuizzes, setPageQuizzes] = useState(1); */

  const right = (
  <div>
    {/* Heading row + quick actions (kept empty by design) */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    />

    {/* ===================== MOOD TAB (Right) ===================== */}
{pTab === "mood" && (
  hasUser ? (
    <TourTarget
      id="insight-panel"
      placeholderTitle="Personalized Analysis"
      placeholderBody="As you check in, we write short reflections that help you track patterns."
    >
      <div data-tour-container data-tour="analysis-pane-mood">
        <RightPlate minHeight={420}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Personalized Analysis</h3>
            <span className="rule" />
          </div>

          <div style={{ opacity: 0.95, lineHeight: 1.6, flex: 1 }}>
            {effectiveLoading && (
              <div style={{ opacity: 0.7 }}>Loading your mood insight…</div>
            )}
            {!effectiveLoading && effectiveError && (
              <div className="surface" style={{ padding: 10 }}>
                {String(effectiveError)}
              </div>
            )}
            {!effectiveLoading && !effectiveError && (
              <>
                <p style={{ marginTop: 0 }}>
                  {effectiveText ? (
                    effectiveText
                  ) : tourMode ? (
                    <>
                      <em style={{ opacity: 0.7, fontStyle: "normal" }}>Example:</em>{" "}
                      You’ve been leaning into <strong>Focus</strong> and your
                      social battery hovers around <strong>Medium</strong>. A
                      warm check-in routine will help keep you steady.
                    </>
                  ) : (
                    "We’ll craft a short mood reflection once you have a few recent check-ins."
                  )}
                </p>
                <InlinePager page={page} pages={1} onPage={setPage} />
              </>
            )}
          </div>
        </RightPlate>
      </div>
    </TourTarget>
  ) : (
    <RightPlate minHeight={420}>
      <div style={{ opacity: 0.8 }}>Loading your mood insight… (waiting for sign-in)</div>
    </RightPlate>
  )
)}

{/* ===================== LOVE TAB (Right) ===================== */}
{pTab === "love" && (
  hasUser ? (
    <TourTarget
      id="insight-panel"
      placeholderTitle="Personalized Analysis"
      placeholderBody="We’ll weave your love patterns as you add more signals."
    >
      <div data-tour-container data-tour="analysis-pane-love">
        <RightPlate minHeight={460}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Personalized Analysis</h3>
            <span className="rule" />
          </div>

          {loveLoading && <div>Loading your love profile…</div>}
          {loveError && (
            <div className="surface" style={{ padding: 10 }}>
              {loveError}
            </div>
          )}
          {!loveLoading && !loveError && !loveProfile && (
            <div>No love profile yet.</div>
          )}

          {!loveLoading && !loveError && loveProfile && (() => {
            const html = loveProfileToHtml(loveProfile);
            const sections = htmlToSections(html);
            const pages = buildPagesFromSections(sections, {
              wordBudget: 240,
              maxSectionsPerPage: 2,
            });
            const total = Math.max(1, pages.length);

            return (
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <SectionsPage pageSections={pages[(pageLove - 1) % total]} />
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                  <button className="btn btn--ghost" onClick={() => setPageLove((p) => (p <= 1 ? total : p - 1))}>
                    ← Prev
                  </button>
                  <span style={{ alignSelf: "center", opacity: 0.8 }}>
                    Page {pageLove} / {total}
                  </span>
                  <button className="btn btn--ghost" onClick={() => setPageLove((p) => (p >= total ? 1 : p + 1))}>
                    Next →
                  </button>
                </div>
              </div>
            );
          })()}
        </RightPlate>
      </div>
    </TourTarget>
  ) : (
    <RightPlate minHeight={460}>
      <div style={{ opacity: 0.8 }}>Loading your love profile… (waiting for sign-in)</div>
    </RightPlate>
  )
)}

{/* ===================== ARCHETYPE TAB (Right) ===================== */}
{pTab === "archetype" && (
  hasUser ? (
    <TourTarget
      id="insight-panel"
      placeholderTitle="Personalized Analysis"
      placeholderBody="Your archetype deep-read will unlock as you add more signals."
    >
      <div data-tour-container data-tour="analysis-pane-arch">
        <RightPlate minHeight={460}>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>Personalized Analysis</h3>
            <span className="rule" />
          </div>

          <div
            style={{
              opacity: 0.95,
              lineHeight: 1.6,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
            aria-live="polite"
          >
            {/* loading states */}
            {archDeepLoading && !adiCombined && (
              <div style={{ opacity: 0.7 }}>Loading your archetype insight…</div>
            )}
            {/* optional gentle overlay if refreshing while showing cached */}
            {archDeepLoading && adiCombined && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontSize: ".9em",
                  opacity: 0.6,
                }}
              >
                Refreshing…
              </div>
            )}

            {archDeepError && adiCombined && (
              <div className="surface" style={{ padding: 10, marginBottom: 8 }}>
                Network hiccup — showing your last saved insight.
              </div>
            )}

            {archDeepError && !adiCombined && (
              <div className="surface" style={{ padding: 10 }}>
                {String(archDeepError)}
              </div>
            )}

            {adiCombined &&
              (() => {
                const adi = adiCombined;

                if (isEmptyADI(adi)) {
                  return (
                    <p style={{ marginTop: 0 }}>
                      We’re preparing your archetype deep-read. Check back after a
                      couple of fresh check-ins or try{" "}
                      <button
                        className="btn btn-link"
                        onClick={() => setAdiForceNonce((n) => n + 1)}
                      >
                        Refresh
                      </button>
                      .
                    </p>
                  );
                }

                const hasCompat =
                  (Array.isArray(adi?.compatibility?.natural_fits) &&
                    adi.compatibility.natural_fits.length > 0) ||
                  (Array.isArray(adi?.compatibility?.likely_friction) &&
                    adi.compatibility.likely_friction.length > 0);

                const hasConflict =
                  !!adi?.conflict?.apology_vs_forgiveness ||
                  (Array.isArray(adi?.conflict?.scripts) &&
                    adi.conflict.scripts.length > 0);

                const hasSelfCare =
                  !!adi?.self_care?.love_self ||
                  (Array.isArray(adi?.self_care?.micro_practices) &&
                    adi.self_care.micro_practices.length > 0);

                const weave = adi?.weave || {};
                const weaveNarrative =
                  Array.isArray(weave?.narrative)
                    ? weave.narrative
                    : typeof weave?.narrative === "string"
                    ? [weave.narrative]
                    : [];
                const weaveCrossDetails = Array.isArray(
                  weave?.cross_language_details
                )
                  ? weave.cross_language_details
                  : [];
                const weaveTensions = Array.isArray(weave?.tensions_details)
                  ? weave.tensions_details
                  : [];
                const weaveIntegrations = Array.isArray(weave?.integrations)
                  ? weave.integrations
                  : [];

                const pages = [];

                // 1
                pages.push(
                  <React.Fragment key="a1">
                    {adi.ribbon ? <p style={{ marginTop: 0 }}>{adi.ribbon}</p> : null}
                    {Array.isArray(adi.portrait) && adi.portrait.length > 0
                      ? adi.portrait.map((p, i) => (
                          <p key={`pt-${i}`} style={{ marginTop: i ? 8 : 0 }}>
                            {p}
                          </p>
                        ))
                      : adi.portrait
                      ? <p>{adi.portrait}</p>
                      : null}
                  </React.Fragment>
                );

                // 2
                if (weaveNarrative.length) {
                  pages.push(
                    <React.Fragment key="a2">
                      <h4 style={{ margin: "12px 0 6px" }}>Weave</h4>
                      {weaveNarrative.map((p, i) => (
                        <p key={`weave-n-${i}`} style={{ marginTop: i ? 6 : 0 }}>
                          {p}
                        </p>
                      ))}
                    </React.Fragment>
                  );
                }

                // 3
                if (weaveCrossDetails.length || weaveTensions.length) {
                  pages.push(
                    <React.Fragment key="a3">
                      {weaveCrossDetails.length > 0 && (
                        <>
                          <div
                            style={{ opacity: 0.85, fontWeight: 600, marginTop: 6 }}
                          >
                            Cross-language dynamics
                          </div>
                          <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                            {weaveCrossDetails.map((t, i) => (
                              <li key={`weave-x-${i}`}>{t}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {weaveTensions.length > 0 && (
                        <>
                          <div
                            style={{ opacity: 0.85, fontWeight: 600, marginTop: 8 }}
                          >
                            Tender tensions
                          </div>
                          <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                            {weaveTensions.map((t, i) => (
                              <li key={`weave-t-${i}`}>{t}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </React.Fragment>
                  );
                }

                // 4
                if (weaveIntegrations.length) {
                  pages.push(
                    <React.Fragment key="a4">
                      <div
                        style={{ opacity: 0.85, fontWeight: 600, marginTop: 8 }}
                      >
                        Integrations
                      </div>
                      <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                        {weaveIntegrations.map((t, i) => (
                          <li key={`weave-i-${i}`}>{t}</li>
                        ))}
                      </ul>
                    </React.Fragment>
                  );
                }

                // 5
                if (hasCompat) {
                  pages.push(
                    <React.Fragment key="a5">
                      <h4 style={{ margin: "12px 0 6px" }}>Compatibility</h4>
                      {Array.isArray(adi.compatibility?.natural_fits) &&
                        adi.compatibility.natural_fits.length > 0 && (
                          <>
                            <div
                              style={{
                                opacity: 0.85,
                                fontWeight: 600,
                                marginTop: 4,
                              }}
                            >
                              Natural Fits
                            </div>
                            <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                              {adi.compatibility.natural_fits.map((b, i) => (
                                <li key={`best-${i}`}>
                                  <strong>{b.pair}</strong> — {b.why}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      {Array.isArray(adi.compatibility?.likely_friction) &&
                        adi.compatibility.likely_friction.length > 0 && (
                          <>
                            <div
                              style={{
                                opacity: 0.85,
                                fontWeight: 600,
                                marginTop: 8,
                              }}
                            >
                              Likely Friction
                            </div>
                            <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                              {adi.compatibility.likely_friction.map((f, i) => (
                                <li key={`fric-${i}`}>
                                  <strong>{f.pair}</strong> — {f.why}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                    </React.Fragment>
                  );
                }

                // 6
                if (hasConflict || hasSelfCare) {
                  pages.push(
                    <React.Fragment key="a6">
                      {hasConflict && (
                        <>
                          <h4 style={{ margin: "12px 0 6px" }}>
                            Conflict Resolution
                          </h4>
                          {adi.conflict.apology_vs_forgiveness && (
                            <p>{adi.conflict.apology_vs_forgiveness}</p>
                          )}
                          {Array.isArray(adi.conflict.scripts) &&
                            adi.conflict.scripts.length > 0 && (
                              <ul style={{ paddingLeft: 18, margin: 0 }}>
                                {adi.conflict.scripts.map((s, i) => (
                                  <li key={`cr-${i}`}>{s}</li>
                                ))}
                              </ul>
                            )}
                        </>
                      )}
                      {hasSelfCare && (
                        <>
                          <h4 style={{ margin: "12px 0 6px" }}>Self-Care</h4>
                          {adi.self_care.love_self && <p>{adi.self_care.love_self}</p>}
                          {Array.isArray(adi.self_care.micro_practices) &&
                            adi.self_care.micro_practices.length > 0 && (
                              <ul style={{ paddingLeft: 18, margin: 0 }}>
                                {adi.self_care.micro_practices.map((s, i) => (
                                  <li key={`sc-${i}`}>{s}</li>
                                ))}
                              </ul>
                            )}
                        </>
                      )}
                    </React.Fragment>
                  );
                }

                // 7
                if (
                  (Array.isArray(adi.patterns) && adi.patterns.length > 0) ||
                  adi.sources
                ) {
                  pages.push(
                    <React.Fragment key="a7">
                      {Array.isArray(adi.patterns) && adi.patterns.length > 0 && (
                        <>
                          <h4 style={{ margin: "12px 0 6px" }}>Patterns I Noticed</h4>
                          <ul style={{ paddingLeft: 18, margin: 0 }}>
                            {adi.patterns.map((p, i) => (
                              <li key={`pat-${i}`}>{p}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {adi.sources ? (
                        <div
                          style={{
                            opacity: 0.7,
                            fontSize: ".9em",
                            marginTop: 8,
                          }}
                        >
                          <div>
                            <strong>Sources:</strong>
                          </div>
                          {adi.sources.archetype && (
                            <div>Archetype: {adi.sources.archetype}</div>
                          )}
                          {Array.isArray(adi.sources.signals) &&
                            adi.sources.signals.length > 0 && (
                              <div>Signals: {adi.sources.signals.join(", ")}</div>
                            )}
                          {adi.sources.checkins && (
                            <div>Check-ins: {adi.sources.checkins}</div>
                          )}
                          {adi.sources.journals && (
                            <div>Journals: {adi.sources.journals}</div>
                          )}
                        </div>
                      ) : null}
                    </React.Fragment>
                  );
                }

                const pagesCount = Math.max(1, pages.length);

                return (
                  <>
                    {pages[Math.min(page - 1, pagesCount - 1)]}
                    <InlinePager
                      page={Math.min(page, pagesCount)}
                      pages={pagesCount}
                      onPage={setPage}
                    />
                  </>
                );
              })()}

            {!archDeepLoading && !archDeepError && !adiCombined && (
              <p style={{ marginTop: 0 }}>
                Your archetype insights will appear here soon.
              </p>
            )}
          </div>
        </RightPlate>
      </div>
    </TourTarget>
  ) : (
    <RightPlate minHeight={460}>
      <div style={{ opacity: 0.8 }}>Loading your archetype insight… (waiting for sign-in)</div>
    </RightPlate>
  )
)}



    {/* ===================== QUIZ INSIGHTS TAB (Right) ===================== */}
{pTab === "quizzes" && (
  hasUser ? (
    <TourTarget
      id="quizzes-hub"
      placeholderTitle="Your Quiz Insights"
      placeholderBody="After you take a quiz, your results and graphs will appear here."
    >
      <RightPlate minHeight={460} data-tour="analysis-pane-quizzes">
        <div className="section-title" style={{ marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>Quiz Insights</h3>
          <span className="rule" />
        </div>

        {giLoading && <div style={{ opacity: 0.7 }}>Loading your insights…</div>}
        {giError && (
          <div className="surface" style={{ padding: 10 }}>
            {String(giError)}
          </div>
        )}

        {!giLoading && !giError && (() => {
          const html = insightsToHtml(gi?.insights || gi || {});
          const allSections = htmlToSections(html);

          const has = (sec, kw) => String(sec.title || "").toLowerCase().includes(kw);
          const oneOf = (sec, kws) => kws.some((k) => has(sec, k));

          let allSectionsLocal = [...allSections];
          const take = (pred) => {
            const picked = [];
            const rest = [];
            for (const s of allSectionsLocal) {
              (pred(s) ? picked : rest).push(s);
            }
            allSectionsLocal = rest;
            return picked;
          };

          const lovePage = take((s) => oneOf(s, ["receiving", "giving", "attachment"]));
          const resolutionPage = take((s) => oneOf(s, ["apology", "forgiveness", "mistake"]));
          const lastFixed = take((s) =>
            oneOf(s, ["weaving the threads", "weave", "7-day experiment", "experiment", "personalized notes", "notes"])
          );
          const miscPage = allSectionsLocal;

          const pagesRaw = [lovePage, resolutionPage, miscPage, lastFixed].filter(
            (arr) => Array.isArray(arr) && arr.length > 0
          );
          const total = Math.max(1, pagesRaw.length);
          const cur = Math.min(Math.max(1, pageQuizzes), total);
          if (cur !== pageQuizzes) setPageQuizzes(cur);

          return (
            <>
              <SectionsPage pageSections={pagesRaw[cur - 1]} />
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                <button className="btn btn--ghost" onClick={() => setPageQuizzes((p) => (p <= 1 ? total : p - 1))}>
                  ← Prev
                </button>
                <span style={{ alignSelf: "center", opacity: 0.8 }}>
                  Page {cur} / {total}
                </span>
                <button className="btn btn--ghost" onClick={() => setPageQuizzes((p) => (p >= total ? 1 : p + 1))}>
                  Next →
                </button>
              </div>
            </>
          );
        })()}
      </RightPlate>
    </TourTarget>
  ) : (
    <RightPlate minHeight={460}>
      <div style={{ opacity: 0.8 }}>Loading your quiz insights… (waiting for sign-in)</div>
    </RightPlate>
  )
)}
  </div>
);


  return <Split left={left} right={right} />;
}



  function ListsPanel() {
  return (
    <section className="plate group--corners" style={{ padding: 16 }}>
      <ListsHub />
    </section>
  );
}


  function QuizzesPanel() {
    return (
      <section className="ui-section ui-section--flat" style={{ padding: 16 }}>
        <QuizzesHub />
      </section>
    );
  }
  function SettingsPanel() {
    return (
      <section className="ui-section ui-section--flat" style={{ padding: 16 }}>
        <div style={{ opacity: 0.9 }}>Settings coming soon.</div>
      </section>
    );
  }

  {fatal && (
  <div className="surface" style={{ 
    margin: "12px 16px", padding: 12, borderRadius: 10 
  }}>
    <strong>We hit a snag.</strong>
    <div style={{ opacity: 0.85, marginTop: 6 }}>{fatal}</div>
    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
      <button className="btn btn-action" onClick={() => location.reload()}>Reload</button>
      <button
        className="btn btn--ghost"
        onClick={async () => {
          setFatal(null);
          try { await supabase.auth.getSession(); } catch {}
        }}
      >
        Try again
      </button>
    </div>
  </div>
)}

  if (shellLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
  <InsightProvider>
    <style>{`
  .kpi.label,
  .kpi.label::before,
  .kpi.label::after {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
  }
`}</style>
    <DashboardTour
      userId={userId}
      getTab={getTab}
      setTab={setTab}
      getPTab={getPTab}
      setPTab={setPTab}
    />

    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: theme.background || "#0d0d0d",
        color: theme.text || "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* Wrap the main tabs in a stable tour anchor */}
      <div data-tour="main-tabs">
        <TabsBar
          value={tab}
          onChange={setTab}
          items={[
            { value: "today", label: "Today" },
            { value: "achv", label: "Achievements & Stats" },
            { value: "profile", label: "Personality Profile" },
            { value: "lists", label: "Lists" },
            { value: "quizzes", label: "Quiz Catalog" },
            { value: "settings", label: "Settings" },
          ]}
          right={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn--ghost"
                onClick={goToProfile}
                data-tour="profile-cta"
              >
                {handle ? "View Public Profile" : "Set up Profile"}
              </button>
              {/* Tour trigger */}
              <button
                className="btn btn--ghost"
                data-tour="tour-start"
                onClick={() =>
                  window.dispatchEvent(new Event("start-dashboard-tour"))
                }
              >
                Take Tour
              </button>
            </div>
          }
        />
      </div>

      <ViewportPanel>
        {tab === "today" && <TodayPanel />}
        {tab === "achv" && <AchievementsPanel />}
        {tab === "profile" && <PersonalityPanel />}
        {tab === "lists" && <ListsPanel />}
        {tab === "quizzes" && <QuizzesPanel />}
        {tab === "settings" && <SettingsPanel />}
      </ViewportPanel>

      <InsightDisplay theme={theme} />
    </div>
    <DebugProfilesDiagButton />
  </InsightProvider>
);

}
