// @context/DashboardContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@context/AuthContext.jsx";
import { supabase } from "@lib/supabaseClient.js";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setProfile(null);
    setStats(null);
    setAchievements([]);
    setError("");
    setLoading(false);
  };

  const fetchAll = useCallback(async () => {
    if (!userId) {
      reset();
      return;
    }

    setLoading(true);
    setError("");

    try {
      // profiles.id is the FK for stats/achievements
      const { data: profileRow, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) throw profileErr;

      const [{ data: statsRow, error: statsErr }, { data: achRows, error: achErr }] =
        await Promise.all([
          supabase.from("user_stats").select("*").eq("user_id", profileRow.id).maybeSingle(),
          supabase
            .from("user_achievements")
            .select("*, achievements(*)")
            .eq("user_id", profileRow.id)
            .order("unlocked_at", { ascending: false }),
        ]);

      if (statsErr) throw statsErr;
      if (achErr) throw achErr;

      setProfile(profileRow || null);
      setStats(statsRow || null);
      setAchievements(Array.isArray(achRows) ? achRows : []);
    } catch (e) {
      console.error("[DashboardProvider] fetchAll error:", e);
      setError(e?.message || "Something went wrong loading your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      reset();
      return;
    }
    fetchAll();
  }, [userId, fetchAll]);

  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const nextLevelXp = stats?.next_level_xp ?? null; // adjust to your schema

  const value = {
    userId,
    profile,
    stats,
    xp,
    level,
    nextLevelXp,
    achievements,
    loading,
    error,
    refreshDashboard: fetchAll,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

