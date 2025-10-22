// src/components/profile/widgets/BreathWidget.jsx
import React, { useEffect, useRef, useState } from "react";
import PlaceholderCard from "../PlaceholderCard.jsx";

/** Simple 4-7-8 guide; no timers persisted, just a classy public widget */
export default function BreathWidget() {
  const [phase, setPhase] = useState("Inhale");
  const [count, setCount] = useState(4);
  const timer = useRef(null);

  useEffect(() => {
    // very gentle loop (4-7-8)
    function run() {
      let seq = [
        { label: "Inhale", secs: 4 },
        { label: "Hold", secs: 7 },
        { label: "Exhale", secs: 8 },
      ];
      let i = 0;
      let t = 0;

      function step() {
        const p = seq[i];
        setPhase(p.label);
        setCount(p.secs);
        let remain = p.secs;

        function tick() {
          remain -= 1;
          setCount(remain);
          if (remain <= 0) {
            i = (i + 1) % seq.length;
            step();
          } else {
            timer.current = setTimeout(tick, 1000);
          }
        }
        timer.current = setTimeout(tick, 1000);
      }
      step();
    }

    run();
    return () => clearTimeout(timer.current);
  }, []);

  return (
    <PlaceholderCard title="Breathe">
      <div style={{ display: "grid", placeItems: "center", padding: 8 }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>{phase}</div>
        <div style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "1px solid var(--hairline)",
          display: "grid",
          placeItems: "center",
          fontSize: 26,
          fontWeight: 700
        }}>
          {count > 0 ? count : 0}
        </div>
        <div style={{ opacity: .75, marginTop: 8, fontSize: 12 }}>
          4–7–8 cycle
        </div>
      </div>
    </PlaceholderCard>
  );
}

