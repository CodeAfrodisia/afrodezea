import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import "./index.css";
import MathRacePage from "./pages/MathRace";
import ArtPage from "./pages/Art";
import VaultPage from "./pages/Vault";
import VerifyPage from "./pages/Verify";
import ArtistUploadPage from "./pages/ArtistUpload";
import ArtistDashboardPage from "./pages/ArtistDashboard";

function Nav() {
  return (
    <nav className="flex items-center justify-between gap-4 p-3 text-sm sticky top-0 bg-black/60 backdrop-blur z-50">
      <div className="flex items-center gap-3">
        <Link to="/art" className="font-semibold text-amber-300">Afrodezea World</Link>
        <Link to="/art" className="hover:text-amber-200">Art</Link>
        <Link to="/vault" className="hover:text-amber-200">Vault</Link>
        <Link to="/verify/AFD-2025-000124" className="hover:text-amber-200">Verify</Link>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/artist/upload" className="hover:text-amber-200">Artist Upload</Link>
        <Link to="/artist/dashboard" className="hover:text-amber-200">Artist Dashboard</Link>
        <Link to="/math-race" className="hover:text-amber-200">MathRace</Link>
      </div>
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <Nav />
        <div className="mx-auto max-w-6xl p-4">
          <Routes>
            <Route path="/" element={<Navigate to="/art" replace />} />
            <Route path="/art" element={<ArtPage />} />
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/verify/:code" element={<VerifyPage />} />
            <Route path="/math-race" element={<MathRacePage />} />
            <Route path="*" element={<Navigate to="/art" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  </React.StrictMode>
);
