// src/components/LogoWithVideoMask.jsx
import React, { useEffect, useRef, useState } from "react";

export default function LogoWithVideoMask({
  // assets
  logoSrc,
  mp4Src,
  webmSrc,
  poster,

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

  const [active, setActive]   = useState(0);
  const [ready, setReady]     = useState(false);
  const [duration, setDur]    = useState(0);
  const [videoErr, setVideoErr] = useState(false);

  // --- diagnostics once ---
  useEffect(() => {
    const miss = [];
    if (!mp4Src && !webmSrc) miss.push("mp4Src/webmSrc");
    if (!logoSrc) miss.push("logoSrc");
    if (miss.length) {
      // eslint-disable-next-line no-console
      console.warn(`[LogoWithVideoMask] missing prop(s): ${miss.join(", ")}`);
    }
  }, [logoSrc, mp4Src, webmSrc]);

  const safePlay = (el) => {
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  // Pause when off-screen
  useEffect(() => {
    if (!pauseOffscreen) return;
    const el = v0.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      const a = v0.current, b = v1.current;
      if (!a) return;
      if (e.isIntersecting) { safePlay(a); if (crossfade) safePlay(b); }
      else { a.pause(); b?.pause(); }
    }, { threshold: 0.1, rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [pauseOffscreen, crossfade]);

  // Bootstrap + visibility resilience
  useEffect(() => {
    const a = v0.current;
    if (!a) return;

    const onMeta = () => {
      const d = a.duration || 0;
      if (Number.isFinite(d) && d > 0) {
        setDur(d);
        setReady(true);
        safePlay(a);
        if (crossfade && v1.current) safePlay(v1.current);
      }
    };
    const onErr = () => setVideoErr(true);

    a.addEventListener("loadedmetadata", onMeta, { once: true });
    a.addEventListener("error", onErr);
    if (a.readyState >= 1) onMeta();

    const onWake = () => {
      if (document.hidden) return;
      safePlay(v0.current);
      if (crossfade) safePlay(v1.current);
    };
    window.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);

    // stalled time watchdog
    let lastT = 0, lastTick = performance.now();
    const watch = () => {
      const now = performance.now();
      const A = [v0.current, v1.current][active];
      if (A && !A.paused) {
        const t = A.currentTime || 0;
        if (now - lastTick > 1500 && Math.abs(t - lastT) < 0.05) safePlay(A);
        lastT = t; lastTick = now;
      }
      rafId.current = requestAnimationFrame(watch);
    };
    rafId.current = requestAnimationFrame(watch);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("error", onErr);
    };
  }, [crossfade, active]);

  // Crossfade scheduler
  useEffect(() => {
    if (!crossfade || !ready) return;
    const vids = [v0.current, v1.current];
    if (!vids[0] || !vids[1]) return;

    vids.forEach(el => { el.loop = false; el.style.transition = "opacity 0s"; });
    vids[active].style.opacity = "1";
    vids[1 - active].style.opacity = "0";
    safePlay(vids[active]);
    safePlay(vids[1 - active]);

    const fadeNow = () => {
      if (fading.current) return;
      fading.current = true;
      const A = vids[active];
      const B = vids[1 - active];
      try { B.currentTime = 0; } catch {}
      safePlay(B);
      B.style.transition = `opacity ${fadeDuration}s ease`;
      A.style.transition = `opacity ${fadeDuration}s ease`;
      B.style.opacity = "1"; A.style.opacity = "0";
      setTimeout(() => {
        A.pause(); try { A.currentTime = 0; } catch {}
        fading.current = false;
        setActive(p => 1 - p);
      }, fadeDuration * 1000 + 40);
    };

    const onEnded = () => fadeNow();
    vids[active].addEventListener("ended", onEnded);

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
    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      vids[active].removeEventListener("ended", onEnded);
    };
  }, [crossfade, ready, duration, active, fadeDuration]);

  // Simple loop if no crossfade
  useEffect(() => {
    if (crossfade || !ready) return;
    const a = v0.current;
    if (!a) return;
    a.loop = true;
    a.style.opacity = "1";
    safePlay(a);
  }, [crossfade, ready]);

  // ---------- styles ----------
  const wrapStyle = {
    position: "relative",
    display: "block",
    width: typeof width === "number" ? `${width}px` : width,
    aspectRatio: String(aspect),
    isolation: "isolate",
    marginInline: "auto",
  };
  const stack = { position: "relative", width: "100%", aspectRatio: String(aspect) };

  const masked = !!logoSrc && !debugUnmasked;

  const maskBoxStyle = masked ? {
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
  } : { position: "absolute", inset: 0, overflow: "hidden" };

  const videoBase = {
    position: "absolute",
    inset: "-12% -12% -8% -12%",
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

  const commonMasked = masked ? {
    WebkitMaskImage: `url("${logoSrc}")`,
    maskImage: `url("${logoSrc}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  } : {};

  const glassStyle = {
    position: "absolute",
    inset: 0,
    ...commonMasked,
    background:
      `radial-gradient(42% 28% at 50% 24%, rgba(255,240,200,${0.45 * glassIntensity}), transparent 70%),
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
    background:
      `radial-gradient(65% 55% at 50% 35%, rgba(255,255,255,${0.18 * glassIntensity}), transparent 72%),
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
    background:
      `linear-gradient(115deg,
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
    <div style={{
      position: "absolute",
      inset: 0,
      display: "grid",
      placeItems: "center",
      opacity: (ready && !videoErr) ? 0 : 1,
      transition: `opacity ${fadeDuration}s ease`,
    }}>
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
        {fallbackLayer}

        <div style={maskBoxStyle}>
          <video
            ref={v0}
            playsInline
            muted
            autoPlay
            preload="auto"
            crossOrigin="anonymous"
            poster={poster || undefined}
            style={{ ...videoBase, opacity: 1 }}
            onError={() => setVideoErr(true)}
            onLoadedData={() => { try { v0.current && (v0.current.style.opacity = "1"); } catch {} }}
          >
            {webmSrc ? <source src={webmSrc} type="video/webm" /> : null}
            {mp4Src ? <source src={mp4Src} type="video/mp4" /> : null}
          </video>

          {crossfade && (mp4Src || webmSrc) && (
            <video
              ref={v1}
              playsInline
              muted
              autoPlay
              preload="auto"
              crossOrigin="anonymous"
              onError={() => setVideoErr(true)}
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
      </div>
    </div>
  );
}
