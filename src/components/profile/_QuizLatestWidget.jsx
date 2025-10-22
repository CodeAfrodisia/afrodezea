// src/components/profile/_QuizLatestWidget.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import ResultCard from "@components/quizzes/ResultCard.jsx";

export default function QuizLatestWidget({ userId, quizSlug }) {
  const [attempt, setAttempt] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let q = supabase
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
          .limit(1);

        if (quizSlug) {
          // note: this requires your schema to allow nested filter
          q = q.eq("quiz.slug", quizSlug);
        }

        const { data, error } = await q;
        if (error) throw error;

        let row = data?.[0] || null;

        if (!row && quizSlug) {
          // fallback filter if nested filter isn’t supported
          const { data: all } = await supabase
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
            .limit(20);
          row = (all || []).find((r) => r?.quiz?.slug === quizSlug) || null;
        }

        if (!alive) return;
        setAttempt(row || null);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load quiz attempt.");
      }
    })();
    return () => { alive = false; };
  }, [userId, quizSlug]);

  if (err) return <div style={{ opacity: 0.8 }}>Error: {err}</div>;
  if (!attempt) return <div style={{ opacity: 0.8 }}>No public results yet.</div>;

  return <ResultCard attempt={attempt} />;
}

