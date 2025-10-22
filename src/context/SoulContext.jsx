import React, { createContext, useContext, useMemo, useState } from "react";

const SoulCtx = createContext(null);

export function SoulProvider({ children }) {
  const [userArchetype, setUserArchetype] = useState(null); // e.g., "Windbearer"
  const [soulData, setSoulData] = useState([]);              // array of archetypes

  const value = useMemo(() => ({
    userArchetype,
    setUserArchetype,
    soulData,
    setSoulData,
  }), [userArchetype, soulData]);

  return <SoulCtx.Provider value={value}>{children}</SoulCtx.Provider>;
}

export function useSoul() {
  const ctx = useContext(SoulCtx);
  if (!ctx) throw new Error("useSoul must be used within <SoulProvider>");
  return ctx;
}

