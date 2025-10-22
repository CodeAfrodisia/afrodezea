// src/hooks/useSignalsVersion.js
import { useEffect, useState } from "react";
import supabase from "@lib/supabaseClient.js";

const SIGNAL_SLUGS = [
  "love-language","love-language-giving","love-language-receiving",
  "apology-style","forgiveness-language","attachment-style",
  "archetype-dual","archetype_dual",
];

export default function useSignalsVersion(userId) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!userId) { setVersion(0); return; }

    (async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("completed_at,created_at")
        .eq("user_id", userId)
        .in("quiz_slug", SIGNAL_SLUGS)
        .order("completed_at", { ascending: false })
        .limit(1);

      if (!alive) return;
      if (error) {
        console.warn("[insights] signalsVersion query error:", error);
        setVersion(0);
        return;
      }

      const t = data?.[0]?.completed_at || data?.[0]?.created_at || null;
      setVersion(t ? new Date(t).getTime() : 0);
    })();

    const channel = userId
      ? supabase
          .channel(`quiz_attempts_updates:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "quiz_attempts",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const t = payload.new?.completed_at || payload.new?.created_at;
              if (t) setVersion(new Date(t).getTime());
            }
          )
          .subscribe()
      : null;

    return () => {
      alive = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  return version;
}

