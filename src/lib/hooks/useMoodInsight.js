// src/lib/hooks/useMoodInsight.js
import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "@lib/supabaseClient.js";

export default function useMoodInsight(userId) {
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [text, setText]           = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  // Optional StrictMode guard (prevents double-run in dev)
  const didInit = useRef(false);

  const refresh = useCallback(async () => {
  if (!userId) {
    setLoading(false);
    setError("");
    setText("");
    setUpdatedAt(null);
    return;
  }

  setLoading(true);
  setError("");

  try {
    // 1) Try to read today's saved text (does not create a row)
    const { data: got, error: getErr } = await supabase.rpc(
      "get_mood_insight_text",
      { p_user: userId }
    );
    if (getErr) throw getErr;

    const row = Array.isArray(got) ? got[0] : got || null;
    if (row?.text) {
      setText(row.text);
      setUpdatedAt(row.updated_at ?? row.created_at ?? null);
      setLoading(false);
      return;
    }

    // 2) Nothing saved yet → create or fetch today's row
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const { data: created, error: createErr } = await supabase.rpc(
      "get_or_create_mood_insight",
      { p_user: userId, p_day: today }
    );
    if (createErr) throw createErr;

    const made = Array.isArray(created) ? created[0] : created || null;
    setText(made?.text ?? ""); // likely empty until you call save()
    setUpdatedAt(made?.updated_at ?? made?.created_at ?? null);
  } catch (e) {
    setError(e?.message || String(e));
    setText("");
    setUpdatedAt(null);
  } finally {
    setLoading(false);
  }
}, [userId]);


 // in useMoodInsight.js
const save = useCallback(async (nextText) => {
  if (!userId) return;
  try {
    await supabase.rpc("set_mood_insight_text", {
      p_user: userId,
      p_text: nextText ?? "",
    });
    // optimistic update
    setText(nextText ?? "");
    setUpdatedAt(new Date().toISOString());
  } catch (e) {
    const code = e?.code || "";
    const msg = String(e?.message || "");
    // Treat unique/conflict as success (another caller already wrote)
    if (code === "23505" || /409\b/.test(msg)) {
      setText(nextText ?? "");
      setUpdatedAt(new Date().toISOString());
      return;
    }
    throw e;
  }
}, [userId]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    refresh();
  }, [refresh]);

  return { loading, error, text, updatedAt, refresh, save };
}
