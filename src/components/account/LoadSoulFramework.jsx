import { useEffect } from "react";
import { useSoul } from "@context/SoulContext.jsx";
import { loadSoulFramework } from "@lib/soulFramework.js";

export default function LoadSoulFramework() {
  const { setSoulData, userArchetype, setUserArchetype } = useSoul();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await loadSoulFramework();
        if (alive) setSoulData(data);
      } catch (e) {
        console.error("[soul] load failed", e);
      }
    })();
    return () => { alive = false; };
  }, [setSoulData]);

  // Default archetype once (until user picks one)
  useEffect(() => {
    if (!userArchetype) setUserArchetype("Windbearer");
  }, [userArchetype, setUserArchetype]);

  return null;
}

