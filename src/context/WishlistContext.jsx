// src/context/WishlistContext.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import supabase from "../lib/supabaseClient.js"; // default export in your project
import { useAuth } from "./AuthContext.jsx";

// ---------------- helpers ----------------
const LS_KEY = "afd:wishlist";

function normalizeId(input) {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (typeof input === "object" && typeof input.id === "string") return input.id;
  return null;
}

function safeReadLocal() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v) =>
        typeof v === "string" ? v : v && typeof v.id === "string" ? v.id : null
      )
      .filter((v) => typeof v === "string");
  } catch {
    return [];
  }
}

function safeWriteLocal(ids) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
}

// ---------------- context ----------------
const WishlistCtx = createContext(null);

export function WishlistProvider({ children }) {
  // IMPORTANT: use the correct prop from AuthContext
  const { user, authLoading } = useAuth();
  const userId = user?.id || null;

  // Guest set (localStorage) and authed set (server)
  const [localSet, setLocalSet] = useState(() => new Set(safeReadLocal()));
  const [serverSet, setServerSet] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  // Persist guest list to LS whenever it changes (only when signed out)
  useEffect(() => {
    if (!userId) safeWriteLocal(Array.from(localSet));
  }, [localSet, userId]);

  // Load server wishlist once auth state is known
  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setServerSet(new Set()); return; }

    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const { data, error } = await supabase
          .from("wishlist")
          .select("product_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (alive) setServerSet(new Set((data || []).map((r) => r.product_id)));
      } catch (e) {
        console.error("[wishlist] initial fetch failed", e);
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => { alive = false; };
  }, [authLoading, userId]);

  // On first login: merge guest -> server then refresh
  const mergedOnce = useRef(false);
  useEffect(() => {
    if (authLoading || !userId) { mergedOnce.current = false; return; }
    if (mergedOnce.current) return;
    if (localSet.size === 0) { mergedOnce.current = true; return; }

    (async () => {
      try {
        const rows = Array.from(localSet).map((pid) => ({
          user_id: userId,
          product_id: pid,
        }));
        if (rows.length) {
          const { error } = await supabase
            .from("wishlist")
            .upsert(rows, { onConflict: "user_id,product_id" });
          if (error) throw error;
        }

        // Clear guest list and refresh canonical set from server
        setLocalSet(new Set());
        safeWriteLocal([]);

        const { data, error: fetchErr } = await supabase
          .from("wishlist")
          .select("product_id")
          .eq("user_id", userId);
        if (fetchErr) throw fetchErr;
        setServerSet(new Set((data || []).map((r) => r.product_id)));
        mergedOnce.current = true;
      } catch (e) {
        console.error("[wishlist] merge guest->server failed", e);
      }
    })();
  }, [authLoading, userId, localSet]);

  // Source of truth exposed to consumers
  const activeSet = userId ? serverSet : localSet;

  const isFav = useCallback(
    (productId) => activeSet.has(productId),
    [activeSet]
  );
  const has = isFav; // alias/back-compat

  const toggle = useCallback(
    async (productId) => {
      const pid = normalizeId(productId);
      if (!pid) {
        console.warn("[wishlist] toggle called with invalid id:", productId);
        return;
      }

      // Guest mode: purely local
      if (!userId) {
        setLocalSet((prev) => {
          const next = new Set(prev);
          if (next.has(pid)) next.delete(pid);
          else next.add(pid);
          return next;
        });
        return;
      }

      // Authed: optimistic update, then persist
      const inServer = serverSet.has(pid);

      // optimistic flip
      setServerSet((prev) => {
        const next = new Set(prev);
        if (inServer) next.delete(pid); else next.add(pid);
        return next;
      });

      try {
        if (inServer) {
          const { error } = await supabase
            .from("wishlist")
            .delete()
            .match({ user_id: userId, product_id: pid });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("wishlist")
            .upsert({ user_id: userId, product_id: pid }, { onConflict: "user_id,product_id" });
          if (error) throw error;
        }
      } catch (e) {
        console.error("[wishlist] toggle failed", e);
        // rollback optimistic change
        setServerSet((prev) => {
          const next = new Set(prev);
          if (inServer) next.add(pid); else next.delete(pid);
          return next;
        });
      }
    },
    [userId, serverSet]
  );

  const value = useMemo(
    () => ({
      isFav,
      has,
      toggle,
      ids: Array.from(activeSet).filter((v) => typeof v === "string"),
      loading: busy || authLoading,
      signedIn: !!userId,
    }),
    [isFav, has, toggle, activeSet, busy, authLoading, userId]
  );

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}
