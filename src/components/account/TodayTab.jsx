// src/components/account/TodayTab.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { getFollowUpPrompt } from "@logic/getFollowUpPrompt.js";
import { updateKeywordTracker } from "@logic/updateKeywordTracker.js";
import { logJournalAnalysis } from "@logic/logJournalAnalysis.js";
import { isSameDay } from "date-fns";
import { useTheme as useThemeCtx, defaultTheme } from "@lib/useTheme.jsx";
import { useToast } from "@components/ui/Toast.jsx";

/* ---------- Lightweight buttons ---------- */
const PrimaryButton = (props) => <button {...props} className="btn btn--gold" />;
const PrimaryButtonNoMargin = PrimaryButton;
const PreviousButton = (props) => <button {...props} className="btn" />;
const PreviousButtonNoMargin = PreviousButton;

// Debug toggle
const DBG = true;
const dbg = (...args) => { if (DBG) console.log("[TodayTab]", ...args); };

/* ---------- Choice sets ---------- */
const MOODS = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "loved", emoji: "🥰", label: "Loved" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "grateful", emoji: "😇", label: "Grateful" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "overwhelmed", emoji: "😵‍💫", label: "Overwhelmed" },
  { value: "silly", emoji: "🤡", label: "Silly" },
  { value: "sad", emoji: "😔", label: "Sad" },
  { value: "drained", emoji: "🫠", label: "Drained" },
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
];

const BATTERY = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const LOVE_LANGS = [
  "Words of Affirmation",
  "Acts of Service",
  "Receiving Gifts",
  "Physical Touch",
  "Quality Time",
];

const NEEDS = [
  { value: "rest", label: "Rest", emoji: "😴" },
  { value: "connection", label: "Connection", emoji: "🤝" },
  { value: "expression", label: "Expression", emoji: "✍️" },
  { value: "movement", label: "Movement", emoji: "🏃" },
  { value: "focus", label: "Focus", emoji: "🎯" },
  { value: "play", label: "Play", emoji: "🎮" },
];

const pillStyle = (active, theme) => ({
  padding: "10px 16px",
  borderRadius: 20,
  border: `1px solid ${theme.border || "#444"}`,
  background: active ? (theme.primary || "#f0c075") : "transparent",
  color: active ? (theme.background || "#111") : (theme.text || "#eee"),
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
});

/* ======================================================================= */

