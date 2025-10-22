// src/components/tour/DashboardTour.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export default function DashboardTour({
  userId,
  getTab, setTab,
  getPTab, setPTab,
  mode = "quick",
  onEvent = () => {},
}) {
  // --- steps ---------------------------------------------------------------
  const quickSteps = useMemo(() => ([
    {
      id: "tabs",
      // NOTE: updated to match your current markup
      selector: '[data-tour="main-tabs"]',
      title: "Welcome to your Hub",
      body: "Use these tabs to check in, see patterns, and explore insights.",
    },
    {
      id: "today",
      before: () => setTab?.("today"),
      selector: '[data-tour="today-checkin"]',
      title: "Make today’s check-in",
      body: "A 30-second check-in powers your insights. The more you log, the smarter everything gets.",
    },
    {
      id: "mood-kpis",
      before: () => { setTab?.("profile"); setPTab?.("mood"); },
      selector: '[data-tour="mood-kpis"]',
      title: "Your patterns at a glance",
      body: "See your most-frequent mood, needs, and energy patterns from recent check-ins.",
    },
    {
  id: "analysis",
  // 👇 ensure we're on Personality > Mood when arriving here from either direction
    before: () => { setTab?.("profile"); setPTab?.("mood"); },
  selector: '[data-tour="analysis-pane-mood"]',
  title: "Personalized Analysis",
  body: "This pane updates per tab—Mood, Love, Archetype—into long-form insights.",
},

    {
      id: "achv",
      before: () => setTab?.("achv"),
      selector: '[data-tour="achv-kpis"]',
      title: "Achievements & Stats",
      body: "Track streaks and trends. Light touch, meaningful progress.",
    },
    {
  id: "quizzes",
  // Go to Personality Profile > Quiz Insights
  before: () => { setTab?.("profile"); setPTab?.("quizzes"); },
  selector: '[data-tour="quizzes-hub"]', // put this on the container that holds the graphs/sections
  title: "Quiz Insights",
  body: "See your results, visualizations, and quiz-specific narratives here.",
  cta: { label: "Open Quiz Insights", action: () => { setTab?.("profile"); setPTab?.("quizzes"); } }
}

  ]), [setTab, setPTab]);

  const steps = quickSteps;

  // --- state ---------------------------------------------------------------
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [targetNode, setTargetNode] = useState(null);
  const [everFoundAny, setEverFoundAny] = useState(false);
  const popRef = useRef(null);

  // keep last good rect
//const lastGood = useRef({ node: null, rect: null, stepId: null });
const lastStepId = useRef(null);
const stepChangedRef = useRef(false);



// when the step index changes, clear any previous step's cached rect
useEffect(() => {
  const cur = steps[idx]?.id;
  if (cur !== lastStepId.current) {
    lastStepId.current = cur;
    stepChangedRef.current = true;                // flag first measure after step-change
    lastGood.current = { node: null, rect: null, stepId: cur };
    setTargetNode(null);
    setTargetRect(null);
  }
}, [idx, steps]);

  // --- utils ---------------------------------------------------------------
  const getStep = (i = idx) => steps[i];
  const clamp = (i) => Math.max(0, Math.min(steps.length - 1, i));

/*   // helper: is an element actually visible/rendered?
const isVisiblyMounted = (el) => {
  if (!el || !el.isConnected) return false;
  const rects = el.getClientRects();
  if (!rects || rects.length === 0) return false;
  const cs = getComputedStyle(el);
  return cs && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
}; */

// wait for the element to exist AND be visible
const waitForSelector = (selector, timeoutMs = 5000, intervalMs = 60) =>
  new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      const el = selector ? document.querySelector(selector) : null;
      if (el && isVisiblyMounted(el)) return resolve(el);
      if (performance.now() - start >= timeoutMs) return resolve(null);
      setTimeout(tick, intervalMs);
    };
    tick();
  });



// One animation-frame tick as a Promise
const raf = () => new Promise((r) => requestAnimationFrame(r));

