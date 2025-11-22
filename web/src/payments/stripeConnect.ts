// web/src/payments/stripeConnect.ts
// Phase 1 scaffold: No live keys, no network calls. Interfaces and TODOs only.

export type StripeConnectStatus = 'not_connected' | 'pending' | 'verified';

export interface ArtistPayoutProfile {
  artistId: string;
  status: StripeConnectStatus;
  accountId?: string; // Stripe acct id once created
  lastUpdated?: string;
}

export interface CreateOnboardingLinkParams {
  artistId: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface OnboardingLink {
  url: string;
  expiresAt: string;
}

// Mock helpers for Phase 1 UI demos only
export function getMockPayoutProfile(artistId: string): ArtistPayoutProfile {
  return {
    artistId,
    status: 'not_connected',
    lastUpdated: new Date().toISOString(),
  };
}

export function createMockOnboardingLink(_: CreateOnboardingLinkParams): OnboardingLink {
  return {
    url: 'https://dashboard.stripe.com/connect/onboarding/mock',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };
}

// TODO (Phase 2):
// - Server-side function to create Connect account and generate onboarding link
// - Webhook handlers for account.updated to detect verification status
// - Save mapping (artist_id ⇄ stripe_account_id) securely in DB
