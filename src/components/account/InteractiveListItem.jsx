// src/components/account/InteractiveListItem.jsx
import React from "react";
const interactiveItemStyle = { display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.75rem 1rem", marginBottom:"1rem", borderRadius:"10px", fontSize:"1.1rem", background:"rgba(255,255,255,0.04)", border:"1px solid var(--hairline)", transition:"all .2s" };
const hoverStyle = { boxShadow:"0 0 8px rgba(255,255,255,0.12)", transform:"translateY(-1px)" };

export function InteractiveListItem({ icon, label, value, step, onClick, isToday, isEditing, setIsEditing }) {
  const canEdit = isToday || isEditing;
  return (
    <li
      style={{ ...interactiveItemStyle, opacity: canEdit ? 1 : .5, cursor: canEdit ? "pointer" : "not-allowed" }}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, interactiveItemStyle)}
      onClick={() => { if (canEdit) { setIsEditing?.(true); onClick(step); } }}
    >
      {icon} {label}: {value || "Not Provided"}
    </li>
  );
}

