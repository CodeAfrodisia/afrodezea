// panels/SettingsPanel.jsx
import React from "react";
import DashSection from "@components/layout/DashSection.jsx";

export default function SettingsPanel({ user, onSave }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashSection title="Profile Settings">
        <SettingsForm user={user} onSave={onSave} />
      </DashSection>

      <DashSection title="Preferences">
        <PreferencesForm />
      </DashSection>
    </div>
  );
}

