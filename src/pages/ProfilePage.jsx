// src/pages/ProfilePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import  supabase  from "@lib/supabaseClient.js";

import ResultCard from "@components/quizzes/ResultCard.jsx";
//import { labelsBySlug } from "@components/quizzes/labels";


import ProfileWidgetRenderer from "@components/profile/ProfileWidgetRenderer.jsx";
import WidgetGrid from "@components/profile/WidgetGrid.jsx"; // your grid (DnD or static)
import { removeWidget } from "@lib/profileWidgets.js";


import { AuthProvider, useAuth } from "@context/AuthContext.jsx";
import { useTheme } from "@lib/useTheme.jsx";


export default function ProfilePage() {
  const theme = (() => {
    try { return useTheme(); } catch { return {}; }
  })();
  const { handle } = useParams();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [widgets, setWidgets] = useState([]); // NEW
  const [results, setResults] = useState([]); // legacy quiz section
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const canonical = useMemo(() => (handle ? `/u/${handle}` : "/u"), [handle]);

  useEffect(() => {
  let alive = true;

  (async () => {
    setLoading(true);
    setErr("");
    setProfileUser(null);
    setResults([]);
    setWidgets([]);

    try {
      if (!handle) throw new Error("Profile not found.");

      // 1) Resolve handle → profile row (public view so anon works)
      const { data: prof, error: pe } = await supabase
        .from("profiles_public")
        .select("id, handle, display_name, bio, avatar_url")
        .eq("handle", handle)
        .maybeSingle();
      if (pe) throw pe;
      if (!prof) throw new Error("Profile not found.");

      if (!alive) return;
      setProfileUser(prof);

      // Is the current viewer the owner?
      const owner = !!(user?.id && user.id === prof.id);
      setIsOwner(owner);

      // 2) Widgets (owner sees all; visitors see public-only)
      let q = supabase
        .from("profile_widgets")
        .select("id, widget_key, payload, size, position, is_public")
        .eq("user_id", prof.id)
        .order("position", { ascending: true });
      if (!owner) q = q.eq("is_public", true);

      const { data: widgetRows, error: we } = await q;
      if (we) throw we;
      if (alive) setWidgets(widgetRows || []);

      // 3) Legacy public quiz results (optional while we transition)
      const { data: attempts, error: ae } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          result_title,
          result_summary,
          completed_at,
          is_public,
          quiz:quiz_id ( id, slug, title )
        `)
        .eq("user_id", prof.id)
        .eq("is_public", true)
        .order("completed_at", { ascending: false });
      if (ae) throw ae;
      if (alive) setResults(attempts || []);
    } catch (e) {
      if (alive) {
        console.error("[ProfilePage] load failed:", e);
        setErr(e.message || "Could not load profile.");
      }
    } finally {
      if (alive) setLoading(false);
    }
  })();

  return () => { alive = false; };
}, [handle, user?.id]); // include user?.id so ownership updates when auth changes



async function refreshWidgets(ownerOnly=false) {
  if (!profileUser) return;
  let q = supabase
    .from("profile_widgets")
    .select("id, widget_key, payload, size, position, is_public")
    .eq("user_id", profileUser.id)
    .order("position", { ascending: true });

  if (!isOwner && !ownerOnly) q = q.eq("is_public", true);

  const { data } = await q;
  setWidgets(data || []);
}

const DEFAULTS = {
  today:        { payload: { label: "Ready to check in?" }, size: "1x1" },
  breathe:      { payload: { variant: "simple" },           size: "1x1" },
  affirmation:  { payload: {},                               size: "1x1" },
  favorites:    { payload: { limit: 6 },                     size: "2x2" },
  quiz_latest:  { payload: { quiz_slug: null },              size: "2x2" },
};

async function handleAdd(typeKey) {
  if (!isOwner || !profileUser) return;

  const def = DEFAULTS[typeKey] || { payload: {}, size: "1x1" };
  const nextPos = (widgets?.length || 0) + 1;

  // Insert both `type` (for old schema) and `widget_key` (our new code path)
  const { error } = await supabase.from("profile_widgets").insert({
    user_id: profileUser.id,
    type: typeKey,                     // ✅ satisfy NOT NULL constraint
    widget_key: typeKey,               // ✅ what our renderer reads
    variation: def.variation || "default",
    payload: def.payload || {},
    size: def.size || "1x1",
    position: nextPos,
    is_public: true,
  });

  if (error) { console.error(error); return; }
  await refreshWidgets(true);
  setShowAdd(false);
}


async function handleReorderByIds(nextIds) {
  // nextIds: array of string ids in new visual order (from WidgetGrid)
  const idToItem = new Map(widgets.map(w => [String(w.id), w]));

  // Build next array in that order + positions
  const nextItems = nextIds
    .map((id, idx) => {
      const base = idToItem.get(String(id));
      if (!base || !base.id) return null;           // skip ghosts
      return { ...base, position: idx + 1 };
    })
    .filter(Boolean);

  // optimistic UI
  const prev = widgets;
  setWidgets(nextItems);

  try {
    // persist one-by-one; you can batch later
    for (const w of nextItems) {
      const { error } = await supabase
        .from("profile_widgets")
        .update({ position: w.position })
        .eq("id", w.id);
      if (error) throw error;
    }
  } catch (e) {
    console.error("Persist order failed:", e);
    setWidgets(prev); // revert on failure
  }
}


async function handleVisibility(id, makePublic) {
  if (!isOwner) return;
  const { error } = await supabase.from("profile_widgets")
    .update({ is_public: !!makePublic })
    .eq("id", id);
  if (error) { console.error(error); return; }
  setWidgets(prev => prev.map(w => w.id === id ? { ...w, is_public: !!makePublic } : w));
}
function AddWidgetModal({ open, onClose, onPick }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "grid", placeItems: "center", zIndex: 30
    }}>
      <div className="surface" style={{ padding: 16, borderRadius: 16, width: 560, maxWidth: "90vw" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Add a widget</h3>
          <button className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>

        <div style={{ display:"grid", gap: 8, gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))" }}>
          {[
            { key: "today", label: "Today" },
            { key: "breathe", label: "Breathe" },
            { key: "affirmation", label: "Affirmation" },
            { key: "favorites", label: "Favorites" },
            { key: "quiz_latest", label: "Latest Quiz" },
          ].map(opt => (
            <button key={opt.key} className="btn btn--ghost"
              onClick={() => onPick(opt.key)} style={{ textAlign: "left" }}>
              + {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

async function handleDeleteWidget(id) {
  // optimistic UI
  const prev = widgets;
  setWidgets(prev.filter(w => w.id !== id));
  try {
    await removeWidget({ userId: profileUser.id, id });
  } catch (e) {
    console.error("Delete failed:", e);
    // revert if server failed
    setWidgets(prev);
  }
}

/* async function handleReorder(nextItems) {
  // nextItems should be an array in the new order (each item has .id)
  try {
    // Assign positions 0..N based on new order
    const updates = nextItems.map((w, i) => ({ id: w.id, position: i }));

    // Simple: one-by-one updates (fine for small lists)
    for (const u of updates) {
      const { error } = await supabase
        .from("profile_widgets")
        .update({ position: u.position })
        .eq("id", u.id);
      if (error) throw error;
    }

    // Reflect in local state immediately for snappy UI
    setWidgets(nextItems.map((w, i) => ({ ...w, position: i })));
  } catch (e) {
    console.error("Reorder failed:", e);
    // optional: toast error
  }
} */

  
  // ——— UI states ———
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err) return <div style={{ padding: 24 }}>{err}</div>;
  if (!profileUser) return <div style={{ padding: 24 }}>Profile not found.</div>;

  const name =
    profileUser.display_name ||
    profileUser.username ||
    (profileUser.handle ? `@${profileUser.handle}` : "Profile");

  return (
  <div className="container" style={{ padding: 24, display: "grid", gap: 18 }}>
    {/* Header */}
    <section className="surface" style={{ padding: 18 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid var(--hairline)",
            background: "rgba(255,255,255,.06)",
            flexShrink: 0,
          }}
        >
          {profileUser.avatar_url && (
            <img
              src={profileUser.avatar_url}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{name}</h1>
          <div style={{ opacity: 0.8 }}>{canonical}</div>
        </div>
      </div>
      <p style={{ margin: 0, opacity: 0.9 }}>
        {profileUser.bio || (
          <span style={{ opacity: 0.7, fontStyle: "italic" }}>
            This soul hasn’t written a bio yet — the page is listening.
          </span>
        )}
      </p>
    </section>

    {/* ✅ Public Widgets (single source of truth) */}
   <section className="surface" style={{ padding: 18 }}>
  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
    <h3 style={{ margin: 0 }}>Public Widgets</h3>
    {isOwner && (
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn--ghost" onClick={() => setShowAdd(true)}>+ Add</button>
        <button className="btn btn--ghost" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? "Done arranging" : "Edit layout"}
        </button>
      </div>
    )}
  </div>

  {widgets.length === 0 ? (
    <div style={{ marginTop: 12, padding: 16, borderRadius: 14, border: "1px dashed var(--hairline)", opacity: 0.8 }}>
      Nothing published yet.
    </div>
  ) : (
    <WidgetGrid
      editing={isEditing}
      items={[...widgets].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))}
      onReorder={handleReorderByIds}
      onDelete={handleDeleteWidget}
      renderItem={(w) => (
       
        <ProfileWidgetRenderer widget={w} userId={profileUser.id} theme={theme} />
        
      )}
    />
  )}
</section>


<AddWidgetModal
  open={showAdd}
  onClose={() => setShowAdd(false)}
  onPick={handleAdd}
/>

    {/* Legacy Quiz Results (kept for transition) */}
    <section className="surface" style={{ padding: 18 }}>
      <h3>Shared Quiz Results (legacy)</h3>
      {results.length === 0 ? (
        <div style={{ padding: 16, border: "1px dashed var(--hairline)" }}>
          Nothing shared yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            marginTop: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {results.map((r) => (
            <ResultCard key={r.id} attempt={r} />
          ))}
        </div>
      )}
    </section>
  </div>
);

}
