// src/components/profile/widgets/QuizWidget.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import ResultCard from "@components/quizzes/ResultCard.jsx";
import PlaceholderCard from "../PlaceholderCard.jsx";

/**
 * Props:
 * - userId: profile owner
 * - refId?: specific quiz_attempts.id (uuid) — if provided, show that attempt
 * - single?: boolean — if true, force 1 card; otherwise show latest 1–3 public attempts
 */
export default function QuizWidget({ userId, refId = null, single = false }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        if (!userId) return;

        if (refId) {
          const { data, error } = await supabase
            .from("quiz_attempts")
            .select(`
              id,
              result_title,
              result_summary,
              completed_at,
              is_public,
              quiz:quiz_id ( id, slug, title )
            `)
            .eq("id", refId)
            .eq("is_public", true)
            .maybeSingle();
          if (error) throw error;
          if (!alive) return;
          setRows(data ? [data] : []);
          return;
        }

        const { data, error } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            result_title,
            result_summary,
            completed_at,
            is_public,
            quiz:quiz_id ( id, slug, title )
          `)
          .eq("user_id", userId)
          .eq("is_public", true)
          .order("completed_at", { ascending: false })
          .limit(single ? 1 : 3);
        if (error) throw error;
        if (!alive) return;
        setRows(data || []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load quiz results.");
      }
    })();
    return () => { alive = false; };
  }, [userId, refId, single]);

  return (
    <PlaceholderCard title="Quizzes">
      {err && <div style={{ opacity: .85, marginBottom: 8 }}>{err}</div>}
      {rows.length === 0 ? (
        <div style={{ opacity: 0.75 }}>No shared results yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => (
            <ResultCard key={r.id} attempt={r} />
          ))}
        </div>
      )}
    </PlaceholderCard>
  );
}