export default function TodayTab({
  userId,
  step,                // lifted from parent
  setStep,             // lifted from parent
  currentTab,
  setCurrentTab,
  responses,
  setResponses,        // parent setter (if provided)
  isEditing,
  setIsEditing,
  isReadOnlyView,
  setIsReadOnlyView,
  selectedDate,
  setSelectedDate,
  setActiveTab,
  setJournalDetails,
  journalDetails,
  activeTab,
  hasManuallySetStep,
  submissionStatus,
  setSubmissionStatus,
  theme: themeProp,
  variant = "standalone",
  title = null,
  prefill = true,
}) {
  if (submissionStatus === null) return <div style={{ color: "#fff" }}>Loading...</div>;

  /* ---------- Theme ---------- */
  const themeFromContext = (() => { try { return useThemeCtx?.(); } catch { return null; } })();
  const theme = themeProp || themeFromContext || defaultTheme;

  /* ---------- Local (derived) ---------- */
  const [existingEntry, setExistingEntry] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [promptSource, setPromptSource] = useState("");
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [usedPrompts, setUsedPrompts] = useState([]);

  const safeStep = Number.isFinite(step) ? step : 1;
  const isToday = useMemo(() => !!selectedDate && isSameDay(new Date(), new Date(selectedDate)), [selectedDate]);
  const hasSubmitted = submissionStatus === "submitted" || submissionStatus === "updated";
  const isWizard = isEditing && !hasSubmitted;

  const haveAllSignals = Boolean(
    responses.mood && responses.social_battery && responses.love_language && responses.need
  );

  const [journalDraft, setJournalDraft] = React.useState(responses.journal || "");
  useEffect(() => { setJournalDraft(responses.journal || ""); }, [responses.journal]);
  const isJournalFilled = Boolean((journalDraft || "").trim());
  const draftInitRef = React.useRef(false);

  /* ---------- Toast ---------- */
  const { push } = useToast();

  /* ---------- Response setter (parent-first, fallback local) ---------- */
  const [localResponses, setLocalResponses] = useState(
    responses || { mood: "", social_battery: "", love_language: "", need: "", follow_up: "", journal: "", archetype: "" }
  );
  useEffect(() => { if (responses) setLocalResponses(responses); }, [responses]);

  const setResponsesMerged = React.useCallback((updater) => {
    if (typeof setResponses === "function") {
      setResponses(updater);
    } else {
      setLocalResponses(prev => (typeof updater === "function" ? updater(prev) : updater));
    }
  }, [setResponses]);

  // Re-initialize the draft when we *enter* step 5 (once per entry)
  useEffect(() => {
    if (safeStep === 5 && !draftInitRef.current) {
      setJournalDraft(responses.journal || "");
      draftInitRef.current = true;
    }
    if (safeStep !== 5) draftInitRef.current = false;
  }, [safeStep, responses.journal]);

  /* ---------- Sync editability when date changes ---------- */
  useEffect(() => {
    if (!selectedDate) return;
    setIsEditing(isToday);
    setIsReadOnlyView(!isToday);
  }, [selectedDate, isToday, setIsEditing, setIsReadOnlyView]);

  /* ---------- If today was submitted, show summary (0) ---------- */
  useEffect(() => {
    if (isToday && submissionStatus === "submitted") setStep(0);
  }, [isToday, submissionStatus, setStep]);

  /* ---------- Pre-fill if a mood exists for this day ---------- */
  useEffect(() => {
    if (!prefill) return;
    if (!userId) return;

    (async () => {
      const targetDate = selectedDate ? new Date(selectedDate) : new Date();
      const start = new Date(targetDate); start.setHours(0,0,0,0);
      const end   = new Date(targetDate); end.setHours(23,59,59,999);

      const { data, error } = await supabase
        .from("moods")
        .select("id, mood, social_battery, love_language, follow_up, journal, created_at, need")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing entry:", error);
        return;
      }

      if (data) {
        setExistingEntry(data);
        setResponsesMerged({
          mood: data.mood,
          social_battery: data.social_battery,
          love_language: data.love_language,
          need: data.need ?? "",
          follow_up: data.follow_up ?? "",
          journal: data.journal ?? "",
        });
        setSubmissionStatus("submitted");
        setStep(0);
      }
    })();
  }, [prefill, userId, selectedDate, setResponsesMerged, setSubmissionStatus, setStep]);

  /* ---------- Step 5 prompt orchestration ---------- */
  useEffect(() => {
    if (safeStep !== 5) return;
    if (!haveAllSignals) return;
    if (responses.follow_up) return;
    if (followUpLoading) return;

    (async () => {
      try {
        setFollowUpLoading(true);
        const { prompt } = getFollowUpPrompt(
          { mood: responses.mood, social_battery: responses.social_battery, love_language: responses.love_language },
          usedPrompts
        );
        setFollowUpPrompt(prompt || "What’s on your heart today?");
      } finally {
        setFollowUpLoading(false);
      }
    })();
  }, [safeStep, haveAllSignals, followUpLoading, responses, usedPrompts]);

  // --- mounted guard + one-shot latch for API prompt ---
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchedOnceRef = useRef(false);
  useEffect(() => {
    if (safeStep === 5) {
      if (!suggestedPrompt && !fetchedOnceRef.current) {
        fetchedOnceRef.current = true;
        fetchJournalPrompt(false);
      }
    } else {
      fetchedOnceRef.current = false; // reset when leaving step 5
    }
  }, [safeStep, suggestedPrompt]);

  const archetype = responses?.archetype ?? "";

  async function fetchJournalPrompt(forceNew = false) {
    setLoadingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("journal-prompt", {
        body: {
          mood: responses.mood || "",
          social_battery: responses.social_battery || "",
          love_language: responses.love_language || "",
          archetype,
          usedPrompts: usedPrompts || [],
          forceNew,
        },
      });
      if (error) throw error;

      const prompt = (data?.prompt || "What's on your mind today?").trim();
      const source = data?.source || "fallback";

      if (mountedRef.current) {
        setSuggestedPrompt(prompt);
        setPromptSource(source);
        setResponsesMerged(r => ({ ...r, follow_up: prompt || r.follow_up }));
        setUsedPrompts(prev => (prompt ? [...prev, prompt] : prev));
      }
    } catch (e) {
      console.warn("journal-prompt failed:", e);
      const fb = "What's on your mind today?";
      if (mountedRef.current) {
        setSuggestedPrompt(fb);
        setPromptSource("fallback");
        setResponsesMerged(r => ({ ...r, follow_up: fb }));
      }
    } finally {
      if (mountedRef.current) setLoadingPrompt(false);
    }
  }

  async function handleAnotherAngle() {
    if (loadingPrompt) return;
    setLoadingPrompt(true);
    try {
      const used = usedPrompts || [];
      const { data, error } = await supabase.functions.invoke("journal-prompt", {
        body: {
          mood: responses.mood || "",
          social_battery: responses.social_battery || "",
          love_language: responses.love_language || "",
          usedPrompts: used,
          forceNew: true,
        },
      });
      if (error) throw error;

      const next = (data?.prompt || "").trim();
      if (next && mountedRef.current) {
        setResponsesMerged(r => ({ ...r, follow_up: next }));
        setUsedPrompts(prev => [...prev, next]);
        setPromptSource(data?.source || "ai");
      }
    } catch (e) {
      console.warn("journal-prompt failed; using fallback", e);
      const fb = "What's on your mind today?";
      if (mountedRef.current) {
        setResponsesMerged(r => ({ ...r, follow_up: fb }));
        setPromptSource("fallback");
      }
    } finally {
      if (mountedRef.current) setLoadingPrompt(false);
    }
  }

  function handleRegeneratePrompt() {
    if (followUpLoading) return;
    setFollowUpLoading(true);
    const { prompt } = getFollowUpPrompt(
      { mood: responses.mood, social_battery: responses.social_battery, love_language: responses.love_language },
      usedPrompts
    );
    const next = (prompt || "What’s on your heart today?").trim();
    setFollowUpPrompt(next);
    setUsedPrompts(prev => [...prev, next]);
    setFollowUpLoading(false);
  }

  /* ---------- Navigation helpers ---------- */
  const goNext = React.useCallback(() => setStep(s => Math.min(5, s + 1)), [setStep]);
  const goPrev  = React.useCallback(() => setStep(s => Math.max(0, s - 1)), [setStep]);

  // ✅ Single update; clear *downstream* fields so guards only advance one step
  const selectAndMaybeNext = React.useCallback((key, value) => {
    setResponsesMerged(prev => {
      const next = { ...prev, [key]: value };
      if (key === "mood") {
        next.social_battery = "";
        next.love_language  = "";
        next.need           = "";
      } else if (key === "social_battery") {
        next.love_language  = "";
        next.need           = "";
      } else if (key === "love_language") {
        next.need           = "";
      }
      return next;
    });
  }, [setResponsesMerged]);

  // Forward-only auto-advance guards (logs left in for now)
  useEffect(() => { dbg("step =", safeStep); }, [safeStep]);
  useEffect(() => { dbg("isWizard =", isWizard, "submissionStatus =", submissionStatus); }, [isWizard, submissionStatus]);
  useEffect(() => { dbg("responses.mood =", responses.mood); }, [responses.mood]);
  useEffect(() => { dbg("responses.social_battery =", responses.social_battery); }, [responses.social_battery]);
  useEffect(() => { dbg("responses.love_language =", responses.love_language); }, [responses.love_language]);
  useEffect(() => { dbg("responses.need =", responses.need); }, [responses.need]);

  useEffect(() => {
    if (!isWizard) return;
    if (safeStep === 1 && (responses.mood ?? "") !== "") {
      setStep(s => (s < 2 ? 2 : s));
    }
  }, [isWizard, safeStep, responses.mood, setStep]);

  useEffect(() => {
    if (!isWizard) return;
    if (safeStep === 2 && (responses.social_battery ?? "") !== "") {
      setStep(s => (s < 3 ? 3 : s));
    }
  }, [isWizard, safeStep, responses.social_battery, setStep]);

  useEffect(() => {
    if (!isWizard) return;
    if (safeStep === 3 && (responses.love_language ?? "") !== "") {
      setStep(s => (s < 4 ? 4 : s));
    }
  }, [isWizard, safeStep, responses.love_language, setStep]);

  useEffect(() => {
    if (!isWizard) return;
    if (safeStep === 4 && (responses.need ?? "") !== "") {
      setStep(s => (s < 5 ? 5 : s));
    }
  }, [isWizard, safeStep, responses.need, setStep]);

  /* ---------- Summary block ---------- */
  function renderSummaryBlock(editing, todayFlag) {
    return (
      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "1.5rem",
          padding: "2rem",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
          maxHeight: "75vh",
          overflowY: "auto",
          transition: "all 0.3s ease-in-out",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Your Check-In</h2>
        <ul style={{ paddingLeft: "1rem", marginTop: "1rem" }}>
          <InteractiveListItem icon="😊" label="Mood"            value={responses.mood}            step={1} onClick={setStep} isToday={todayFlag} setIsEditing={todayFlag ? setIsEditing : undefined} isEditing={editing} />
          <InteractiveListItem icon="🔋" label="Social Battery"  value={responses.social_battery}  step={2} onClick={setStep} isToday={todayFlag} setIsEditing={todayFlag ? setIsEditing : undefined} isEditing={editing} />
          <InteractiveListItem icon="💖" label="Love Language"   value={responses.love_language}   step={3} onClick={setStep} isToday={todayFlag} setIsEditing={todayFlag ? setIsEditing : undefined} isEditing={editing} />
          <InteractiveListItem icon="✨" label="Need"             value={responses.need}            step={4} onClick={setStep} isToday={todayFlag} setIsEditing={todayFlag ? setIsEditing : undefined} isEditing={editing} />
          <InteractiveListItem icon="📓" label="Journal"          value={responses.journal}         step={5} onClick={setStep} isToday={todayFlag} setIsEditing={todayFlag ? setIsEditing : undefined} isEditing={editing} />
        </ul>

        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 24 }}>
          <button onClick={() => setStep(4)} className="chip" style={{ border: "1px solid #444" }}>← Previous</button>
          {editing && <PrimaryButton onClick={handleSubmit}>Save Changes</PrimaryButton>}

          {activeTab?.toLowerCase() === "today" && editing && (
            <button
              onClick={() => {
                setIsReadOnlyView(false);
                setIsEditing(false);
                setStep(1);
                setSelectedDate(null);
                setActiveTab("calendar");
                setCurrentTab?.("calendar");
                setJournalDetails?.(null);
              }}
              className="chip"
              style={{ border: "1px solid #444", marginLeft: 8 }}
            >
              Back to Calendar
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- Submit ---------- */
  const handleSubmit = async () => {
    if (!userId) { 
      push("Please log in to save your check-in.", "info"); 
      return; 
    }

    const now = new Date();
    const oldJournal = existingEntry?.journal || "";

    // commit latest draft
    setResponsesMerged(r => (r.journal === journalDraft ? r : { ...r, journal: journalDraft }));

    const moodPayload = {
      user_id: userId,
      mood: responses.mood || null,
      social_battery: responses.social_battery || null,
      love_language: responses.love_language || null,
      need: responses.need || null,
      follow_up: responses.follow_up || null,
      journal: journalDraft || responses.journal || null,
    };

    try {
      let dbErr = null;

      if (existingEntry?.id && isToday) {
        const { error } = await supabase
          .from("moods")
          .update({ ...moodPayload, updated_at: now.toISOString() })
          .eq("id", existingEntry.id);
        dbErr = error || null;
        if (!dbErr) { setSubmissionStatus("updated"); push("Check-in updated.", "success"); }
      } else {
        const { data, error } = await supabase
          .from("moods")
          .insert([{ ...moodPayload, created_at: now.toISOString() }])
          .select()
          .maybeSingle();
        dbErr = error || null;
        if (!dbErr) { setExistingEntry(data || null); setSubmissionStatus("submitted"); push("Check-in saved.", "success"); }
      }

      if (dbErr) throw dbErr;

      // side-effects
      const savedId = existingEntry?.id
        ? existingEntry.id
        : (await supabase
            .from("moods")
            .select("id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          ).data?.id ?? null;

      if (savedId && (journalDraft || "").trim()) {
        try {
          await logJournalAnalysis(userId, savedId, journalDraft);
          await updateKeywordTracker(userId, journalDraft, oldJournal);
        } catch (e) { console.warn("Journal side-effects failed:", e); }
      }

      try { await supabase.rpc("rpc_update_user_stats", { p_user: userId, p_xp: 10 }); } catch (e) { console.warn("stats update failed", e); }
      try { await supabase.rpc("rpc_eval_achievements", { p_user: userId }); } catch {}

      setIsEditing(false);
      setIsReadOnlyView(true);
      setStep(0);
    } catch (err) {
      console.error("Failed to save check-in:", err);
      push("Could not save your check-in. Please try again.", "error");
    }
  };

  /* ---------- Render per step ---------- */
  const renderStep = () => {
    if (feedback) {
      return (
        <div>
          <h2>{feedback}</h2>
          <p style={{ marginTop: "1rem", fontStyle: "italic", whiteSpace: "pre-wrap", color: "#ccc", padding: "1rem", backgroundColor: "#1a1a1a", borderRadius: "0.75rem", border: "1px solid #333" }}>
            {responses.journal}
          </p>
          <button onClick={() => { setFeedback(""); setStep(5); }} className="chip">Edit Entry</button>
        </div>
      );
    }

    switch (safeStep) {
      case 0: {
        if (isToday && isEditing)       return renderSummaryBlock(true, true);
        if (isToday && hasSubmitted)    return renderSummaryBlock(false, true);
        if (!isToday || isReadOnlyView) return renderSummaryBlock(false, false);
        return null;
      }

      case 1:
        return (
          <>
            <h2>How are you feeling today?</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => selectAndMaybeNext("mood", m.value)}
                  style={pillStyle(responses.mood === m.value, theme)}
                  aria-pressed={responses.mood === m.value}
                >
                  <span style={{ fontSize: 20 }}>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2>What's your social energy level?</h2>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {BATTERY.map((b) => (
                <button
                  key={b.value}
                  onClick={() => selectAndMaybeNext("social_battery", b.value)}
                  style={pillStyle(responses.social_battery === b.value, theme)}
                  aria-pressed={responses.social_battery === b.value}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {!isWizard && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
                <button onClick={goPrev} className="chip">Back</button>
                <PrimaryButton onClick={handleSubmit}>Save Changes</PrimaryButton>
              </div>
            )}
          </>
        );

      case 3:
        return (
          <>
            <h2>What love language feels most relevant today?</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {LOVE_LANGS.map((ll) => (
                <button
                  key={ll}
                  onClick={() => selectAndMaybeNext("love_language", ll)}
                  style={pillStyle(responses.love_language === ll, theme)}
                  aria-pressed={responses.love_language === ll}
                >
                  {ll}
                </button>
              ))}
            </div>

            {!isWizard && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
                <button onClick={goPrev} className="chip">Back</button>
                <PrimaryButton onClick={handleSubmit}>Save Changes</PrimaryButton>
              </div>
            )}
          </>
        );

      case 4:
        return (
          <>
            <h2 style={{ marginTop: 0 }}>What do you need most right now?</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", margin: "14px 0 8px" }}>
              {NEEDS.map((n) => (
                <button
                  key={n.value}
                  onClick={() => selectAndMaybeNext("need", n.value)}
                  style={pillStyle(responses.need === n.value, theme)}
                  aria-pressed={responses.need === n.value}
                >
                  <span aria-hidden>{n.emoji}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>

            {!isWizard && (
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.75rem" }}>
                <PreviousButton onClick={goPrev} />
                <button
                  onClick={() => setStep(5)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: `1px solid ${theme?.border || "#444"}`,
                    background: theme?.accent || "#ffd75e",
                    color: theme?.background || "#0d0d0d",
                    fontWeight: 600,
                    minWidth: 140,
                    cursor: "pointer",
                    opacity: responses.need ? 1 : 0.75,
                  }}
                  disabled={!responses.need}
                >
                  Continue
                </button>
              </div>
            )}
          </>
        );

      case 5: {
        const showPromptPicker = haveAllSignals && isToday && !isReadOnlyView;

        return (
          <>
            <h2>Your Reflection</h2>

            {showPromptPicker && (
              <div
                style={{
                  border: `1px solid ${theme.border || "#444"}`,
                  background: theme.card || "rgba(255,255,255,.04)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                  textAlign: "left",
                }}
              >
                <div style={{ fontStyle: "italic" }}>
                  {followUpLoading ? "Crafting a gentle prompt…" : (followUpPrompt || "What’s on your heart today?")}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    className="chip"
                    disabled={loadingPrompt}
                    onClick={() => {
                      if (suggestedPrompt) {
                        setResponsesMerged(r => ({ ...r, follow_up: suggestedPrompt }));
                        setPromptSource(promptSource || "ai");
                      }
                    }}
                  >
                    {loadingPrompt ? "…" : "Use"}
                  </button>

                  <button className="chip" onClick={handleAnotherAngle} disabled={loadingPrompt}>
                    {loadingPrompt ? "Thinking…" : "Another angle"}
                  </button>

                  <button className="chip" onClick={() => setResponsesMerged(r => ({ ...r, follow_up: "" }))}>
                    No prompt
                  </button>
                </div>

                {promptSource && (
                  <div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>
                    Source: {promptSource === "ai" ? "AI" : "fallback"}
                  </div>
                )}
              </div>
            )}

            {responses.follow_up && (
              <p style={{ margin: "6px 0 10px", opacity: 0.9, fontStyle: "italic" }}>
                Prompt: {responses.follow_up}
              </p>
            )}

            <textarea
              placeholder="Write your thoughts here..."
              value={journalDraft}
              onChange={(e) => setJournalDraft(e.target.value)}
              readOnly={!isToday || isReadOnlyView}
              style={{
                display: "block",
                width: "min(720px, 100%)",
                minHeight: 160,
                margin: "12px auto",
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px solid ${theme?.border || "#555"}`,
                backgroundColor: "#111",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 16,
                lineHeight: 1.5,
                outline: "none",
                boxShadow: "0 4px 18px rgba(0,0,0,.35)",
              }}
            />

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center", marginTop: "1rem" }}>
              {isEditing && (
                <button
                  className="chip"
                  onClick={() => {
                    setResponsesMerged(r => (r.journal === journalDraft ? r : { ...r, journal: journalDraft }));
                    setStep(4);
                  }}
                >
                  Back
                </button>
              )}

              {isToday && !isReadOnlyView && (
                <button
                  className="btn btn--gold"
                  onClick={handleSubmit}
                  style={{ marginTop: 0, opacity: isJournalFilled ? 1 : 0.7 }}
                >
                  {isJournalFilled
                    ? (existingEntry ? "Update Entry" : "Submit Entry")
                    : "Submit Without Entry"}
                </button>
              )}
            </div>

            {isToday && !responses.journal?.trim() && !isReadOnlyView && (
              <p style={{ marginTop: "0.5rem", color: "#aaa" }}>
                You can submit your check-in without a journal entry.
              </p>
            )}
          </>
        );
      }

      default:
        return <p>Something went wrong</p>;
    }
  };

  /* ---------- Render shell ---------- */
  const isLoading = submissionStatus === null || responses === null;
  const isEmbedded = variant === "embedded";
  const wrapperStyle = isEmbedded
    ? { backgroundColor: "transparent", padding: 0, borderRadius: 0, color: "#fff", maxWidth: "100%", margin: 0, textAlign: "center" }
    : { backgroundColor: "#0e0e0e", padding: "2rem", borderRadius: "1.5rem", color: "#fff", boxShadow: "0 0 12px rgba(0,0,0,0.4)", maxWidth: "600px", margin: "0 auto", textAlign: "center" };

  return (
    <div style={wrapperStyle}>
      {isEmbedded && title ? (
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, textAlign: "left" }}>{title}</h3>
      ) : null}

      {isLoading ? (
        <p>Loading your check-in...</p>
      ) : isReadOnlyView && safeStep === 0 ? (
        renderSummaryBlock(false, isToday)
      ) : (
        renderStep()
      )}
    </div>
  );
}

/* ---------- Small helper used in summary list ---------- */
function InteractiveListItem({
  icon,
  label,
  value,
  step,
  onClick,
  isToday,
  setIsEditing,
  isEditing,
}) {
  return (
    <li
      style={{
        listStyle: "none",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span>{icon}</span>
      <strong style={{ width: 140 }}>{label}:</strong>
      <span style={{ opacity: 0.9 }}>{value || "—"}</span>
      {isToday && (
        <button
          className="chip"
          onClick={() => {
            setIsEditing?.(true);
            onClick(step);
          }}
          style={{ marginLeft: "auto" }}
        >
          {isEditing ? "Edit" : "Change"}
        </button>
      )}
    </li>
  );
}