// Tiny visibility guard (mounted, not display:none, has box)
const isVisiblyMounted = (node) => {
  if (!node) return false;
  const rect = node.getBoundingClientRect();
  const style = window.getComputedStyle(node);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
};

const prepareStep = async () => {
  const step = getStep();
  if (!step) return { el: null, rect: null };

  // Run any pre-navigation (tab switch) and let React settle
  if (step.before) {
    try { step.before(); } catch {}
    // Give state->render->layout a beat
    await raf();            // state applied
    await raf();            // render committed
    await new Promise(r => setTimeout(r, 80)); // slow devices/layout
  }

  // Find the target
  let el = await waitForSelector(step.selector, 2500, 60);
  if (!el) return { el: null, rect: null };

  // Prefer a wrapping container to avoid clipped highlights
  const base = el.closest('[data-tour-container]') || el;

  // Center it in view, then reflow
  try {
    base.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  } catch {}
  await raf();

  // If the node wasn’t ready yet, retry once with a slightly longer window
  if (!isVisiblyMounted(base)) {
    el = await waitForSelector(step.selector, 3000, 80);
    if (!el) return { el: null, rect: null };
  }

  const target = el.closest('[data-tour-container]') || el;
  const rect = target.getBoundingClientRect();
  return { el: target, rect };
};




// keep last good rect instead of clearing immediately
const lastGood = useRef({ node: null, rect: null });

const measure = async () => {
  // First measurement after a step change? Give the DOM a breath.
  const isFirstForStep = stepChangedRef.current === true;
  if (isFirstForStep) {
    stepChangedRef.current = false;
    await raf();            // state applied
    await raf();            // render committed
    await new Promise(r => setTimeout(r, 80)); // small settle
  }

  const { el, rect } = await prepareStep();
  const curStepId = steps[idx]?.id;

  if (el && rect) {
    lastGood.current = { node: el, rect, stepId: curStepId };
    setTargetNode(el);
    setTargetRect(rect);
    setEverFoundAny(true);
    return true;
  }

  // ⬇️ Only reuse lastGood if it belongs to THIS step (prevents bleed from step 3 → 4)
  if (lastGood.current.rect && lastGood.current.stepId === curStepId) {
    setTargetNode(lastGood.current.node);
    setTargetRect(lastGood.current.rect);
    return true;
  }

  // nothing to show yet for this step
  setTargetNode(null);
  setTargetRect(null);
  return false;
};



  const goTo = (i) => setIdx(clamp(i));
  const close = (reason = "dismiss") => {
    setOpen(false);
    onEvent("tour_end", { reason, idx, stepId: getStep(idx)?.id, userId });
  };
  const next = () => {
    if (idx >= steps.length - 1) {
      onEvent("tour_complete", { userId });
      return close("complete");
    }
    goTo(idx + 1);
  };
  const prev = () => goTo(idx - 1);

  // --- start & layout -------------------------------------------------------
  useEffect(() => {
    const handler = async () => {
      setOpen(true);
      setEverFoundAny(false);
      setIdx(0);
      onEvent("tour_start", { userId, mode });
      await measure();
    };
    window.addEventListener("start-dashboard-tour", handler);
    return () => window.removeEventListener("start-dashboard-tour", handler);
  }, [mode, steps]);

  useLayoutEffect(() => {
  if (!open) return;

  let cancelling = false;

  const reflow = async () => {
    if (cancelling) return;
    await measure();
  };

  // first pass
  reflow();

  // respond to size/scroll
  const ro = new ResizeObserver(() => reflow());
  ro.observe(document.body);
  const onScroll = () => reflow();
  const onResize = () => reflow();
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onResize);

  // short-lived mutation observer burst to catch Suspense/lazy content
  const mo = new MutationObserver(() => reflow());
  mo.observe(document.body, { childList: true, subtree: true });

  // stop the mutation observer after a few seconds (reduces overhead)
  const stopMO = setTimeout(() => mo.disconnect(), 4000);

  return () => {
    cancelling = true;
    clearTimeout(stopMO);
    try { ro.disconnect(); } catch {}
    try { mo.disconnect(); } catch {}
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onResize);
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open, idx]);


  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close("escape"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx]);

  const noTarget = !targetRect;
  if (!open || !steps.length) return null;

  // --- positions ------------------------------------------------------------
