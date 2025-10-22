// components/layout/DashSection.jsx
import React from "react";

export default function DashSection({ title, right = null, children, style }) {
  return (
    <section className="plate group--corners" style={{ padding: 16, ...style }}>
      {title ? (
        <div className="section-title" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <hr className="rule-gold" />
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

