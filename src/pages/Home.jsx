// src/pages/Home.jsx
import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { getSiteOrigin } from "@lib/site.js";

import LogoWithVideoMask from "@components/LogoWithVideoMask.jsx";

// If the files are in project-root/public/...
const flameMp4 = "/video/candlelight.mp4";
const logoPng  = "/public/candle-no-stick.png";

export default function Home() {
  const origin = getSiteOrigin();

  return (
    <>
      <Helmet>
        <title>Afrodezea — Where Self-Love Begins</title>
        <meta name="description" content="Welcome to Afrodezea. Where Self-Love Begins." />
        {origin && <link rel="canonical" href={`${origin}/`} />}
      </Helmet>

      <main style={root}>
        <section style={hero} aria-labelledby="home-title">
          <h1 id="home-title" style={h1}>Welcome to Afrodezea</h1>
          <p style={tag}>Where Self-Love Begins</p>

          <div style={{ margin: "16px 0 18px" }}>
            <LogoWithVideoMask
              logoSrc="/candle-no-stick.png"
              mp4Src="/video/candlelight.mp4"
              width="clamp(150px, 16vw, 220px)"
              aspect={1.55}
              glass
              crossfade
              fadeDuration={0.7}  // tweak 0.5–1.2s to taste
              videoScale={1.25}
              videoPosX="50%"
              videoPosY="60%"
              debugUnmasked={false}
            />
          </div>

          <div style={actions}>
            <Link to="/login"  style={{ ...btn, ...btnSolid }}>Login</Link>
            <Link to="/browse" style={{ ...btn, ...btnOutline }}>Continue As Guest</Link>
          </div>
        </section>
      </main>
    </>
  );
}

const root    = { minHeight: "100vh", display: "grid", placeItems: "center", padding: "clamp(16px,3vw,32px)" };
const hero    = { textAlign: "center", maxWidth: 880, margin: "0 auto" };
const h1      = { margin: 0, fontSize: "clamp(28px,6vw,56px)", letterSpacing: "-.02em", lineHeight: 1.1 };
const tag     = { margin: "10px 0 0", opacity: .9, fontSize: "clamp(16px,2.4vw,22px)" };
const actions = { display: "flex", gap: 12, justifyContent: "center", marginTop: 18, flexWrap: "wrap" };
const btn     = { display:"inline-flex", alignItems:"center", justifyContent:"center", padding:"10px 20px", borderRadius:999, textDecoration:"none", fontWeight:500, fontSize:"clamp(14px,1.8vw,16px)" };
const btnSolid   = { border:"1px solid currentColor" };
const btnOutline = { border:"1px solid currentColor", background:"transparent" };
