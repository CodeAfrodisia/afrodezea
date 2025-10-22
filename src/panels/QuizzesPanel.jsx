// panels/QuizzesPanel.jsx
import React from "react";
import DashSection from "@components/layout/DashSection.jsx";

export default function QuizzesPanel({ userId }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DashSection title="Your Quiz Results">
        <ProfileQuizzesTab userId={userId} />
      </DashSection>

      <DashSection title="Explore More Quizzes" right={<Link className="btn-outline-gold" to="/quizzes">Browse</Link>}>
        <QuizzesHubCompact />
      </DashSection>
    </div>
  );
}

