// hooks/useTourMode.js
import { useEffect, useState } from "react";

export function useTourMode() {
  const [tourMode, setTourMode] = useState(false);

  useEffect(() => {
    const onStart = () => setTourMode(true);
    const onEnd = () => setTourMode(false);
    window.addEventListener("start-dashboard-tour", onStart);
    window.addEventListener("end-dashboard-tour", onEnd);
    return () => {
      window.removeEventListener("start-dashboard-tour", onStart);
      window.removeEventListener("end-dashboard-tour", onEnd);
    };
  }, []);

  return tourMode;
}

