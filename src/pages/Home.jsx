// src/pages/Home.jsx
import React from "react";
import { Helmet } from "react-helmet-async";
import { getSiteOrigin } from "../lib/site.js";

export default function Home() {
  const origin = getSiteOrigin();
<Helmet>
  <link rel="canonical" href={`${origin}/`} />
</Helmet>

  const title = "Afrodezea — Luxury Candles";
  const desc =
    "Discover premium candles with rich scent profiles and refined design.";
    

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        {origin && <link rel="canonical" href={`${origin}/`} />}

        {/* Organization JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Afrodezea",
            url: origin || undefined,
            // Replace with your actual logo path when ready:
            logo: origin ? `${origin}/logo.png` : undefined,
          })}
        </script>
      </Helmet>

      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 8 }}>Afrodezea</h1>
        <p>Welcome. Use the nav to explore products.</p>
      </div>
    </>
  );
}
