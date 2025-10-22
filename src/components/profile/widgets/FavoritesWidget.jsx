// src/components/profile/widgets/FavoritesWidget.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import PlaceholderCard from "../PlaceholderCard.jsx";

/**
 * Shows products the user marked public in a table like `public_favorites_view`
 * If you don’t have a view, replace with a join to your wishlist table + products.
 */
export default function FavoritesWidget({ userId, limit = 6 }) {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        if (!userId) return;
        // Example: a view that exposes (title, slug, image_url) for public favorites
        const { data, error } = await supabase
          .from("public_favorites_view")
          .select("slug, title, image_url")
          .eq("user_id", userId)
          .order("added_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        if (!alive) return;
        setItems(data || []);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Could not load favorites.");
      }
    })();
    return () => { alive = false; };
  }, [userId, limit]);

  return (
    <PlaceholderCard title="Favorites">
      {err && <div style={{ opacity: .85, marginBottom: 8 }}>{err}</div>}
      {items.length === 0 ? (
        <div style={{ opacity: 0.75 }}>No public favorites yet.</div>
      ) : (
        <div style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))"
        }}>
          {items.map((p) => (
            <a
              key={p.slug}
              href={`/product/${p.slug}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--hairline)",
                borderRadius: 12,
                overflow: "hidden"
              }}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.title}
                  style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover" }}
                />
              )}
              <div style={{ padding: 8, fontSize: 14 }}>{p.title}</div>
            </a>
          ))}
        </div>
      )}
    </PlaceholderCard>
  );
}

