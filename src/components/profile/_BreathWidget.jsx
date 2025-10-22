// src/components/profile/_BreatheWidget.jsx
import React from "react";
import BreathCard from "@components/account/BreathCard.jsx";
export default function _BreatheWidget({ payload }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Breathe</div>
      <BreathCard seconds={payload?.seconds ?? 60} />
    </div>
  );
}
