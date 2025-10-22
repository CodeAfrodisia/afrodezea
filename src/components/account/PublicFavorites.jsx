// components/profile/PublicFavorites.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@lib/supabaseClient.js";
import { useTheme } from "@lib/useTheme.jsx";
import { fetchFavoritesPublicByUserId } from "@lib/listsApi.js";

export default function PublicFavorites({
  userId,
  username,
  limit = 10,
  linkPrefix = "/product/",
  useSlugs = false,
  heading = "Favorites",
  emptyMessage = "No public favorites yet.",
}) {
  const theme = useTheme();
  const [resolvedUserId, setResolvedUserId] = useState(userId ?? null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve username → user id (if needed)
  useEffect(() => {
    (async () => {
      if (!username) return;
      setLoading(true); setError(null);
      try {
        const { data, error: e } = await supabase
          .from("profiles")
          .select("user_id")                 // your profiles table uses user_id
          .eq("handle", username)           // or whatever your public handle field is
          .maybeSingle();
        if (e) throw e;
        setResolvedUserId(data?.user_id ?? null);
      } catch (e) {
        setError("Profile not found.");
        setResolvedUserId(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  useEffect(() => { if (userId) setResolvedUserId(userId); }, [userId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    (async () => {
      setLoading(true); setError(null);
      try {
        const list = await fetchFavoritesPublicByUserId(resolvedUserId, { limit });
        setRows(list);
      } catch (e) {
        console.error(e);
        setError("Failed to load public favorites.");
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedUserId, limit]);

  const grid = useMemo(() => ({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
  }), []);

  const card = useMemo(() => ({
    background: theme.card || "rgba(255,255,255,0.03)",
    border: `1px solid ${theme.border || "#333"}`,
    color: theme.text || "#fff",
    borderRadius: 12,
    padding: 12,
    display: "grid",
    gap: 8,
  }), [theme]);

  const thumb = {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: 10,
    background: "#101010",
    border: `1px solid ${theme.border || "#333"}`,
  };

  if (!userId && !username) return null;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ color: theme.primary, margin: 0 }}>{heading}</h3>
        {loading ? <span style={{ color: theme.textMuted || "#aaa", fontSize: 12 }}>Loading…</span> : null}
      </div>

      {error ? (
        <div style={{ color: "#f66" }}>{error}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: theme.text }}>{emptyMessage}</div>
      ) : (
        <div style={grid}>
          {rows.map(r => {
            const title = r.name || `Product ${r.item_id}`;
            const href = (useSlugs && r.slug)
              ? `${linkPrefix}${encodeURIComponent(r.slug)}`
              : `${linkPrefix}${encodeURIComponent(r.item_id)}`;
            return (
              <a key={r.item_id} href={href} style={{ ...card, textDecoration: "none", color: "inherit" }} title={title}>
                {r.image_url ? (
                  <img src={r.image_url} alt={title} style={thumb} />
                ) : (
                  <div style={{ ...thumb, display: "grid", placeItems: "center", fontSize: 24 }}>🕯️</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, textAlign: "right", fontVariantNumeric: "tabular-nums", color: theme.textMuted || "#aaa" }} aria-hidden>
                    {r.rank}
                  </div>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                    {title}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
