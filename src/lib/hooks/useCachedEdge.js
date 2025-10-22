// /src/hooks/useCachedEdge.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import supabase from "@lib/supabaseClient.js";

// session-lived in-memory cache: key -> { data, at }
const _cache = new Map();
// short call gate to suppress accidental duplicate calls for same key
const _gate = new Map(); // key -> lastInvokeMs

const now = () => Date.now();

/** Stable stringify (sorted keys) so semantically-equal bodies produce the same key */
function stableStringify(value) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v && typeof v === "object") {
      if (seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) return v.map(walk);
      const out = {};
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

/**
 * useCachedEdge
 *
 * - Hydrates immediately from memory/sessionStorage (instant UI)
 * - Never clears data during revalidation (stale-while-revalidate)
 * - Optional revalidation on mount/focus/visible
 * - TTL-based skip to avoid hammering the edge function
 * - Short call gate to debounce duplicate invokes per-key
 *
 * @param {string} fnName  - supabase edge function name
 * @param {object|null} body - request body (must be JSON-serializable) or null to disable
 * @param {object} opts
 *   - enabled?: boolean (default true)
 *   - key?: string (optional stable cache key override)
 *   - staleMs?: number (default 60_000) cache TTL
 *   - revalidateOnMount?: boolean (default true)
 *   - revalidateOnFocus?: boolean (default true)
 *   - revalidateOnVisible?: boolean (default true)
 *   - timeoutMs?: number (default 15000)
 *   - minIntervalMs?: number (default 5000)
 */
export default function useCachedEdge(
  fnName,
  body,
  {
    enabled = true,
    key,
    staleMs = 60_000,
    revalidateOnMount = true,
    revalidateOnFocus = true,
    revalidateOnVisible = true,
    timeoutMs = 15_000,
    minIntervalMs = 5_000,
    storage = "session", // "session" | "local"
    extraHeaders,
  } = {}
) {
  const store = useMemo(
    () => (storage === "local" ? window.localStorage : window.sessionStorage),
    [storage]
  );
  // Create a stable key for all caches (sorted keys → consistent)
  const computedKey = useMemo(() => {
    const base = key || `${fnName}:${stableStringify(body || {})}`;
    return base;
  }, [key, fnName, body]);

  // Try in-memory first, then sessionStorage
  const sessionKey = useMemo(() => `uce:${computedKey}`, [computedKey]);

  // Initial data hydration
  const initialPack = useMemo(() => {
    // 1) memory
    const mem = _cache.get(computedKey);
    if (mem && typeof mem === "object") return mem;

    // 2) sessionStorage
    try {
      const raw = store.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return { data: parsed.data ?? null, at: parsed.at || 0 };
        }
      }
    } catch {}
    return { data: null, at: 0 };
  }, [computedKey, sessionKey, store]);

  const [data, setData] = useState(initialPack.data);
  const [error, setError] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  // "loading" means "no data yet" (controls your spinner)
  const loading = data == null && isFetching;

  const mountedRef = useRef(false);
  const inflightRef = useRef(null);

  // Persist helper (memory + sessionStorage)
  const persist = useCallback(
    (val) => {
      const rec = { data: val, at: now() };
      _cache.set(computedKey, rec);
      try {
       store.setItem(sessionKey, JSON.stringify(rec));
      } catch {}
    },
    [computedKey, sessionKey, store]
  );

  const invokeWithTimeout = useCallback(async () => {
    // use computedKey to gate; capture current fnName/body via closure
    if (!enabled || body == null || !fnName) return null;

    // Call gate: avoid duplicate hits for same key in a short window
    const last = _gate.get(computedKey) || 0;
    if (now() - last < minIntervalMs) return null;
    _gate.set(computedKey, now());

    const op = supabase.functions.invoke(fnName, { body, headers: extraHeaders });
    const timer = new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Timed out")), timeoutMs)
    );
    return Promise.race([op, timer]);
  }, [enabled, body, fnName, computedKey, minIntervalMs, timeoutMs]);

  const fetchNow = useCallback(async () => {
    if (!enabled || body == null || !fnName) {
      setIsFetching(false);
      return;
    }
    if (inflightRef.current) return inflightRef.current; // de-dupe concurrent calls

    setError("");
    setIsFetching(true);

    const p = (async () => {
      try {
        const resp = await invokeWithTimeout();
        if (!mountedRef.current) return;
        if (!resp) { // gated or disabled; avoid toggling states repeatedly
          setIsFetching(false);
          return;
        }
        if (resp.error) throw new Error(resp.error?.message || String(resp.error));
        const payload = resp.data ?? null;

        setData((prev) => {
          const next = payload ?? prev ?? null;
          if (payload != null) persist(next); // only persist non-null payloads
          return next;
        });
      } catch (e) {
        if (mountedRef.current) setError(e?.message || "Failed to load");
      } finally {
        if (mountedRef.current) setIsFetching(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = p;
    return p;
  }, [enabled, body, fnName, invokeWithTimeout, persist]);

  // Mount + TTL check: fetch immediately unless cache is fresh
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || body == null || !fnName) {
      return () => { mountedRef.current = false; };
    }

    const age = now() - (initialPack.at || 0);

    if (data == null) {
      // no data at all → fetch now
      fetchNow();
    } else if (age > staleMs) {
      // cache is stale → revalidate in background ONLY if caller opts in
      if (revalidateOnMount) fetchNow();
    }

    return () => {
      mountedRef.current = false;
    };
    // IMPORTANT: depend ONLY on computedKey + option flags, not raw body/fnName identity.
    // computedKey already encodes fnName+body content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedKey, enabled, staleMs, revalidateOnMount]);

  // Revalidate on focus/visibility (optional)
  useEffect(() => {
    if (!enabled || body == null || !fnName) return;

    const onFocus = () => {
      if (!mountedRef.current || !revalidateOnFocus) return;
      fetchNow(); // Don’t blank UI; just revalidate
    };
    const onVis = () => {
      if (!mountedRef.current || !revalidateOnVisible) return;
      if (document.visibilityState === "visible") fetchNow();
    };

    if (revalidateOnFocus) window.addEventListener("focus", onFocus);
    if (revalidateOnVisible) document.addEventListener("visibilitychange", onVis);
    return () => {
      if (revalidateOnFocus) window.removeEventListener("focus", onFocus);
      if (revalidateOnVisible) document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedKey, enabled, revalidateOnFocus, revalidateOnVisible]);

  // Manual refresh (e.g., after a user action)
  const refresh = useCallback(async () => {
    if (!enabled || body == null || !fnName) return;
    inflightRef.current = null; // allow a new fetch
    setError("");
    setIsFetching(true);
    try {
      const resp = await invokeWithTimeout();
      if (!mountedRef.current) return;
      if (!resp) { setIsFetching(false); return; }
      if (resp.error) throw new Error(resp.error?.message || String(resp.error));
      const payload = resp.data ?? null;
      setData((prev) => {
        const next = payload ?? prev ?? null;
        if (payload != null) persist(next);
        return next;
      });
    } catch (e) {
      if (mountedRef.current) setError(e?.message || "Failed to load");
    } finally {
      if (mountedRef.current) setIsFetching(false);
    }
  }, [enabled, body, fnName, invokeWithTimeout, persist]);

  return { data, loading, isFetching, error, refresh };
}
