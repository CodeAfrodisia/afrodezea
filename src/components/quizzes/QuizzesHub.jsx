// src/components/quizzes/QuizzesHub.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@lib/supabaseClient.js";
import QuizCatalog from "@components/quizzes/QuizCatalog.jsx";

// Optional: tiny blurbs to enrich DB rows that don't have one
const BLURBS = {
  "afrodezea-archetype": "Meet your core role & element.",
  "soul-connection": "A gentle read on the bond between you.",
  "love-language": "How you most naturally give & receive love.",
  "forgiveness-language": "What repair feels most sincere to you.",
  "attachment-style": "A snapshot of closeness, distance, and safety.",
};

// Example local fallback if DB returns nothing
const QUIZZES = [
  { slug: "afrodezea-archetype", title: "Your Afrodezea Archetype", category: "Archetypal", blurb: BLURBS["afrodezea-archetype"] },
  { slug: "soul-connection", title: "What Kind of Soul Connection Do You Share?", category: "Archetypal", blurb: BLURBS["soul-connection"] },
  { slug: "love-language", title: "What Is Your Love Language?", category: "Connection", blurb: BLURBS["love-language"] },
  { slug: "forgiveness-language", title: "What’s Your Forgiveness Language?", category: "Communication", blurb: BLURBS["forgiveness-language"] },
  { slug: "attachment-style", title: "What Is Your Attachment Style?", category: "Identity", blurb: BLURBS["attachment-style"] },
];

export default function QuizzesHub() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, slug, title, is_published, category, description")
        .eq("is_published", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

      if (alive) {
        if (!error && Array.isArray(data)) setQuizzes(data);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Normalize into the shape QuizCatalog expects
  const catalogData = useMemo(() => {
    if (quizzes?.length) {
      return quizzes.map(q => ({
        slug: q.slug,
        title: q.title,
        category: q.category || "Other",
        blurb: q.description?.trim?.() || BLURBS[q.slug] || "",
      }));
    }
    // fallback to local list if DB empty
    return QUIZZES;
  }, [quizzes]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <section className="plate plate--charcoal group--corners" style={{ padding: 16 }}>
      <span className="corners" />
      <div className="section-title" style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Quizzes</h3>
        <span className="rule" />
      </div>

      <QuizCatalog quizzes={catalogData} />
    </section>
  );
}
