// src/components/profile/ProfileWidgetRenderer.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";

// Existing components you already have:
import DailyAffirmation from "@components/account/DailyAffirmation.jsx";
import PublicFavorites from "@components/account/PublicFavorites.jsx";
import BreathCard from "@components/account/BreathCard.jsx";
import ResultCard from "@components/quizzes/ResultCard.jsx";

/**
 * Props:
 *  - widget: {
 *      id, widget_key, payload?: any, size?: 'sm'|'md'|'lg'|'xl', position?: number, is_public?: boolean
 *    }
 *  - userId: uuid of profile owner
 *  - theme: optional theme tokens
 */
export default function ProfileWidgetRenderer({ widget, userId, theme }) {
  const key = (widget?.widget_key || "").toLowerCase();
  const payload = widget?.payload || {};

  // Simple Card wrapper to keep a cohesive look
  function Card({ children, style }) {
    return (
      <div
        className="surface"
        style={{
          padding: 16,
          borderRadius: 16,
          border: "1px solid var(--hairline)",
          background: "rgba(255,255,255,.03)",
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  // Small header helper
  function Header({ title, cta }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        {cta || null}
      </div>
    );
  }

  // Render by widget_key
  switch (key) {
    /** ---------------------------
     *  TODAY CHECK-IN SHORTCUT
     *  widget_key: "today"
     *  payload: { label?: string, note?: string }
     *  -------------------------- */
    case "today": {
      const label = payload.label || "Ready to check in for today?";
      const note  = payload.note  || "Open your private check-in to log your mood and reflections.";
      return (
        <Card>
          <Header
            title="Today"
            cta={
              <Link to="/account/check-in" className="btn btn--ghost">
                Open Today
              </Link>
            }
          />
          <div style={{ opacity: 0.85 }}>{label}</div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>{note}</div>
        </Card>
      );
    }

    /** ---------------------------
     *  BREATHE WIDGET
     *  widget_key: "breathe"
     *  payload: { variant?: 'simple'|'full' }
     *  -------------------------- */
    case "breathe": 
    case "breath": {
      // You already have <BreathCard/> which looks great; reuse it.
      return (
        <Card>
          <Header title="Breathe" />
          <BreathCard compact /> {/* add a 'compact' prop inside BreathCard if you want a tighter layout */}
        </Card>
      );
    }

    /** ---------------------------
     *  DAILY AFFIRMATION
     *  widget_key: "affirmation"
     *  payload: { tone?: string }
     *  -------------------------- */
    case "affirmation": {
      return (
        <Card>
          <Header title="Daily Affirmation" />
          <DailyAffirmation />
        </Card>
      );
    }

    /** ---------------------------
     *  PUBLIC FAVORITES
     *  widget_key: "favorites"
     *  payload: { limit?: number }
     *  -------------------------- */
    case "favorites": {
      const limit = Number(payload.limit) || 6;
      return (
        <Card>
          <Header
            title="Favorites"
            cta={
              <Link to="/account?tab=favorites" className="btn btn--ghost">
                Manage →
              </Link>
            }
          />
          {userId ? (
            <PublicFavorites
              userId={userId}
              limit={limit}
              linkPrefix="/product/"
              emptyMessage="No public favorites yet."
            />
          ) : (
            <div style={{ opacity: 0.7 }}>Loading…</div>
          )}
        </Card>
      );
    }

    /** ---------------------------
     *  QUIZ: LATEST ATTEMPT (PUBLIC)
     *  widget_key: "quiz_latest"
     *  payload: { quiz_slug?: string } // optional filter to only show one quiz
     *  -------------------------- */
    case "quiz_latest":
      case "quiz" : {
      // We’ll keep this simple: ask the server for the latest public attempt
      // If you want to avoid fetching again, you can hydrate via payload later.
      const QuizLatest = React.lazy(() => import("./_QuizLatestWidget.jsx"));
      return (
        <React.Suspense fallback={<Card>Loading…</Card>}>
          <QuizLatest userId={userId} payload={payload} />
        </React.Suspense>
      );
    }

    /** ---------------------------
     *  DEFAULT / UNKNOWN
     *  -------------------------- */
    default:
      return (
        <Card>
          <Header title="Widget" />
          <div style={{ opacity: 0.75 }}>
            Unknown widget type: <code>{key || "(none)"}</code>
          </div>
        </Card>
      );
  }
}

