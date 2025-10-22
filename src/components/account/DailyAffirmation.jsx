// components/DailyAffirmation.jsx
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import { useSoul } from "@context/SoulContext.jsx";

export default function DailyAffirmation({ theme = {} }) {
  const { user } = useAuth();
  const { userArchetype } = useSoul();

  const [affirmation, setAffirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [regenerated, setRegenerated] = useState(false);
  const [source, setSource] = useState(""); // "ai" | "fallback" | "cache"

  // Guards to stop duplicate calls in React StrictMode
  const inFlight = useRef(false);
  const didInit = useRef(false);

  // Per-user, per-day cache key
  const todayKey =
    user?.id ? `da:${user.id}:${new Date().toISOString().slice(0, 10)}` : null;

  const Fallback = "Your light is steady and growing. Breathe, soften, rise.";

  const fetchAffirmation = async (forceNew = false) => {
    if (inFlight.current) return; // don't overlap or double-call
    inFlight.current = true;

    try {
      // 1) Client-side day cache (skip OpenAI if we have today's line)
      if (!forceNew && todayKey) {
        const cached = JSON.parse(localStorage.getItem(todayKey) || "null");
        if (cached?.line) {
          setAffirmation(cached.line);
          setLastUpdated(cached.generatedAt);
          setRegenerated(false);
          setSource(cached.source || "cache");
          setError("");
          return;
        }
      }

      setLoading(true);

      // 2) Call Supabase Edge Function (daily-affirmation)
      const payload = { archetype: userArchetype || "", forceNew: !!forceNew };
      // console.log("[DA] invoking daily-affirmation", payload);

      const { data, error } = await supabase.functions.invoke(
        "daily-affirmation",
        { body: payload }
      );
      // console.log("[DA] supabase.functions.invoke →", { data, error });

      if (error) throw error;

      const line =
        data?.line || data?.affirmation || Fallback;
      const generatedAt = data?.generatedAt || new Date().toISOString();
      const src = data?.source || "ai";

      setAffirmation(line);
      setLastUpdated(generatedAt);
      setRegenerated(!!forceNew);
      setSource(src);
      setError("");

      if (todayKey) {
        localStorage.setItem(
          todayKey,
          JSON.stringify({ line, generatedAt, source: src })
        );
      }
    } catch (_err) {
      // Soft fallback so the UI stays pleasant
      setAffirmation(Fallback);
      setLastUpdated(new Date().toISOString());
      setRegenerated(false);
      setSource("fallback");
      setError(""); // keep UI clean
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  // Run once (even in StrictMode) and re-run if archetype changes in prod
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    fetchAffirmation(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userArchetype]);

  return (
    <section style={{ marginTop: "40px", textAlign: "center" }}>
      <h2
        style={{
          fontSize: "28px",
          borderBottom: `1px solid ${theme.border || "#666"}`,
          paddingBottom: "6px",
          color: theme.text,
          marginBottom: "20px",
        }}
      >
        Daily Affirmation
      </h2>

      {loading ? (
        <p style={{ fontSize: "18px", color: theme.primary }}>Receiving your message...</p>
      ) : error ? (
        <p style={{ color: "salmon", fontSize: "16px" }}>{error}</p>
      ) : (
        <>
          <p
            style={{
              fontSize: "20px",
              fontStyle: "italic",
              color: theme.primary,
              marginBottom: "8px",
              lineHeight: "1.6",
              transition: "opacity 0.4s ease-in-out",
              opacity: loading ? 0 : 1,
            }}
          >
            “{affirmation}”
          </p>

          <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            Source: {source === "ai" ? "AI" : source}
          </p>

          <p style={{ fontSize: "14px", color: theme.text, marginBottom: "20px" }}>
            {lastUpdated ? `Generated on ${format(new Date(lastUpdated), "PPP")}` : "Generated today"}
          </p>

          <button
            onClick={() => fetchAffirmation(true)}
            disabled={regenerated || inFlight.current}
            style={{
              background: "transparent",
              border: `1px solid ${theme.border || "#555"}`,
              color: theme.text,
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: regenerated || inFlight.current ? "not-allowed" : "pointer",
              opacity: regenerated || inFlight.current ? 0.6 : 1,
            }}
            title={regenerated ? "Locked for today" : "Ask for a fresh line"}
          >
            {regenerated ? "Affirmation locked for today" : "Regenerate"}
          </button>
        </>
      )}
    </section>
  );
}
