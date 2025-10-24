// src/pages/Home.jsx
import React from "react";
import { Helmet } from "react-helmet-async";
import LogoWithVideoMask from "@/components/LogoWithVideoMask.jsx";

// ✅ Import your assets so Vite bundles them (no CORS surprises)
import markSvg     from "@/assets/brand/mark.svg";
import loopPoster  from "@/assets/hero/hero-poster.jpg";   // optional but nice
import loopMp4     from "@/assets/hero/hero-loop.mp4";
import loopWebm    from "@/assets/hero/hero-loop.webm";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Afrodezea — Where Self-Love Begins</title>
        <meta name="description" content="Luxury candles for intention and self-love." />
      </Helmet>

      <section
        className="container"
        style={{
          minHeight: "calc(100vh - var(--topnav-h, 64px) - var(--footer-height, 0px))",
          display: "grid",
          placeItems: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 28 }}>
          {/* Video-in-logo hero */}
          <LogoWithVideoMask
            logoSrc={markSvg}
            mp4Src={loopMp4}
            webmSrc={loopWebm}
            poster={loopPoster}
            width="260px"
            crossfade={false}      // flip to true if you want A/B crossfade
            pauseOffscreen={true}
            glass={true}
            ambientGlow={false}
          />

          {/* Headline + CTAs (tweak to taste) */}
          <h1 style={{ fontSize: "clamp(28px, 6vw, 48px)", margin: 0 }}>
            Welcome to Afrodezea
          </h1>
          <p style={{ opacity: 0.8, marginTop: -8 }}>Where Self-Love Begins</p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a className="btn" href="/login">Login</a>
            <a className="btn btn--ghost" href="/products">Continue As Guest</a>
          </div>
        </div>
      </section>
    </>
  );
}
