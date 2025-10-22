// panels/AchievementsStatsPanel.jsx
import React from "react";
import DashSection from "@components/layout/DashSection.jsx";

export default function AchievementsStatsPanel({ kpi }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashSection title="Achievements & Stats">
        {/* KPIs / grid — keep flat, no nested plates unless necessary */}
        <div style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}>
          <KPI label="Check-ins (30d)" value={kpi.checkins || 0} />
          <KPI label="Avg Social Battery" value={kpi.avgBattery != null ? `${kpi.avgBattery} / 3` : "—"} sub={batteryLabel(kpi.avgBattery)} />
          <KPI label="Streak" value={kpi.streak || 0} />
          <KPI label="Entries Total" value={kpi.entries || 0} />
        </div>
      </DashSection>

      {/* If you need a second block, repeat DashSection */}
      <DashSection title="Recent Milestones">
        <MilestonesList items={kpi.milestones || []} />
      </DashSection>
    </div>
  );
}

