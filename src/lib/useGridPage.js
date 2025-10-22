// src/lib/useGridPager.js
import { useEffect, useState } from "react";

export default function useGridPager() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR, { passive: true });
    return () => window.removeEventListener("resize", onR);
  }, []);

  // tweak breakpoints to your design
  const cols =
    w >= 1440 ? 5 :
    w >= 1280 ? 4 :
    w >= 980  ? 3 :
    w >= 640  ? 2 : 1;

  return { cols, itemsPerPage: cols * 2 };
}

