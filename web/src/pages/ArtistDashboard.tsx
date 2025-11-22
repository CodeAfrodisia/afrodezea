// web/src/pages/ArtistDashboard.tsx
import React, { useState } from 'react';
import { getMockPayoutProfile, createMockOnboardingLink } from '../payments/stripeConnect';

export default function ArtistDashboardPage() {
  const [profile, setProfile] = useState(() => getMockPayoutProfile('artist-1'));
  const [link, setLink] = useState<string | null>(null);

  const connect = () => {
    const l = createMockOnboardingLink({ artistId: 'artist-1', returnUrl: window.location.origin + '/artist/dashboard', refreshUrl: window.location.href });
    setLink(l.url);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-serif text-amber-200">Artist Dashboard</h1>
      </header>

      <section className="rounded-lg border border-white/10 p-4 bg-black/30">
        <div className="text-sm text-amber-100/90">Stripe Connect Payouts</div>
        <div className="text-xs text-amber-200/80">Status: {profile.status.replace('_',' ')}</div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={connect} className="rounded-md bg-amber-500 text-black px-3 py-2 text-sm hover:bg-amber-400">Connect Payouts</button>
          {link && <a href={link} target="_blank" rel="noreferrer" className="text-amber-300 underline">Open onboarding</a>}
        </div>
        <div className="mt-2 text-xs text-amber-200/70">Phase 1: mock only. No real Stripe calls.</div>
      </section>

      <section className="rounded-lg border border-white/10 p-4 bg-black/30">
        <div className="text-sm text-amber-100/90">My Artworks</div>
        <div className="text-xs text-amber-200/70">Coming soon — manage editions, pricing, fulfillment.</div>
      </section>
    </div>
  );
}
