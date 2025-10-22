// src/components/account/TodayRow.jsx
import React from "react";
import TodayCheckInInline from "@components/account/TodayCheckInInline.jsx";
import BreathCard from "@components/account/BreathCard.jsx";

export default function TodayRow() {
  return (
    <section className="surface" style={{ padding: 12 }}>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1.2fr .8fr",
        }}
      >
        <TodayCheckInInline />
        <div className="surface" style={{ padding: 12 }}>
          <h3 style={{ margin: "6px 0 12px" }}>Breathe</h3>
          <BreathCard />
        </div>
      </div>

      {/* Mobile: stack */}
      <style>{`
        @media (max-width: 900px) {
          section.surface > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

