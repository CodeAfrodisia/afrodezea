// src/pages/Art.tsx
// Thin wrapper to align Phase 1 Afrodezea World Art page with this app's src/ structure.
// It re-exports the implementation that currently lives under web/src/pages.
// Also pulls in the shimmer overlay styles locally so this app gets the same protection overlay.

import "../styles/afrodezea-art.css";
export { default } from "../../web/src/pages/Art";
