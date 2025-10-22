import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  useState,
} from "react";
import supabase from "@lib/supabaseClient.js";
import { BreathAudio } from "../../audio/engine.js";

/** Theme tokens */
const fallbackTheme = {
  background: "var(--c-bg, #121212)",
  text: "var(--c-ink, #F9F9F9)",
  textMuted: "var(--c-ink-muted, #B8AEB6)",
  gold: "var(--brand-gold, #D4AF37)",
  borderSubtle: "var(--c-border-subtle, #2E222A)",
  ringTrack: "color-mix(in srgb, var(--c-ink, #F9F9F9) 14%, transparent)",
  ringFill: "var(--brand-gold, #D4AF37)",
};

async function onBreathCompleted(seconds = 60) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("breath_sessions").insert({
    user_id: user.id,
    seconds,
    duration_seconds: seconds,
  });
}

function mapVariantToMode(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().replace(/\s+/g, "");
  if (s === "4-7-8" || s === "478" || s === "4–7–8") return "478";
  if (s === "box" || s === "box4444") return "box";
  return null;
}

const BreathCard = forwardRef(function BreathCard(
  { theme: themeProp, defaultMode = "box", onReady },
  ref
) {
  const theme = { ...fallbackTheme, ...(themeProp || {}) };

  // Modes
  const MODES = {
    box: {
      label: "Box 4–4–4–4",
      phases: [
        { name: "Inhale", seconds: 4 },
        { name: "Hold", seconds: 4 },
        { name: "Exhale", seconds: 4 },
        { name: "Hold", seconds: 4 },
      ],
    },
    "478": {
      label: "4–7–8",
      phases: [
        { name: "Inhale", seconds: 4 },
        { name: "Hold", seconds: 7 },
        { name: "Exhale", seconds: 8 },
      ],
    },
  };

  const [mode, setMode] = useState(defaultMode in MODES ? defaultMode : "box");
  const phases = MODES[mode].phases;

  // Timer / machine
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [step, setStep] = useState(0); // 0..duration (0% → 100%)
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Visual ring control (SVG)
  const [visualPct, setVisualPct] = useState(0);        // 0..100 drives stroke
  const [pathAnimEnabled, setPathAnimEnabled] = useState(true); // toggle CSS transition
  const [boot, setBoot] = useState(true);               // first Start begins at 0%

  // Refs for interval-safe reads
  const intervalRef = useRef(null);
  const runningRef = useRef(false);
  const phaseIndexRef = useRef(0);
  const stepRef = useRef(0);
  const elapsedRef = useRef(0);
  const loggedRef = useRef(false);
  const MIN_SECONDS_TO_LOG = 30;


  // ===== AUDIO STATE =====
const audioRef = useRef(null);
const bedSrcRef = useRef(null);


const [buffers, setBuffers] = useState({
  ocean: null,
  breath: null,     // human breathing
  rain: null,
  fireplace: null,
  forest: null,
  kalimba: null,
  brown: null,      // generated
});


const [soundOn, setSoundOn] = useState(false);
const [bedChoice, setBedChoice] = useState("ocean"); // "ocean" | "breath" | etc.

// init engine once
useEffect(() => {
  audioRef.current = new BreathAudio();
}, []);

// preload assets (update paths to your actual files)
// Bed URLs (public paths)
const BED_URLS = {
  ocean:     "/audio/ocean.mp3",
  breath:    "/audio/human_breathing.mp3",
  rain:      "/audio/rain.mp3",
  fireplace: "/audio/fireplace.mp3",
  forest:    "/audio/forest.mp3",
  kalimba:   "/audio/kalimba_wash.mp3",
};

const [brownBuf, setBrownBuf] = useState(null);

// Generate brown noise once
useEffect(() => {
  if (!audioRef.current) return;
  const A = audioRef.current;
  try {
    const buf = A.makeBrownNoiseBuffer(90);
    setBrownBuf(buf);
  } catch (e) {
    console.error("Brown noise gen failed", e);
  }
}, []);

// Perceived-loudness normalization (tweak to taste; 0..1)
const BED_NORM = {
  ocean:     0.85,
  breath:    0.80, // human breathing
  rain:      0.85,
  fireplace: 0.85,
  forest:    0.85,
  kalimba:   0.75,
  brown:     0.05, // brown is naturally loud; keep lower
};

// Global user volume (0..1)
const [bedVol, setBedVol] = useState(0.80);


useEffect(() => {
  const A = audioRef.current;
  if (!A) return;
  if (running && soundOn) {
    const norm = BED_NORM[bedChoice] ?? 0.8;
    A.setBedVolume(norm * bedVol); // smooth ramp in engine
  }
}, [bedVol, bedChoice, running, soundOn]);



// helpers to enable/disable bed
function startBed(kind) {
  const A = audioRef.current;
  if (!A || !soundOn) return;

  const norm = BED_NORM[kind] ?? 0.8;

  if (kind === "brown") {
    if (brownBuf) {
      A.stopLoop();
      A.playLoop(brownBuf); // buffer-based
      A.setBedVolume(norm * bedVol);
    }
  } else {
    const url = BED_URLS[kind] || BED_URLS.ocean;
    A.playLoopUrl(url);     // media-element-based
    A.setBedVolume(norm * bedVol);
  }
}


function stopBed() {
  const A = audioRef.current;
  if (!A) return;
  A.stopLoop();
}


// call this whenever a phase *starts*
function onPhaseEnter(name, seconds) {
  const A = audioRef.current;
  if (!A || !soundOn) return;
  if (name === "Inhale") A.glideInhale(seconds);
  else if (name === "Exhale") A.glideExhale(seconds);
  else A.holdStill();
  // optional: cues later (bells, kalimba plucks)
}

useEffect(() => {
  if (!audioRef.current) return;

  // If we’re not running, just make sure audio is stopped when sound is off.
  if (!running) {
    if (!soundOn) stopBed();
    return;
  }

  // We ARE running: turning sound on should start the current bed immediately.
  (async () => {
    if (soundOn) {
      if (audioRef.current.ctx && audioRef.current.ctx.state !== "running") {
        try { await audioRef.current.ctx.resume(); } catch {}
      }
      startBed(bedChoice); // begins/refreshes the looping bed now
    } else {
      stopBed();
    }
  })();
}, [soundOn, running]); // (we keep bedChoice changes handled by your <select> onChange)


  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { phaseIndexRef.current = phaseIndex; }, [phaseIndex]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // Controls
  const start = async () => {
  if (!running) setRunning(true);
  if (!running) loggedRef.current = false;
  setBoot(true);
  setPhaseIndex(0);
  setStep(0);
  setVisualPct(0);
  setPathAnimEnabled(true);
  setElapsed(0);

  // IMPORTANT: resume AudioContext after user gesture
  if (audioRef.current?.ctx && audioRef.current.ctx.state !== "running") {
    try { await audioRef.current.ctx.resume(); } catch (e) {}
  }

  if (soundOn) startBed(bedChoice);
  const firstPhase = phases[0];
  onPhaseEnter(firstPhase.name, firstPhase.seconds);
};


  const stop = async () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopBed();
    if (!loggedRef.current && elapsedRef.current >= MIN_SECONDS_TO_LOG) {
      await onBreathCompleted(elapsedRef.current);
      loggedRef.current = true;
    }
  };

  const reset = async () => {
    stop();
    setPhaseIndex(0);
    setStep(0);
    setVisualPct(0);
    setPathAnimEnabled(true);
    setCycles(0);
    setElapsed(0);
    setBoot(true);
    loggedRef.current = false;
  };

  // Expose API
  useImperativeHandle(ref, () => ({
    start: (variant) => {
      const m = mapVariantToMode(variant);
      if (m && m !== mode) {
        setMode(m);
        setTimeout(start, 0);
      } else {
        start();
      }
    },
    stop,
    setMode: (m) => {
      const mapped = mapVariantToMode(m) || m;
      if (mapped === "box" || mapped === "478") setMode(mapped);
    },
    reset,
    isRunning: () => running,
    mode: () => mode,
  }));

  useEffect(() => {
    const api = {
      start: (variant) => ref?.current?.start?.(variant),
      stop: () => ref?.current?.stop?.(),
      setMode: (m) => ref?.current?.setMode?.(m),
      reset: () => ref?.current?.reset?.(),
    };
    window.__breath = api;
    if (typeof onReady === "function") onReady(api);
    return () => { if (window.__breath === api) delete window.__breath; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main ticking loop (single writer controls visualPct)
  useEffect(() => {
    if (!running) return;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!runningRef.current) return;

      setElapsed((s) => s + 1);

      const duration = phases[phaseIndexRef.current].seconds || 1;

      // Normal tick — advance forward
      if (stepRef.current < duration) {
        const nextStep = stepRef.current + 1;
        setStep(nextStep);

        const nextPct = (nextStep / duration) * 100;
        setPathAnimEnabled(true);     // ensure transition ON for normal progress
        setVisualPct(nextPct);        // clockwise update

        if (stepRef.current === 0 && boot) setBoot(false);
        return;
      }

      // Boundary: just held 100% for a tick → advance phase
      const nextIdx = (phaseIndexRef.current + 1) % phases.length;
      const nextDur = phases[nextIdx].seconds || 1;

      setPhaseIndex(nextIdx);
      setStep(1);                     // first visible: N-1
      if (nextIdx === 0) setCycles((c) => c + 1);

      // AUDIO: announce phase start
      onPhaseEnter(phases[nextIdx].name, nextDur);

      // Reset without reverse: disable transition → 0 → next frame enable + animate to first step
      setPathAnimEnabled(false);
      setVisualPct(0);                // instant paint at 0%

      // Double RAF to guarantee the 0% frame is committed before animating
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPathAnimEnabled(true);
          setVisualPct((1 / nextDur) * 100); // smooth 0 → 1/N
        });
      });
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [running, mode, boot, phases]);

  // Mode change → normalize for next Start
  useEffect(() => {
    setPhaseIndex(0);
    setStep(0);
    setVisualPct(0);
    setPathAnimEnabled(true);
    setBoot(true);
    // restart bed if sound is on and we are running (optional)
  if (running && soundOn) {
    stopBed();
    startBed(bedChoice);
    const p = phases[0];
    onPhaseEnter(p.name, p.seconds);
  }
  }, [mode]);

  // Geometry
  const size = 160;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const phase = phases[phaseIndex];
  const duration = phase.seconds;
  const remaining = Math.max(0, duration - step);

  // Dash offset from visualPct
  const offset = circumference - (visualPct / 100) * circumference;


  

  const chipStyle = (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: active
      ? `1px solid color-mix(in srgb, ${theme.gold} 60%, transparent)`
      : `1px solid ${theme.borderSubtle}`,
    background: active ? "rgba(212,175,55,.10)" : "transparent",
    color: active ? theme.gold : theme.text,
    cursor: "pointer",
    fontWeight: 600,
    transition: "border-color .15s ease, background .15s ease, color .15s ease",
  });

  return (
    <section
      className="breath flat"
      style={{
        background: theme.background,
        color: theme.text,
        padding: 0,
        display: "grid",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Breathe</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("box")}
            style={chipStyle(mode === "box")}
            aria-pressed={mode === "box"}
          >
            Box
          </button>
          <button
            onClick={() => setMode("478")}
            style={chipStyle(mode === "478")}
            aria-pressed={mode === "478"}
          >
            4–7–8
          </button>
          
<div style={{ display: "flex", gap: 8 }}>
  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <input
  type="checkbox"
  checked={soundOn}
  onChange={(e) => setSoundOn(e.target.checked)}
/>

    Sound
  </label>
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <label style={{ fontSize: 12, color: theme.textMuted }}>Vol</label>
  <input
    type="range"
    min={0}
    max={100}
    value={Math.round(bedVol * 100)}
    onChange={(e) => setBedVol(Number(e.target.value) / 100)}
    style={{ width: 120 }}
    aria-label="Bed volume"
  />
</div>

  <select
    value={bedChoice}
    onChange={(e) => {
      const v = e.target.value;
      setBedChoice(v);
      if (soundOn) {
        stopBed();
        startBed(v);
      }
    }}
    style={{ background: "transparent", color: theme.text, border: `1px solid ${theme.borderSubtle}`, borderRadius: 6, padding: "2px 6px" }}
  >
    <option value="ocean">Ocean</option>
    <option value="breath">Human breathing</option>
    <option value="rain">Rain</option>
    <option value="fireplace">Fireplace</option>
    <option value="forest">Forest</option>
    <option value="kalimba">Kalimba wash</option>
    <option value="brown">Brown noise</option>
  </select>
</div>


        </div>
      </div>

      {/* Ring */}
      <div style={{ display: "grid", placeItems: "center", gap: 8 }}>
        <svg width={size} height={size} role="img" aria-label={`${phase.name} – ${remaining}s`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.ringTrack}
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress (controlled by visualPct) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.ringFill}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: pathAnimEnabled
                ? "stroke-dashoffset .9s linear"
                : "none",
            }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          {/* Labels */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            style={{ fill: theme.text, fontSize: 18, fontWeight: 700 }}
          >
            {phase.name}
          </text>
          <text
            x="50%"
            y="64%"
            textAnchor="middle"
            style={{ fill: theme.textMuted, fontSize: 14 }}
          >
            {remaining}s
          </text>
        </svg>

        <div aria-live="polite" style={{ fontSize: 12, color: theme.textMuted }}>
          Cycles: {cycles}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {!running ? (
          <button onClick={start} style={chipStyle(true)}>Start</button>
        ) : (
          <button onClick={stop} style={chipStyle(true)}>Pause</button>
        )}
        <button onClick={reset} style={chipStyle(false)}>Reset</button>
      </div>
    </section>
  );
});

export default BreathCard;
