// /components/achievements/Tab_Stats.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { format } from "date-fns";
import { useAuth } from "@context/AuthContext.jsx";

export default function StatsTab({ userId: userIdProp }) {
  const { user } = useAuth();
  const userId = userIdProp ?? user?.id;

  const [moodCounts, setMoodCounts] = useState({});
  const [loveLanguageCounts, setLoveLanguageCounts] = useState({});
  const [socialBatteryAverage, setSocialBatteryAverage] = useState(null);
  const [stats, setStats] = useState(null);

  const moodMap = {
    "😊": "Happy",
    "🥰": "Loved",
    "😌": "Calm",
    "😇": "Grateful",
    "😐": "Meh",
    "😵‍💫": "Overwhelmed",
    "🤡": "Clownlike",
    "😔": "Sad",
    "🫠": "Melting",
    "😤": "Frustrated",
  };

  const validLoveLanguages = [
    "Acts of Service",
    "Quality Time",
    "Words of Affirmation",
    "Receiving Gifts",
    "Physical Touch",
  ];

  const getBatteryLabel = (avg) => {
    if (avg >= 2.5) return "Mostly High";
    if (avg >= 1.5) return "Mostly Medium";
    return "Mostly Low";
  };

  // Fetch user_stats (xp, streak, etc.)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error) setStats(data);
    })();
  }, [userId]);

  // Fetch mood-derived stats
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("moods")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching mood data:", error);
        return;
      }

      const latestValidEntryPerDay = {};
      const moodFreq = {};
      const loveFreq = {};
      const batteryValues = [];

      data.forEach((entry) => {
        const date = format(new Date(entry.created_at), "yyyy-MM-dd");
        const isNewer =
          !latestValidEntryPerDay[date] ||
          new Date(entry.created_at) >
            new Date(latestValidEntryPerDay[date].created_at);

        if (isNewer) latestValidEntryPerDay[date] = entry;
      });

      Object.values(latestValidEntryPerDay).forEach((entry) => {
        const mood = (entry.mood || "").trim();
        const batteryRaw = (entry.social_battery || "").trim().toLowerCase();
        const batteryMap = { low: 1, medium: 2, high: 3 };

        const matchedEmoji = Object.entries(moodMap).find(
          ([emoji, label]) =>
            mood === emoji || mood.toLowerCase() === label.toLowerCase()
        )?.[0];

        if (matchedEmoji) {
          moodFreq[matchedEmoji] = (moodFreq[matchedEmoji] || 0) + 1;
        }

        const batteryNum = batteryMap[batteryRaw];
        if (batteryNum) batteryValues.push(batteryNum);

        if (validLoveLanguages.includes(entry.love_language)) {
          loveFreq[entry.love_language] =
            (loveFreq[entry.love_language] || 0) + 1;
        }
      });

      const average =
        batteryValues.length > 0
          ? (
              batteryValues.reduce((sum, val) => sum + val, 0) /
              batteryValues.length
            ).toFixed(1)
          : null;

      setMoodCounts(moodFreq);
      setLoveLanguageCounts(loveFreq);
      setSocialBatteryAverage(average);
    })();
  }, [userId]);

  function XPBar({ value = 0, max = 100 }) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    return (
      <div
        style={{
          height: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,.08)",
          border: "1px solid rgba(255,255,255,.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--gold,#ffd75e)",
          }}
        />
      </div>
    );
  }

  const renderMoodCounts = (counts) =>
    Object.entries(counts).map(([emoji, count]) => (
      <li key={emoji}>
        {emoji} {moodMap[emoji]}: <strong>{count}</strong>
      </li>
    ));

  const renderCounts = (counts) =>
    Object.entries(counts).map(([key, count]) => (
      <li key={key}>
        {key}: <strong>{count}</strong>
      </li>
    ));

  if (!userId) {
    return (
      <div style={{ color: "white", padding: "2rem" }}>
        Loading statistics...
      </div>
    );
  }

  return (
    <div style={{ color: "white", padding: "2rem" }}>
      {/* Progress */}
      <div style={{ marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>Progress</h2>
        <div style={{ marginTop: 8, opacity: 0.9 }}>
          XP: <strong>{stats?.xp ?? 0}</strong>
        </div>
        <div style={{ marginTop: 6, maxWidth: 420 }}>
          <XPBar value={stats?.xp ?? 0} max={stats?.tier_xp ?? 100} />
        </div>
        <div style={{ marginTop: 10, opacity: 0.9 }}>
          Streak: <strong>{stats?.days_streak ?? 0}</strong> day
          {(stats?.days_streak ?? 0) === 1 ? "" : "s"}
        </div>
      </div>

      {/* Mood Stats */}
      <h2 style={{ marginTop: 24 }}>Mood Stats</h2>
      {Object.keys(moodCounts).length > 0 ? (
        <ul>{renderMoodCounts(moodCounts)}</ul>
      ) : (
        <p>No mood data</p>
      )}

      {/* Love Language */}
      <h2>Love Language Trends</h2>
      {Object.keys(loveLanguageCounts).length > 0 ? (
        <ul>{renderCounts(loveLanguageCounts)}</ul>
      ) : (
        <p>No love language data</p>
      )}

      {/* Battery */}
      <h2>Average Social Battery</h2>
      {socialBatteryAverage !== null ? (
        <p>
          <strong>{socialBatteryAverage} / 3</strong> –{" "}
          {getBatteryLabel(Number(socialBatteryAverage))}
          <br />
          <span style={{ fontSize: "0.9rem", color: "#aaa" }}>
            (1 = Low, 2 = Medium, 3 = High)
          </span>
        </p>
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}
