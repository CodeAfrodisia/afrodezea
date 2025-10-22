// src/components/account/CalendarTab.jsx
import { useEffect, useState, useRef } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameDay } from "date-fns";
import { supabase } from "@lib/supabaseClient.js";

export default function CalendarTab({
  userId,
  setCurrentTab,
  setResponses,
  setIsEditing,
  setIsReadOnlyView,
  setSelectedDate,
  selectedDate,
  setActiveTab,
  activeTab,
  setStep,
  hasManuallySetStep,
  submissionStatus,
  setSubmissionStatus,
}) {
  const [moodEntries, setMoodEntries] = useState([]);
  const manuallySelectedRef = useRef(false);
  const [journalDetails, setJournalDetails] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);

  const month = currentMonth.getMonth();
  const year  = currentMonth.getFullYear();

  const getBatteryHeight = (level) => {
    switch ((level || "").toLowerCase()) {
      case "low": return "33%";
      case "medium": return "66%";
      case "high": return "100%";
      default: return "0";
    }
  };

  const loveLangColorMap = {
    "Words of Affirmation": "#3b82f6",
    "Physical Touch": "#ef4444",
    "Receiving Gifts": "#facc15",
    "Acts of Service": "#10b981",
    "Quality Time": "#a855f7",
  };

  // For tooltips, etc.
  const emojiForMood = (mood) =>
    ({
      happy:"😊", loved:"🥰", calm:"😌", grateful:"😇", neutral:"😐",
      overwhelmed:"😵‍💫", silly:"🤡", sad:"😔", drained:"🫠", frustrated:"😤"
    }[(mood||"").toLowerCase()] || "🧘");

  const heartForLoveLanguage = (lang) =>
    ({
      "Words of Affirmation":"💙","Physical Touch":"❤️","Receiving Gifts":"💛","Acts of Service":"💜","Quality Time":"💚",
    }[lang] || "🤍");

  const batteryForLevel = (lvl) =>
    ({ low:"🔋", medium:"🔋🔋", high:"🔋🔋🔋" }[(lvl||"").toLowerCase()] || "🔋");

  // Fetch month
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const from = startOfMonth(currentMonth).toISOString();
      const to   = endOfMonth(currentMonth).toISOString();
      const { data, error } = await supabase
        .from("moods")
        .select("id, created_at, mood, love_language, journal, social_battery")
        .eq("user_id", userId)
        .gte("created_at", from)
        .lte("created_at", to);
      if (error) console.error("Error fetching mood data:", error);
      else setMoodEntries(data || []);
    })();
  }, [userId, currentMonth]);

  // Clear selection when switching to calendar (unless manually set)
  useEffect(() => {
    if (activeTab === "calendar") {
      if (!manuallySelectedRef.current) {
        setSelectedDate(null);
        setJournalDetails(null);
      }
    }
  }, [activeTab, setSelectedDate]);

  // Group by local date
  const groupedByDate = moodEntries.reduce((acc, entry) => {
    const d = new Date(entry.created_at);
    const localDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = format(localDate, "yyyy-MM-dd");
    acc[key] = {
      id: entry.id,
      mood: entry.mood,
      loveLanguage: entry.love_language,
      battery: entry.social_battery,
    };
    return acc;
  }, {});

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // If a submission just happened for *today*, push TodayTab to step 1 (start flow)
  useEffect(() => {
    const today = new Date();
    const isTodaySubmitted = submissionStatus === "submitted";
    if (isTodaySubmitted) {
      setStep(1);
      setIsEditing(true);
    }
  }, [submissionStatus, setStep, setIsEditing]);

  // Journal lookup (joins journal_analysis->moods)
  const getJournalEntryForDate = async (dateStr) => {
    const mood = groupedByDate[dateStr];
    if (!mood?.id) return null;

    const { data: analysisData, error: analysisError } = await supabase
      .from("journal_analysis")
      .select("id, created_at, top_keywords, mood_id")
      .eq("user_id", userId)
      .eq("mood_id", mood.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (analysisError) {
      console.error("journal_analysis fetch:", analysisError);
      return null;
    }

    const analysisEntry = analysisData?.[0];
    if (!analysisEntry) return null;

    const { data: moodData, error: moodError } = await supabase
      .from("moods")
      .select("journal")
      .eq("id", analysisEntry.mood_id)
      .single();

    if (moodError) {
      console.error("moods fetch:", moodError);
      return null;
    }

    return { ...analysisEntry, journal: moodData?.journal || null };
  };

  const handleDateClick = async (dateStr) => {
    if (!groupedByDate[dateStr]) return; // no entry, no modal
    manuallySelectedRef.current = true;
    setModalOpen(true);

    const details = await getJournalEntryForDate(dateStr);
    setJournalDetails(details || null);

    const noonLocal = new Date(`${dateStr}T12:00:00`);
    setSelectedDate(noonLocal);

    const isForToday = isSameDay(noonLocal, new Date());
    setIsReadOnlyView(!isForToday);
    setIsEditing(isForToday);
  };

  // Modal
  const Modal = () => {
    if (!selectedDate || !modalOpen) return null;
    const dateKey = format(new Date(selectedDate), "yyyy-MM-dd");
    const entry = groupedByDate[dateKey];

    return (
      <div
        style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.75)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
        }}
        onClick={() => { setSelectedDate(null); setJournalDetails(null); setModalOpen(false); }}
      >
        <div
          style={{ background:"#1a1a1a", padding:"2rem", borderRadius:12, width:"90%", maxWidth:420, color:"#fff" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ marginBottom:12 }}>{format(new Date(selectedDate), "MMMM d, yyyy")}</h3>

          <p>{entry?.mood ? `${emojiForMood(entry.mood)} Mood: ` : "Mood: "}
            <strong>{entry?.mood || "Not recorded"}</strong>
          </p>
          <p>{entry?.loveLanguage ? `${heartForLoveLanguage(entry.loveLanguage)} Love Language: ` : "Love Language: "}
            <strong>{entry?.loveLanguage || "Not recorded"}</strong>
          </p>
          <p>{entry?.battery ? `${batteryForLevel(entry.battery)} Social Battery: ` : "Social Battery: "}
            <strong>{entry?.battery || "Not recorded"}</strong>
          </p>

          {journalDetails ? (
            <>
              <p style={{ marginTop:12 }}>🧠 <strong>Top Keywords:</strong></p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
                {journalDetails.top_keywords.map((kw, i) => (
                  <span key={i} style={{ background:"#2e2e2e", border:"1px solid #555", padding:"6px 10px", borderRadius:999 }}>{kw}</span>
                ))}
              </div>

              {journalDetails.journal && (
                <button
                  onClick={() => {
                    hasManuallySetStep.current = true;
                    const noon = new Date(`${dateKey}T12:00:00`);
                    const isToday = isSameDay(noon, new Date());

                    setSelectedDate(noon);
                    setIsReadOnlyView(!isToday);
                    setActiveTab("today");

                    if (isToday) { setIsEditing(true); setStep(0); }
                    else { setIsEditing(false); setStep(5); }

                    const mood = entry?.mood || "Not recorded";
                    const loveLanguage = entry?.loveLanguage || "Not recorded";
                    const battery = entry?.battery || "Not recorded";
                    const journal = journalDetails?.journal || "No journal entry was written.";

                    setResponses({ mood, love_language: loveLanguage, social_battery: battery, follow_up: "", journal });
                  }}
                  className="btn"
                  style={{ marginTop: 16 }}
                >
                  {isSameDay(new Date(), new Date(selectedDate)) ? "Edit Entry" : "View Full Entry"}
                </button>
              )}
            </>
          ) : (
            <p style={{ color:"#777", marginTop:12 }}>No journal entry found.</p>
          )}
        </div>
      </div>
    );
  };

  // Render
  return (
    <div style={{ width:"100%", display:"flex", justifyContent:"center", maxHeight:"70vh", overflowY:"auto", paddingBottom:16 }}>
      <div style={{ width:"100%", maxWidth:480 }}>

        {/* Month header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn btn--ghost">←</button>
          <h2 style={{ fontSize:"1.2rem" }}>{format(currentMonth, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn btn--ghost">→</button>
        </div>

        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:10 }}>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateObj = new Date(year, month, i + 1);
            const key = format(dateObj, "yyyy-MM-dd");
            const entry = groupedByDate[key];
            const borderColor = entry?.loveLanguage ? (loveLangColorMap[entry.loveLanguage] || "#333") : "#333";
            const isTodayCell = isSameDay(dateObj, new Date());

            return (
              <div
                key={key}
                onClick={() => entry && handleDateClick(key)}
                title={entry ? `${entry.mood} | ${entry.loveLanguage} | Battery: ${entry.battery}` : "No entry"}
                style={{
                  background:"#1a1a1a",
                  border:`2px solid ${borderColor}`,
                  borderRadius:12,
                  height:"3.5rem",
                  color:"#fff",
                  position:"relative",
                  boxShadow: isTodayCell ? "0 0 10px rgba(0,255,255,0.35)" : entry ? `${borderColor}55 0 0 8px` : "none",
                  cursor: entry ? "pointer" : "default",
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}
              >
                {entry?.battery && (
                  <div style={{
                    position:"absolute", left:0, bottom:0, width:"100%",
                    height: getBatteryHeight(entry.battery),
                    background: entry.battery.toLowerCase() === "high"
                      ? "linear-gradient(to top, rgba(0,255,170,.4), rgba(0,255,170,.15))"
                      : "#00FFAA44",
                    borderBottomLeftRadius:12, borderBottomRightRadius:12,
                    transition:"height .3s"
                  }}/>
                )}
                <div style={{ position:"relative", zIndex:1 }}>
                  {entry?.mood && <span style={{ position:"absolute", inset:"-10px 0 0 0", opacity:.25 }}>{emojiForMood(entry.mood)}</span>}
                  <strong>{i + 1}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop:12, fontSize:12, opacity:.8, textAlign:"center" }}>
          <p><strong>Legend:</strong></p>
          <p>💙 Words • ❤️ Touch • 💛 Gifts • 💜 Service • 💚 Time</p>
          <p>🔋 Low | 🔋🔋 Medium | 🔋🔋🔋 High</p>
        </div>

        <Modal />
      </div>
    </div>
  );
}

