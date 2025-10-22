// src/components/profile/widgets/AchievementsWidget.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import PlaceholderCard from "../PlaceholderCard.jsx";

export default function AchievementsWidget({ userId, compact = false }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        if (!userId) return;
        // Example: a public view that returns completed achievements for a user
        const { data, error } = await supabase
          .from("user_achievements_public")
          .select("id, completed_at, achievement:achievements (name, icon)")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .limit(compact ? 6 : 12);
        if (error) throw error;
        if (!alive) return;
        setRows(data || []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load achievements.");
      }
    })();
    return () => { alive = false; };
  }, [userId, compact]);

  const empty = rows.length === 0;

  return (
    <PlaceholderCard title="Achievements">
      {err && <div style={{ opacity: .85, marginBottom: 8 }}>{err}</div>}
      {empty ? (
        <div style={{ opacity: 0.75 }}>No achievements shared yet.</div>
      ) : (
        <div style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
        }}>
          {rows.map((r) => (
            <div key={r.id} className="surface" style={{ padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 22 }}>{r.achievement?.icon || "🏅"}</div>
              <div style={{ fontWeight: 600, marginTop: 6 }}>
                {r.achievement?.name || "Achievement"}
              </div>
              {!compact && r.completed_at && (
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {new Date(r.completed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PlaceholderCard>
  );
}