const pad = 8;
const rect =
  targetRect || {
    top: window.innerHeight / 2 - 40,
    left: window.innerWidth / 2 - 120,
    width: 240,
    height: 80,
  };

// Because the overlay is position:fixed, we must use viewport coords directly.
// Do NOT add window.scrollY / window.scrollX here.
const highlight = !targetRect
  ? null
  : {
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    };

const viewportH = window.innerHeight;
const below = !!targetRect && rect.top + rect.height + 180 < viewportH;

const popY = !targetRect
  ? window.innerHeight / 2
  : rect.top + (below ? rect.height + 12 : -12);

const popX = !targetRect
  ? Math.max(16, window.innerWidth / 2 - 200)
  : Math.min(
      Math.max(16, rect.left + rect.width / 2 - 200),
      window.innerWidth - 416
    );


  const step = getStep();
  const atStart = idx === 0;
  const atEnd = idx === steps.length - 1;

  // --- render ---------------------------------------------------------------
  return (
    <div aria-live="polite" aria-modal="true" role="dialog" style={S.overlay}>
      <div style={S.backdrop} onClick={() => close("backdrop")} />

      {highlight ? <div style={{ ...S.spot, ...highlight }} aria-hidden /> : null}

      <div
        style={{
          ...S.pop,
          top: popY,
          left: popX,
          transform: noTarget ? "translate(-50%, -50%)" : (below ? "translateY(0)" : "translateY(-100%)"),
        }}
      >
        <div style={S.popHeader}>
          <div style={S.popTitle}>{step?.title || "Tour"}</div>
          <button onClick={() => close("close")} aria-label="Close tour" style={S.iconBtn}>✕</button>
        </div>

        <div style={S.popBody}>
          {!everFoundAny && noTarget ? (
            <div>
              We couldn’t find any tour targets on this screen yet.
              Make sure the key elements include the <code>data-tour</code> attributes.
              You can still step through the tour.
            </div>
          ) : noTarget ? (
            <div>
              This step’s target isn’t visible right now. Try clicking “Next” to continue.
            </div>
          ) : (
            step?.body || ""
          )}
        </div>

        <div style={S.popFooter}>
          <button onClick={() => close("skip")} className="btn btn--ghost">Skip Tour</button>
          <div style={{ flex: 1 }} />
          {!atStart && <button onClick={prev} className="btn btn--ghost">← Back</button>}
          <span style={{ opacity: 0.75, alignSelf: "center", margin: "0 8px" }}>{idx + 1} / {steps.length}</span>
          <button
            onClick={() => { if (step?.cta?.action && atEnd) step.cta.action(); next(); }}
            className="btn"
          >
            {atEnd ? (step?.cta?.label || "Finish") : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: "fixed", inset: 0, zIndex: 9999, fontFamily: "inherit", color: "var(--c-ink, #F9F9F9)" },
  backdrop: { position: "absolute", inset: 0, background: "rgba(0,0,0,.55)" },
  spot: {
    position: "absolute", borderRadius: 12,
    border: "2px solid var(--brand-gold, #D4AF37)",
    boxShadow: "0 0 0 9999px rgba(0,0,0,.55), 0 0 24px rgba(212,175,55,.35)",
    pointerEvents: "none",
  },
  pop: {
    position: "absolute", width: 400, background: "var(--c-bg, #0F0F0F)",
    border: "1px solid var(--c-border-subtle, #2E222A)", borderRadius: 12,
    boxShadow: "0 12px 40px rgba(0,0,0,.45)", padding: 12,
  },
  popHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  popTitle: { fontWeight: 700, fontSize: 16 },
  iconBtn: {
    background: "transparent", border: "1px solid var(--c-border-subtle, #2E222A)",
    borderRadius: 8, padding: "4px 8px", color: "inherit", cursor: "pointer",
  },
  popBody: { opacity: 0.9, lineHeight: 1.6, fontSize: 14, padding: "6px 2px" },
  popFooter: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 },
};
