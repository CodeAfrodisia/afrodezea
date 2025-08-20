import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import supabase from "../lib/supabaseClient.js";
import { useAuth } from "./AuthContext.jsx";

function normalizeId(input) {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (typeof input === "object" && typeof input.id === "string") return input.id;
  return null;
}


const WishlistCtx = createContext(null);
const LS_KEY = "afd:wishlist";

// safe LS read
function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // map object -> id; filter non-strings
    return arr
      .map((v) => (typeof v === "string" ? v : (v && typeof v.id === "string" ? v.id : null)))
      .filter((v) => typeof v === "string");
  } catch {
    return [];
  }
}


// safe LS write
function writeLocal(idsArray) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(idsArray));
  } catch {
    /* noop */
  }
}

export function WishlistProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id || null;

  // Ensure a profiles row exists (id only)
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { error: upErr } = await supabase
          .from("profiles")
          .upsert(
            { id: userId },          // ✅ only columns that exist
            { onConflict: "id" }
          );
        if (upErr) console.error("[profiles] upsert failed:", upErr);
      } catch (e) {
        console.error("[profiles] ensure profile failed:", e);
      }
    })();
  }, [userId]);





  // Local and server sets (store Sets for O(1) lookups and valid .has)
  const [localSet, setLocalSet] = useState(() => new Set(typeof window !== "undefined" ? readLocal() : []));
  const [serverSet, setServerSet] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  // Persist guest list to LS
  useEffect(() => {
    if (!userId) {
      writeLocal(Array.from(localSet));
    }
    // inside the guest->server merge effect
console.debug("[wishlist] merging guest favorites → account", Array.from(localSet));

  }, [localSet, userId]);

  // Load server wishlist when auth ready
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setServerSet(new Set());
      return;
    }

    let alive = true;
    (async () => {
      setBusy(true);
      try {
        const { data, error } = await supabase
          .from("wishlist")
          .select("product_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (alive) {
          setServerSet(new Set((data || []).map((r) => r.product_id)));
        }
      } catch (e) {
        console.error("[wishlist] initial fetch failed", e);
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [authLoading, userId]);

  // On login: one-shot merge guest -> server, then refresh canonical from server
  const mergedOnce = useRef(false);
  useEffect(() => {
    if (authLoading || !userId) {
      mergedOnce.current = false;
      return;
    }
    if (mergedOnce.current) return;
    if (localSet.size === 0) {
      mergedOnce.current = true;
      return;
    }

    (async () => {
      try {
        // upsert guest items into server
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
        // clear local guest list to avoid future double merges
        setLocalSet(new Set());
        writeLocal([]);
        // refresh from server
        const { data, error: fetchErr } = await supabase.from("wishlist").select("product_id");
        if (fetchErr) throw fetchErr;
        setServerSet(new Set((data || []).map((r) => r.product_id)));
        mergedOnce.current = true;
      } catch (e) {
        console.error("[wishlist] merge guest->server failed", e);
      }
    })();
  }, [authLoading, userId, localSet]);

  // unified read surface
  const activeSet = userId ? serverSet : localSet;

  const isFav = useCallback((productId) => activeSet.has(productId), [activeSet]);
  // compat: some components might call has()
  const has = isFav;

  // Toggle accepts optional meta but ignores it (keeps your current schema)
  const toggle = useCallback(
  async (productId, _meta) => {
    const pid = normalizeId(productId);
    if (!pid) {
      console.warn("[wishlist] toggle called with invalid id:", productId);
      return;
    }

    if (!userId) {
      setLocalSet((prev) => {
        const next = new Set(prev);
        if (next.has(pid)) next.delete(pid);
        else next.add(pid);
        return next;
      });
      return;
    }

    const inServer = serverSet.has(pid);

    setServerSet((prev) => {
      const next = new Set(prev);
      if (inServer) next.delete(pid);
      else next.add(pid);
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
      setServerSet((prev) => {
        const next = new Set(prev);
        if (inServer) next.add(pid);
        else next.delete(pid);
        return next;
      });
    }
  },
  [userId, serverSet]
);


  const value = useMemo(
    () => ({
      // your existing surface:
      isFav,
      toggle,
      ids: Array.from(activeSet).filter((v) => typeof v === "string"),

      loading: busy || authLoading,
      signedIn: !!userId,

      // compat nicety:
      has, // alias to isFav so ProductCard can safely call has()
    }),
    [isFav, toggle, activeSet, busy, authLoading, userId, has]
  );

  return <WishlistCtx.Provider value={value}>{children}</WishlistCtx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}
