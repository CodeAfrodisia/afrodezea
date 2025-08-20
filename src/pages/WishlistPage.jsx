import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext.jsx";
import ProductsGrid from "../components/shop/ProductsGrid.jsx";
import supabase from "../lib/supabaseClient.js";

export default function WishlistPage() {
  const { ids = [], loading: wishLoading } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function fetchProductsBy(column) {
      const cols =
        column === "slug"
          ? "id, title, slug, image_url, price_cents"
          : "id, title, handle, image_url, price_cents";

      const { data, error } = await supabase
        .from("products")
        .select(cols)
        .in("id", ids);

      if (error) throw error;

      // keep order consistent with ids
      const map = new Map((data || []).map((p) => [p.id, p]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean);

      // normalize to include .handle always
      const normalized = ordered.map((p) => ({
        ...p,
        handle: p.slug ?? p.handle ?? null,
      }));

      return normalized;
    }

    async function load() {
      if (!ids || ids.length === 0) {
        if (alive) setProducts([]);
        return;
      }
      setLoading(true);
      try {
        // try schema with `slug`
        const withSlug = await fetchProductsBy("slug");
        if (alive) setProducts(withSlug);
      } catch (e) {
        if (e?.code === "42703") {
          // column does not exist – retry with `handle`
          try {
            const withHandle = await fetchProductsBy("handle");
            if (alive) setProducts(withHandle);
          } catch (ee) {
            console.error("[wishlist] load products failed (handle retry):", ee);
            if (alive) setProducts([]);
          }
        } else {
          console.error("[wishlist] load products failed:", e);
          if (alive) setProducts([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [ids]);

  const normalized = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return list.map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle, // guaranteed by normalization above
      image_url: p.image_url || null,
      price_cents: p.price_cents ?? 0,
      priceRange: {
        minVariantPrice: {
          amount: ((p.price_cents ?? 0) / 100),
          currencyCode: "USD",
        },
      },
      images: p.image_url ? { nodes: [{ url: p.image_url }] } : { nodes: [] },
    }));
  }, [products]);

  const empty = (!ids || ids.length === 0);

  return (
    <div className="container" style={{ padding: 24 }}>
      <h1 className="display" style={{ marginBottom: 12 }}>Your Wishlist</h1>

      {empty ? (
        <div className="surface" style={{ padding: 16 }}>
          <p className="lead" style={{ marginTop: 0 }}>No items yet.</p>
          <Link className="btn btn--gold" to="/products">Browse products</Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ opacity: .85 }}>
              {ids.length} saved {ids.length === 1 ? "item" : "items"}
              {(wishLoading || loading) ? " • loading…" : ""}
            </span>
          </div>

          <ProductsGrid products={normalized} onQuickView={() => {}} />

          <div style={{ marginTop: 16, opacity: .8 }}>
            Tip: open a product and tap ♥ to remove it from your wishlist.
          </div>
        </>
      )}
    </div>
  );
}
