// src/components/LogoWithVideoMask.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Video-in-logo mask with optional crossfade loop and glass highlights.
 * Deploy-safe:
 *  - Autoplay policy (muted + playsInline), retry on gesture if blocked
 *  - crossOrigin="anonymous" (enable CORS on your video host if not same-origin)
 *  - Respects prefers-reduced-motion
 *
 * TIP: For simplest hosting, put files in /public/videos and pass "/videos/hero.mp4"
 */
export default function LogoWithVideoMask({
  // assets
  logoSrc,           // mask image (SVG/PNG) under /public
  mp4Src,            // MP4 (H.264/AAC) – required for Safari
  webmSrc,           // optional – Chrome/Edge/Firefox
  poster,            // optional poster

  // sizing & look
  width = "220px",
  aspect = 1.55,
  glass = true,
  glassIntensity = 0.75,
  ambientGlow = false,

  // video behavior
  crossfade = true,
  fadeDuration = 0.7,        // seconds
  pauseOffscreen = false,

  // composition
  videoScale = 1.2,
  videoPosX = "50%",
  videoPosY = "58%",

  // debug
  debugUnmasked = false,
}) {
  const v0 = useRef(null);
  const v1 = useRef(null);
  const rafId = useRef(0);
  const fading = useRef(false);

  const [active, setActive] = useState(0);   // 0 or 1
  const [readyA, setReadyA] = useState(false);
  const [readyB, setReadyB] = useState(false);
  const [duration, setDuration] = useState(0); // from v0
  const [videoErr, setVideoErr] = useState(false);
  const [autoBlocked, setAutoBlocked] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const allReady = crossfade ? (readyA && readyB) : readyA;

  const safePlay = (el) => {
    if (!el) return;
    // ensure policy-friendly flags before play()
    el.muted = true;
    el.playsInline = true;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => setAutoBlocked(true));
    }
  };

  /* ---- Pause when off-screen (optional) ---- */
  useEffect(() => {
    if (!pauseOffscreen) return;
    const anchor = v0.current;
    if (!anchor) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const a = v0.current, b = v1.current;
        if (!a) return;
        if (entry.isIntersecting) {
          safePlay(a);
          if (crossfade && b) safePlay(b);
        } else {
          a.pause();
          if (b) b.pause();
        }
      },
      { threshold: 0.1, rootMargin: "200px 0px" }
    );

    io.observe(anchor);
    return () => io.disconnect();
  }, [pauseOffscreen, crossfade]);

  /* ---- Bootstrap A (and duration) ---- */
  useEffect(() => {
    const a = v0.current;
    if (!a) return;
    const onMeta = () => {
      const d = a.duration || 0;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
        setReadyA(true);
        if (!prefersReducedMotion) safePlay(a);
      }
    };
    const onErr = () => setVideoErr(true);
    const onCanPlay = () => {
      if (!prefersReducedMotion) safePlay(a);
    };

    a.addEventListener("loadedmetadata", onMeta, { once: true });
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("error", onErr);
    if (a.readyState >= 1) onMeta();

    // Try again when tab regains focus (Safari sometimes stalls)
    const onWake = () => {
      if (document.hidden) return;
      if (!prefersReducedMotion) safePlay(v0.current);
    };
    window.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);

    return () => {
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("error", onErr);
      window.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
    };
  }, [prefersReducedMotion]);

  /* ---- Bootstrap B (if crossfade) ---- */
  useEffect(() => {
    if (!crossfade) return;
    const b = v1.current;
    if (!b) return;

    const onMeta = () => {
      // We don’t need duration from B; just ensure it can play
      setReadyB(true);
      if (!prefersReducedMotion) safePlay(b);
    };
    const onErr = () => setVideoErr(true);
    const onCanPlay = () => {
      if (!prefersReducedMotion) safePlay(b);
    };

    b.addEventListener("loadedmetadata", onMeta, { once: true });
    b.addEventListener("canplay", onCanPlay);
    b.addEventListener("error", onErr);
    if (b.readyState >= 1) onMeta();

    return () => {
      b.removeEventListener("canplay", onCanPlay);
      b.removeEventListener("error", onErr);
    };
  }, [crossfade, prefersReducedMotion]);

  /* ---- Watchdog: nudge if time stops updating ---- */
  useEffect(() => {
    let lastT = 0;
    let lastTick = performance.now();
    const watch = () => {
      const now = performance.now();
      const A = [v0.current, v1.current][active];
      if (A && !A.paused) {
        const t = A.currentTime || 0;
        if (now - lastTick > 1500 && Math.abs(t - lastT) < 0.05) safePlay(A);
        lastT = t;
        lastTick = now;
      }
      rafId.current = requestAnimationFrame(watch);
    };
    rafId.current = requestAnimationFrame(watch);
    return () => cancelAnimationFrame(rafId.current);
  }, [active]);

  /* ---- Crossfade loop ---- */
  useEffect(() => {
    if (!crossfade || !allReady || prefersReducedMotion) return;

    const vids = [v0.current, v1.current];
    if (!vids[0] || !vids[1]) return;

    // init opacity + no native looping; we orchestrate
    vids.forEach((el, i) => {
      if (!el) return;
      el.loop = false;
      el.style.transition = "opacity 0s";
      el.style.opacity = i === active ? "1" : "0";
      safePlay(el);
    });

    const fadeNow = () => {
      if (fading.current) return;
      const A = vids[active];
      const B = vids[1 - active];
      if (!A || !B) return;

      fading.current = true;
      try {
        B.currentTime = 0;
      } catch {}
      safePlay(B);

      B.style.transition = `opacity ${fadeDuration}s ease`;
      A.style.transition = `opacity ${fadeDuration}s ease`;
      B.style.opacity = "1";
      A.style.opacity = "0";

      setTimeout(() => {
        A.pause();
        try {
          A.currentTime = 0;
        } catch {}
        fading.current = false;
        setActive((prev) => 1 - prev);
      }, fadeDuration * 1000 + 40);
    };

    const tick = () => {
      const A = vids[active];
      if (A && !fading.current) {
        const d = duration || A.duration || 0;
        const t = A.currentTime || 0;
        const remaining = Math.max(0, d - t);
        const guard = Math.max(0.08, fadeDuration * 0.15);
        if (remaining <= fadeDuration + guard) fadeNow();
      }
      rafId.current = requestAnimationFrame(tick);
    };

    // safety: catch native ended as well
    const onEnded = fadeNow;
    vids[active].addEventListener("ended", onEnded);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      vids[active]?.removeEventListener("ended", onEnded);
    };
  }, [crossfade, allReady, duration, active, fadeDuration, prefersReducedMotion]);

  /* ---- Simple loop when not crossfading ---- */
  useEffect(() => {
    if (crossfade || !readyA) return;
    const a = v0.current;
    if (!a) return;
    a.loop = true;
    a.style.opacity = "1";
    if (!prefersReducedMotion) safePlay(a);
  }, [crossfade, readyA, prefersReducedMotion]);

  /* ---- Retry play on user gesture if autoplay blocked ---- */
  useEffect(() => {
    if (!autoBlocked) return;
    const onTap = () => {
      setAutoBlocked(false);
      const a = v0.current;
      const b = v1.current;
      if (a) safePlay(a);
      if (crossfade && b) safePlay(b);
    };
    window.addEventListener("click", onTap, { once: true });
    window.addEventListener("touchend", onTap, { once: true });
    return () => {
      window.removeEventListener("click", onTap, { once: true });
      window.removeEventListener("touchend", onTap, { once: true });
    };
  }, [autoBlocked, crossfade]);

  /* ---------------- styles ---------------- */
  const wrapStyle = {
    position: "relative",
    display: "block",
    width: typeof width === "number" ? `${width}px` : width,
    aspectRatio: String(aspect),
    isolation: "isolate",
    marginInline: "auto",
  };

  const stack = { position: "relative", width: "100%", aspectRatio: String(aspect) };

  // Mask box (explicit properties—shorthand is flaky on some builds)
  const maskBoxStyle = debugUnmasked
    ? {}
    : {
        position: "absolute",
        inset: 0,
        WebkitMaskImage: `url("${logoSrc}")`,
        maskImage: `url("${logoSrc}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        overflow: "hidden",
      };

  const videoBase = {
    position: "absolute",
    inset: "-12% -12% -8% -12%", // bleed to cover strokes fully
    width: "auto",
    height: "auto",
    minWidth: "120%",
    minHeight: "120%",
    objectFit: "cover",
    objectPosition: `${videoPosX} ${videoPosY}`,
    transform: `scale(${videoScale})`,
    filter: "contrast(1.12) saturate(1.08) brightness(1.06)",
    pointerEvents: "none",
    transition: "opacity 0s linear",
    opacity: 0,
  };

  const commonMasked = debugUnmasked
    ? {}
    : {
        WebkitMaskImage: `url("${logoSrc}")`,
        maskImage: `url("${logoSrc}")`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      };

  const glassStyle = {
    position: "absolute",
    inset: 0,
    ...commonMasked,
    background: `radial-gradient(42% 28% at 50% 24%, rgba(255,240,200,${0.45 * glassIntensity}), transparent 70%),
                 linear-gradient(to bottom,
                   color-mix(in oklab, #ffb76a, white 38%),
                   color-mix(in oklab, #ffb76a, black 28%))`,
    mixBlendMode: "screen",
    opacity: Math.min(0.95, 0.82 * glassIntensity),
    filter: `saturate(${1.05 + 0.05 * glassIntensity}) brightness(${1.02 + 0.02 * glassIntensity})`,
    pointerEvents: "none",
  };

  const rimStyle = {
    position: "absolute",
    inset: 0,
    ...commonMasked,
    background: `radial-gradient(65% 55% at 50% 35%, rgba(255,255,255,${0.18 * glassIntensity}), transparent 72%),
                 radial-gradient(90% 80% at 50% 60%, rgba(0,0,0,${0.10 * glassIntensity}), transparent 78%)`,
    filter: "blur(2px)",
    mixBlendMode: "soft-light",
    opacity: Math.min(0.5, 0.35 * glassIntensity),
    pointerEvents: "none",
  };

  const sweepStyle = {
    position: "absolute",
    inset: 0,
    ...commonMasked,
    background: `linear-gradient(115deg,
      transparent 15%,
      rgba(255,255,255,${0.10 * glassIntensity}) 28%,
      rgba(255,255,255,${0.18 * glassIntensity}) 34%,
      rgba(255,255,255,${0.10 * glassIntensity}) 40%,
      transparent 55%)`,
    backgroundSize: "220% 220%",
    animation: "specSweep 4.6s ease-in-out infinite",
    mixBlendMode: "screen",
    opacity: Math.min(0.35, 0.25 * glassIntensity),
    pointerEvents: "none",
  };

  const glowStyle = {
    position: "absolute",
    inset: "-20vh -24vw",
    background:
      "radial-gradient(70% 45% at 50% 52%, rgba(255,220,150,.55), transparent 65%)," +
      "radial-gradient(120% 80% at 50% 62%, rgba(0,0,0,.45), transparent 75%)",
    filter: "blur(18px)",
    mixBlendMode: "screen",
    opacity: 0.75,
    zIndex: -1,
    pointerEvents: "none",
  };

  const fallbackLayer = (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        opacity: allReady && !videoErr && !prefersReducedMotion ? 0 : 1,
        transition: `opacity ${fadeDuration}s ease`,
      }}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt="Afrodezea"
          style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
          loading="eager"
          decoding="async"
        />
      ) : null}
    </div>
  );

  return (
    <div style={wrapStyle} aria-hidden>
      <style>{`
        @keyframes specSweep {
          0%   { background-position: -60% 0%;   opacity: 0.00; }
          10%  { opacity: .28; }
          40%  { background-position: 50% 0%;   opacity: .35; }
          70%  { opacity: .18; }
          100% { background-position: 160% 0%;  opacity: 0.00; }
        }
      `}</style>

      {ambientGlow && <div style={glowStyle} />}

      <div style={stack}>
        {/* Static logo behind the masked video */}
        {fallbackLayer}

        {/* Masked video box */}
        <div style={maskBoxStyle}>
          {/* Video A (visible immediately) */}
          <video
            ref={v0}
            playsInline
            muted
            autoPlay={!prefersReducedMotion}
            preload="auto"
            poster={poster || undefined}
            crossOrigin="anonymous"
            style={{ ...videoBase, opacity: 1 }}
            onError={() => setVideoErr(true)}
            onLoadedData={() => {
              // ensure flags are on before any play() calls
              const el = v0.current;
              if (el) {
                el.muted = true;
                el.playsInline = true;
              }
            }}
          >
            {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
            {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
          </video>

          {/* Video B (for crossfade) */}
          {crossfade && (
            <video
              ref={v1}
              playsInline
              muted
              autoPlay={!prefersReducedMotion}
              preload="auto"
              crossOrigin="anonymous"
              onError={() => setVideoErr(true)}
              onLoadedData={() => {
                const el = v1.current;
                if (el) {
                  el.muted = true;
                  el.playsInline = true;
                }
              }}
              style={videoBase}
            >
              {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
              {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
            </video>
          )}
        </div>

        {glass && (
          <>
            <div style={glassStyle} />
            <div style={rimStyle} />
            <div style={sweepStyle} />
          </>
        )}

        {/* Gesture fallback if autoplay is blocked */}
        {autoBlocked && (
          <button
            className="btn btn-outline-gold"
            style={{ position: "absolute", bottom: 8, right: 8, zIndex: 3 }}
            onClick={() => {
              setAutoBlocked(false);
              safePlay(v0.current);
              if (crossfade) safePlay(v1.current);
            }}
          >
            Play
          </button>
        )}
      </div>
    </div>
  );
}
