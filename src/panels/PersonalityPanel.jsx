// panels/PersonalityPanel.jsx
import React, { useEffect } from "react";
import DashSection from "@components/layout/DashSection.jsx";

// Data hooks
import useCachedEdge from "@lib/hooks/useCachedEdge.js";
import useSignalsVersion from "@lib/hooks/useSignalsVersion.js";

// If these aren’t globally available, import them from your paths:
import MoodBlock from "@components/mood/MoodBlock.jsx";
import LoveBlock from "@components/love/LoveBlock.jsx";
import SoulProfileContainer from "@components/account/SoulProfileContainer.jsx";
import ProfileQuizzesTab from "@components/quizzes/ProfileQuizzesTab.jsx";

/* ----------------------------- Insights renderer ----------------------------- */

function QuizzesInsightsBlock({ gi }) {
  // gi is the edge function payload (already aliased from useCachedEdge: data: gi)
  const ins = gi?.insights ?? gi;
  if (!ins) return null;

  useEffect(() => {
    // small debug peek in dev
    // eslint-disable-next-line no-console
    console.log("[QuizzesInsightsBlock] insights", ins);
  }, [ins]);

  const A = ins.archetype;
  const D = ins.domains || {};
  const W = ins.weaving || {};

  // Collect personalized notes from several possible shapes
  const notes = (() => {
    const out = [];
    const push = (v) => {
      if (!v) return;
      if (Array.isArray(v)) v.forEach(push);
      else if (typeof v === "string" && v.trim()) out.push(v.trim());
    };
    push(ins.personalized_notes);   // preferred
    push(ins.notes);                // legacy
    push(ins.personal_note);        // alt single string
    push(W?.personalized_notes);    // occasionally nested under weaving
    return Array.from(new Set(out)); // de-dupe preserve order
  })();

  return (
    <div style={{ display: "grid", gap: 16, lineHeight: 1.7 }}>
      {/* Archetype header */}
      {A?.title && (
        <>
          <h4 style={{ margin: 0 }}>{A.title}</h4>
          {A.source && <div style={{ opacity: 0.7, fontSize: 13 }}>{A.source}</div>}
        </>
      )}

      {/* Domains */}
      {["giving","receiving","apology","forgiveness","attachment"].map((k) => {
        const dom = D[k];
        if (!dom) return null;
        return (
          <div key={k} className="plate plate--charcoal" style={{ padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {k[0].toUpperCase() + k.slice(1)}
            </div>
            {dom.strength && <div><strong>Strength:</strong> {dom.strength}</div>}
            {dom.shadow && dom.shadow !== "—" && <div><strong>Shadow:</strong> {dom.shadow}</div>}
            {dom.stress && <div>{dom.stress}</div>}
            {dom.micro_practice?.text && (
              <div>
                <strong>Micro-practice ({dom.micro_practice.minutes ?? 7} min):</strong>{" "}
                {dom.micro_practice.text}
              </div>
            )}
            {dom.partner_script && (
              <div><strong>Partner script:</strong> {dom.partner_script}</div>
            )}
            {dom.source && (
              <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>{dom.source}</div>
            )}
          </div>
        );
      })}

      {/* Weaving */}
      {(W?.principles?.length || W?.experiment_7day?.length || W?.notes?.length || W?.source) && (
        <div className="plate plate--charcoal" style={{ padding: 12, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Weaving the threads</div>
          {Array.isArray(W.principles) && W.principles.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <strong>Principles:</strong>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {W.principles.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(W.experiment_7day) && W.experiment_7day.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <strong>7-day experiment:</strong>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {W.experiment_7day.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {Array.isArray(W.notes) && W.notes.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <strong>Notes:</strong>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {W.notes.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {W.source && <div style={{ opacity: 0.7, fontSize: 12 }}>{W.source}</div>}
        </div>
      )}

      {/* Personalized notes (END of analysis) */}
      {notes.length > 0 && (
        <div className="plate plate--charcoal" style={{ padding: 12, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Personalized notes</div>
          <ul style={{ margin: "6px 0 0 18px" }}>
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Main panel -------------------------------- */

export default function PersonalityPanel({
  pTab, setPTab, analysis, userId, kpi, loveQuizzes, regenerate
}) {
  const subItems = [
    { value: "mood", label: "Mood" },
    { value: "love", label: "Love" },
    { value: "archetype", label: "Archetype" },
    { value: "quizzes", label: "Quizzes" },
  ];

  // Version bumps when new quiz attempts for “signal” slugs arrive.
  // (Hook listens to DB + optional realtime, and returns a number that changes.)
  const signalsVersion = useSignalsVersion(userId);

  // Fetch insights ONLY on the Quizzes tab. The cache key includes signalsVersion,
  // so a new quiz attempt creates a brand-new cache key and triggers regeneration.
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
          signals_hint: signalsVersion, // harmless extra; useful if you log on the server
        }
      : null,
    {
      enabled: !!userId && pTab === "quizzes",
      timeoutMs: 60_000,
      staleMs: 10 * 60_000,       // cache for 10m for the same version
      revalidateOnMount: false,   // don’t re-fetch if we already have that version cached
      revalidateOnFocus: false,
      revalidateOnVisible: false,
      minIntervalMs: 20_000,
      key: `generate-insights:v4:${userId}:${signalsVersion}`, // 👈 version-aware key
      storage: "local", // uncomment if your hook supports localStorage
    }
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashSection
        title="Personality Profile"
        right={
          <button className="btn-outline-gold" onClick={() => regenerate(pTab)}>
            Regenerate
          </button>
        }
      >
        {/* Flat tabs row (matches Today style) */}
        <div className="ui-tabs ui-tabs--separated" style={{ paddingTop: 0 }}>
          {subItems.map(t => (
            <button
              key={t.value}
              className="ui-tabs__btn"
              aria-selected={pTab === t.value}
              onClick={() => setPTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content blocks */}
        <div style={{ display: "grid", gap: 14, marginTop: 10 }}>
          {pTab === "mood" && <MoodBlock kpi={kpi} userId={userId} />}
          {pTab === "love" && <LoveBlock kpi={kpi} loveQuizzes={loveQuizzes} />}
          {pTab === "archetype" && <SoulProfileContainer userId={userId} />}
          {pTab === "quizzes" && <ProfileQuizzesTab userId={userId} />}
        </div>
      </DashSection>

      {/* Personalized Analysis */}
      <DashSection title="Personalized Analysis">
        <div style={{ opacity: 0.88, lineHeight: 1.7 }}>
          {pTab === "mood" && (analysis.mood || "Your mood analysis will appear here.")}
          {pTab === "love" && (analysis.love || "Your love personality analysis will appear here.")}
          {pTab === "archetype" && (analysis.archetype || "Your archetype insights will appear here.")}

          {pTab === "quizzes" && (
            gi
              ? <QuizzesInsightsBlock gi={gi} />
              : (giLoading || giFetching)
                  ? "Loading your insights…"
                  : giError
                      ? `Could not load insights: ${giError}`
                      : (analysis.quizzes || "Insights from your quizzes will appear here.")
          )}
        </div>
      </DashSection>
    </div>
  );
}
