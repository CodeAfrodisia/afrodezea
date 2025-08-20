import React from 'react';
export default function CollectionTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {tabs.map(t => {
        const selected = t.key === active
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding:"10px 14px",
              textAlign:"left",
              borderRadius:10,
              border:`1px solid ${selected ? "#6a5" : "#333"}`,
              background:selected ? "#1a1f16" : "#121212",
              color:"#eee",
              cursor:"pointer",
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

