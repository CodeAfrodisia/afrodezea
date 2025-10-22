// src/hooks/useSoulProfileData.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { mapAttemptsToProfile } from "@lib/profileMapper.js";

/**
 * Loads:
 * - profiles.show_soul_profile
 * - optional profiles.element (or pass elementIn)
 * - latest attempts per quiz (via view)
 */
export function useSoulProfileData(userId, elementIn) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [publicFlag, setPublicFlag] = useState(false);
  const [element, setElement] = useState(elementIn || null);
  const [attemptsBySlug, setAttemptsBySlug] = useState({});

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true); setErr("");
      try {
        // 1) profile flags + (optional) element if you store it there
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("show_soul_profile, element")
          .eq("id", userId)
          .maybeSingle();
        if (pErr) throw pErr;
        if (alive && prof) {
          setPublicFlag(!!prof.show_soul_profile);
          if (!elementIn && prof.element) setElement(prof.element);
        }

        // 2) latest attempts per quiz for this user
        const { data: rows, error: aErr } = await supabase
          .from("quiz_attempts_latest")
          .select("quiz_slug, result_key, result_totals")
          .eq("user_id", userId);
        if (aErr) throw aErr;

        const bySlug = {};
        for (const r of rows || []) {
          bySlug[r.quiz_slug] = { result_key: r.result_key, result_totals: r.result_totals };
        }
        if (alive) setAttemptsBySlug(bySlug);
      } catch (e) {
        if (alive) setErr(e.message || "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, elementIn]);

  const profile = useMemo(() => (
    mapAttemptsToProfile({ attemptsBySlug, element, publicFlag })
  ), [attemptsBySlug, element, publicFlag]);

  return { loading, err, profile, publicFlag, setPublicFlag, element };
}

