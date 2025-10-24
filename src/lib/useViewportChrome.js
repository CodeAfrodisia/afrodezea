// src/lib/useViewportChrome.js
import { useEffect } from "react";

export default function useViewportChrome(footerSelector = ".shop-footer") {
  useEffect(() => {
    // --- dynamic viewport (mobile browser bars) ---
    const setVH = () => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    window.visualViewport?.addEventListener("resize", setVH);

    // --- footer height padding ---
    const el = document.querySelector(footerSelector);
    const setFooter = () => {
      const h = el?.offsetHeight ?? 72;
      document.documentElement.style.setProperty("--footer-height", `${h}px`);
    };
    setFooter();

    let ro;
    if (el && "ResizeObserver" in window) {
      ro = new ResizeObserver(setFooter);
      ro.observe(el);
    }
    window.addEventListener("resize", setFooter);

    return () => {
      window.removeEventListener("resize", setVH);
      window.visualViewport?.removeEventListener("resize", setVH);
      window.removeEventListener("resize", setFooter);
      ro?.disconnect();
    };
  }, [footerSelector]);
}

