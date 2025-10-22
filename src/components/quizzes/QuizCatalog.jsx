// src/components/quizzes/QuizCatalog.jsx
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";

/**
 * props.quizzes should look like:
 * [
 *   { slug: "afrodezea-archetype", title: "Your Afrodezea Archetype", category: "Archetypal", blurb: "Meet your core role & element." },
 *   { slug: "love-language", title: "What Is Your Love Language?", category: "Connection", blurb: "How you most naturally give/receive." },
 *   ...
 * ]
 */
export default function QuizCatalog({ quizzes = [] }) {
  // Group quizzes by category
  const groups = useMemo(() => {
    const g = new Map();
    quizzes.forEach(q => {
      const key = q.category || "Other";
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(q);
    });
    return Array.from(g.entries()); // [ [category, items], ... ]
  }, [quizzes]);

  // Open state per category; default open everything
  const [open, setOpen] = useState(() =>
    Object.fromEntries(groups.map(([cat]) => [cat, true]))
  );

  return (
    <section className="quiz-catalog">
      {groups.map(([category, items]) => (
        <div key={category} className="quiz-cat">
          {/* Category header (accordion) */}
          <button
            className="quiz-cat__header"
            onClick={() => setOpen(o => ({ ...o, [category]: !o[category] }))}
            aria-expanded={!!open[category]}
          >
            <span className="quiz-cat__title">{category}</span>
            <span className="quiz-cat__chev" aria-hidden>{open[category] ? "–" : "+"}</span>
          </button>

          {/* Card grid */}
          {open[category] && (
            <div className="quiz-grid">
              {items.map(q => (
                <article key={q.slug} className="quiz-card">
                  <div className="quiz-card__top">
                    <div className="quiz-card__icon" aria-hidden>✦</div>
                    <h3 className="quiz-card__title">{q.title}</h3>
                  </div>
                  {q.blurb ? (
                    <p className="quiz-card__blurb">{q.blurb}</p>
                  ) : null}

                  <div className="quiz-card__actions">
                    <Link
                      to={`/quizzes/${q.slug}`}
                      className="btn btn-action"
                      aria-label={`Take ${q.title}`}
                    >
                      Take Quiz
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

