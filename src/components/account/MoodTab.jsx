// src/components/account/MoodTab.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import CalendarTab from "@components/account/CalendarTab.jsx";
import TodayTab from "@components/account/TodayTab.jsx";
import AffirmationTab from "@components/account/AffirmationTab.jsx";
import StatsTab from "@components/achievements/Tab_Stats.jsx";
import InsightsTab from "@components/account/InsightsTab.jsx";
import { format, isSameDay } from "date-fns";
import { supabase } from "@lib/supabaseClient.js";
import { useTheme as useThemeCtx, defaultTheme } from "@lib/useTheme.jsx";

export default function MoodTab({ userId, archetype, theme: themeProp }) {
  // 🎛️ Tabs
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentTab, setCurrentTab] = useState("Today");

  // 🧠 Unified responses shape (snake_case keys expected by TodayTab)
  const [responses, setResponses] = useState({
    mood: "",
    social_battery: "",
    love_language: "",
    need: "",
    follow_up: "",
    journal: "",
  });

  // 🎨 Theme (prop → context → default)
  const themeFromContext = (() => {
    try {
      return useThemeCtx?.();
    } catch {
      return null;
    }
  })();
  const theme = themeProp || themeFromContext || defaultTheme;

  // ✍️ Edit / View state
  const [isEditing, setIsEditing] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // 📅 Selected date + step flow
  const [selectedDate, setSelectedDate] = useState(null);
  const [step, setStep] = useState(0);
  const hasManuallySetStep = useRef(false);

  // 📜 Data
  const [moodEntries, setMoodEntries] = useState([]);
  const [journalDetails, setJournalDetails] = useState(null);

  // ✅ Own submission status here and pass down
  const [submissionStatus, setSubmissionStatus] = useState(null);

  // Group entries by local day
  const groupedByDate = useMemo(() => {
    if (!moodEntries || moodEntries.length === 0) return {};
    return moodEntries.reduce((acc, entry) => {
      const utcDate = new Date(entry.created_at);
      const localDate = new Date(
        utcDate.getFullYear(),
        utcDate.getMonth(),
        utcDate.getDate()
      );
      const date = format(localDate, "yyyy-MM-dd");
      acc[date] = {
        id: entry.id,
        mood: entry.mood,
        loveLanguage: entry.love_language,
        battery: entry.social_battery,
      };
      return acc;
    }, {});
  }, [moodEntries]);

  // Initialize submissionStatus when we know selectedDate
  useEffect(() => {
    if (submissionStatus === null && selectedDate) {
      const day = format(new Date(selectedDate), "yyyy-MM-dd");
      const exists = !!groupedByDate?.[day];
      setSubmissionStatus(exists ? "exists" : "new");
    }
  }, [submissionStatus, selectedDate, groupedByDate]);

  // When switching into "today", prep state
  useEffect(() => {
    if (
      activeTab === "today" &&
      (!selectedDate || isSameDay(new Date(), new Date(selectedDate)))
    ) {
      const today = new Date();
      setSelectedDate(today);

      const todayStr = format(today, "yyyy-MM-dd");
      const entryExists = !!groupedByDate?.[todayStr];

      if (entryExists) {
        // Show summary but allow editing
        setIsReadOnlyView(true);
        setIsEditing(true);
        setStep(0);
      } else {
        // Start fresh flow
        setIsReadOnlyView(false);
        setIsEditing(true);
        setStep(1);
      }
    }
  }, [activeTab, selectedDate, groupedByDate]);

  // Load entries for user
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("moods")
        .select("*")
        .eq("user_id", userId);
      if (!error) setMoodEntries(data || []);
    })();
  }, [userId]);

  // Keep summary on today if an entry exists
  useEffect(() => {
    if (
      activeTab === "today" &&
      selectedDate &&
      isSameDay(new Date(), new Date(selectedDate))
    ) {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const entryExists = !!groupedByDate?.[todayStr];
      if (entryExists) setStep(0);
    }
  }, [selectedDate, activeTab, groupedByDate]);

  // Tab switching
  const handleTabClick = (id) => {
    setActiveTab(id);
    if (id === "today") {
      const today = new Date();
      setSelectedDate(today);
      const isT = isSameDay(today, new Date());
      setIsEditing(isT);
      setIsReadOnlyView(!isT);
    }
  };

  // Render selected tab
  const renderTab = () => {
    switch (activeTab) {
      case "today":
        return (
          <TodayTab
            userId={userId}
            step={step}
            setStep={setStep}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            responses={responses}
            setResponses={setResponses}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            isReadOnlyView={isReadOnlyView}
            setIsReadOnlyView={setIsReadOnlyView}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            setJournalDetails={setJournalDetails}
            journalDetails={journalDetails}
            hasManuallySetStep={hasManuallySetStep}
            submissionStatus={submissionStatus}
            setSubmissionStatus={setSubmissionStatus}
            theme={theme}
          />
        );
      case "calendar":
        return (
          <CalendarTab
            userId={userId}
            setCurrentTab={setCurrentTab}
            setResponses={setResponses}
            setIsEditing={setIsEditing}
            setIsReadOnlyView={setIsReadOnlyView}
            setSelectedDate={setSelectedDate}
            selectedDate={selectedDate}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            setStep={setStep}
            hasManuallySetStep={hasManuallySetStep}
          />
        );
      case "stats":
        return <StatsTab userId={userId} />;
      case "affirmation":
        return <AffirmationTab userId={userId} archetype={archetype} />;
      case "insights":
        return <InsightsTab userId={userId} />;
      default:
        return null;
    }
  };

  // Shell
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        backgroundColor: theme.background,
        padding: "2rem 1rem 1.5rem",
        borderRadius: "24px",
        boxShadow: "0 0 20px rgba(0,0,0,0.5)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "560px",
        overflow: "visible",
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "2rem",
        }}
      >
        {[
          { id: "today", label: "Today" },
          { id: "calendar", label: "Calendar" },
          { id: "stats", label: "Stats" },
          { id: "affirmation", label: "Affirmation" },
          { id: "insights", label: "Insights" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "16px",
              backgroundColor:
                activeTab === tab.id ? theme.primary : "transparent",
              color: activeTab === tab.id ? theme.background : theme.text,
              border: `1px solid ${theme.border}`,
              fontSize: "16px",
              fontFamily: "Cormorant Garamond, serif",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ width: "100%", boxSizing: "border-box" }}>{renderTab()}</div>
    </div>
  );
}
