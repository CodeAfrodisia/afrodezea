import React from "react";

import LoungeHero from "@components/lounge/LoungeHero.jsx";
import NowPlayingBar from "@components/lounge/NowPlayingBar.jsx";
import SegmentSelector from "@components/lounge/SegmentSelector.jsx";
import FeaturedArtist from "@components/lounge/FeaturedArtist.jsx";
import AlbumShowcase from "@components/lounge/AlbumShowcase.jsx";
import EnterLoungeCTA from "@components/lounge/EnterLoungeCTA.jsx";
import SelfLoveStrip from "@components/lounge/SelfLoveStrip.jsx";

export default function JennLounge() {
  return (
    <main className="page lounge-page" data-page="jenn-lounge">
      {/* 1) Hero Header */}
      <LoungeHero />

      {/* 2) Now Playing Bar */}
      <NowPlayingBar />

      {/* 3) Segment Selector */}
      <SegmentSelector />

      {/* 4) Featured Artist Spotlight */}
      <FeaturedArtist />

      {/* 5) Afrodisia Album Showcase */}
      <AlbumShowcase />

      {/* 6) Enter the Lounge (immersive CTA) */}
      <EnterLoungeCTA />

      {/* 7) Optional — Self Love Notes */}
      <SelfLoveStrip />
    </main>
  );
}
