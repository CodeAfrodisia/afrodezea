// src/components/profile/widgets/AffirmationWidget.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import PlaceholderCard from "../PlaceholderCard.jsx";

export default function AffirmationWidget({ userId }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        if (!userId) return;
        // Example schema: table daily_affirmations (user_id, text, created_at, is_public)
        const { data, error } = await supabase
          .from("daily_affirmations")
          .select("text, created_at")
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw error;
        if (!alive) return;
        setText(data?.[0]?.text || "");
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load affirmation.");
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  return (
    <PlaceholderCard title="Daily Affirmation">
      {err && <div style={{ opacity: .85, marginBottom: 8 }}>{err}</div>}
      {text ? (
        <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>
          “{text}”
        </blockquote>
      ) : (
        <div style={{ opacity: 0.75 }}>No affirmation shared yet.</div>
      )}
    </PlaceholderCard>
  );
}

