// ProfileSettingsLite.jsx
import { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";

export default function ProfileSettingsLite() {
  const { user } = useAuth();
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")                 // defensive
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.handle) setHandle(data.handle);
    })();
  }, [user?.id]);

  async function save() {
    if (!user?.id) return;
    setSaving(true); setMsg("");
    const h = (handle || "").toLowerCase().replace(/[^a-z0-9._]/g, "_").slice(0,24) || "user";
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, handle: h }, { onConflict: "user_id" });
    setSaving(false);
    setMsg(error ? error.message : "Saved.");
    if (!error) setHandle(h);
  }

  return (
    <div className="surface" style={{ padding: 16, display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0 }}>Public Handle</h3>
      <input
        value={handle}
        onChange={e => setHandle(e.target.value)}
        placeholder="your.handle"
        style={{ padding: 10, borderRadius: 10, border: "1px solid var(--hairline)" }}
      />
      <button onClick={save} disabled={saving} className="btn">
        {saving ? "Saving…" : "Save Handle"}
      </button>
      {msg && <div style={{ opacity:.8 }}>{msg}</div>}
    </div>
  );
}

