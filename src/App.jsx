// src/App.jsx
import React, { lazy, Suspense, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useParams,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Helmet } from "react-helmet-async";

import { useCart } from "./context/CartContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import PageBoundary from "./components/PageBoundary.jsx";
import AccountDashboard from "@components/account/AccountDashboardShell.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AccountLink from "./components/auth/AccountLink.jsx";
import CheckIn from "@pages/CheckIn.jsx";

import ProfilePage from "@pages/ProfilePage.jsx";
import CartDrawer from "./components/shop/CartDrawer.jsx";
import ProfileNavLink from "@components/nav/ProfileNavLink.jsx";

import QuizzesHub from "@components/quizzes/QuizzesHub.jsx";
import QuizTakePage from "@pages/QuizTakePage.jsx";

import ThemeToggle from "@components/ThemeToggle.jsx";
import FooterSmart from "@components/layout/FooterSmart.jsx";

// 🌿 dynamic viewport + footer observer
import useViewportChrome from "@lib/useViewportChrome.js";

// Optional helpers
import { isPreviewEnv } from "./lib/site.js";
import supabase from "@lib/supabaseClient.js";
import AccountDashboardPage from "./AccountDashboardPage.jsx";

// Lazy pages
const Home = lazy(() => import("./pages/Home.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const WishlistPage = lazy(() => import("./pages/WishlistPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const AdminRatings = lazy(() => import("./pages/AdminRatings.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const JennLounge = lazy(() => import("./pages/JennLounge.jsx"));

const ArtPage = lazy(() => import("./pages/Art.tsx"));
const VaultPage = lazy(() => import("./pages/Vault.tsx"));
const VerifyPage = lazy(() => import("./pages/Verify.tsx"));
const ArtistUploadPage = lazy(() => import("./pages/ArtistUpload.tsx"));
const ArtistDashboardPage = lazy(() => import("./pages/ArtistDashboard.tsx"));

/* Header controls */
function WishlistButton() {
  const { ids } = useWishlist();
  const count = (ids || []).length;
  return (
    <NavLink
      to="/wishlist"
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
      end
    >
      Wishlist {count ? `(${count})` : ""}
    </NavLink>
  );
}

function CartButton() {
  const { isOpen, setOpen, items } = useCart();
  const count = (items || []).reduce((n, it) => n + (it.qty || 0), 0);
  return (
    <button
      className="btn btn-outline-gold"
      onClick={() => setOpen(!isOpen)}
      aria-label="Open Bag"
      title="Open Bag"
    >
      Bag {count ? `(${count})` : ""}
    </button>
  );
}

function AdminRoute({ children }) {
  const { user, loading, ready } = useAuth();
  if (!ready && loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return <div style={{ padding: 24 }}>Admins only. Please sign in.</div>;
  return children;
}

const SHOW_ADMIN = !!import.meta.env.VITE_ADMIN_KEY;
function AdminLink() {
  const { user } = useAuth();
  if (!SHOW_ADMIN || !user) return null;
  return (
    <NavLink
      to="/admin"
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
      end
    >
      Admin
    </NavLink>
  );
}

function LegacyQuizRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/quizzes/${slug}`} replace />;
}

/**
 * MagicLinkHandler
 * - Catches supabase auth redirects on /auth/callback (or any route if detectSessionInUrl matched)
 * - Waits briefly for session hydration, then forwards to the intended page or /account.
 */
function MagicLinkHandler() {
  const navigate = useNavigate();
  const { search, hash } = useLocation();

  useEffect(() => {
    let alive = true;

    (async () => {
      const url = window.location.href;
      const params = new URLSearchParams(search);
      const hasCode = params.has("code");
      const next = params.get("next") || "/account";

      try {
        if (hasCode) {
          console.log("[auth/callback] code present → exchanging for session…");
          const { data, error } = await supabase.auth.exchangeCodeForSession(url);
          console.log("[auth/callback] exchange result:", {
            ok: !!data?.session,
            userId: data?.session?.user?.id || null,
            error: error?.message || null,
          });
          if (error) throw error;
        } else {
          console.log("[auth/callback] no code in URL → letting SDK/session cache handle it");
        }

        // Wait briefly for hydration (covers both exchange + cache cases)
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            console.log("[auth/callback] session ready:", { userId: data.session.user.id });
            break;
          }
          await new Promise((r) => setTimeout(r, 150));
        }

        // Clean the URL and go where we meant to
        if (alive && (search || hash)) {
          window.history.replaceState({}, "", window.location.pathname);
        }
        if (alive) {
          console.log("[auth/callback] navigating to:", next);
          navigate(next, { replace: true });
        }
      } catch (e) {
        console.error("[auth/callback] FAILED:", e?.message || e);
      }
    })();

    return () => { alive = false; };
  }, [navigate, search, hash]);

  return <div style={{ padding: 24, opacity: 0.9 }}>Signing you in…</div>;
}



export default function App() {
  // 🌿 Hook in the viewport + footer variable updater
  useViewportChrome(".shop-footer");

  // Keep multi-tab sessions extra robust — listen and no-op (forces app to re-render where contexts do)
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // no-op; your AuthContext should already be listening internally
      // leaving this here ensures a React change tick in simple setups
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <>
      {/* Site-wide meta */}
      <Helmet>
        <meta property="og:site_name" content="Afrodezea" />
        <meta name="twitter:card" content="summary_large_image" />
        {isPreviewEnv() && <meta name="robots" content="noindex,nofollow" />}
      </Helmet>

      <div id="app" style={{ minHeight: "var(--vh)" }}>
        {/* Top Navigation */}
        <nav className="topnav">
          <div className="topnav__inner">
            <div className="topnav__brand">
              <Link to="/">Afrodezea</Link>
            </div>

            <div className="topnav__links">
              <NavLink
                to="/products"
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
                end
              >
                Products
              </NavLink>

              {/* Lounge link */}
              <NavLink
                to="/lounge"
                className={({ isActive }) => (isActive ? "is-active" : undefined)}
                end
              >
                Lounge
              </NavLink>

                {/* NEW: Art/Gallery link */}
  <NavLink
    to="/art"
    className={({ isActive }) => (isActive ? "is-active" : undefined)}
  >
    Art
  </NavLink>

              <WishlistButton />
              <ProfileNavLink />
              <AccountLink />
              <AdminLink />
            </div>

            <div className="topnav__actions">
              <ThemeToggle className="btn-outline-gold" />
              <CartButton />
            </div>
          </div>
        </nav>

        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: 24, opacity: 0.8 }}>Loading…</div>}>
            <Routes>
              {/* Auth callback catcher */}
              <Route path="/auth/callback" element={<MagicLinkHandler />} />

              <Route
                path="/"
                element={
                  <PageBoundary name="Home">
                    <Home />
                  </PageBoundary>
                }
              />
              <Route
                path="/products"
                element={
                  <PageBoundary name="Products">
                    <ProductsPage />
                  </PageBoundary>
                }
              />
              <Route
                path="/lounge"
                element={
                  <PageBoundary name="Jenn Lounge">
                    <JennLounge />
                  </PageBoundary>
                }
              />
              <Route
                path="/product/:handle"
                element={
                  <PageBoundary name="Product">
                    <ProductDetail />
                  </PageBoundary>
                }
              />
              <Route
    path="/art"
    element={
      <PageBoundary name="Art Gallery">
        <ArtPage />
      </PageBoundary>
    }
  />
  <Route
    path="/vault"
    element={
      <ProtectedRoute>
        <PageBoundary name="Vault">
          <VaultPage />
        </PageBoundary>
      </ProtectedRoute>
    }
  />

  {/* NEW: Public verify page */}
  <Route
    path="/verify/:code"
    element={
      <PageBoundary name="Verify Certificate">
        <VerifyPage />
      </PageBoundary>
    }
  />

  {/* NEW: Artist tools */}
  <Route
    path="/artist/upload"
    element={
      <ProtectedRoute>
        <PageBoundary name="Artist Upload">
          <ArtistUploadPage />
        </PageBoundary>
      </ProtectedRoute>
    }
  />
  <Route
    path="/artist/dashboard"
    element={
      <ProtectedRoute>
        <PageBoundary name="Artist Dashboard">
          <ArtistDashboardPage />
        </PageBoundary>
      </ProtectedRoute>
    }
  />
              <Route
                path="/wishlist"
                element={
                  <PageBoundary name="Wishlist">
                    <WishlistPage />
                  </PageBoundary>
                }
              />
              <Route
                path="/login"
                element={
                  <PageBoundary name="Login">
                    <Login />
                  </PageBoundary>
                }
              />

              <Route path="/u/:handle" element={<ProfilePage />} />

              {/* Quizzes */}
              <Route path="/quizzes" element={<QuizzesHub />} />
              <Route path="/quizzes/:slug" element={<QuizTakePage />} />
              <Route path="/q/:slug" element={<LegacyQuizRedirect />} />
              <Route path="/quiz/:slug" element={<LegacyQuizRedirect />} />

              {/* Protected Account */}
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <PageBoundary name="Account Dashboard">
                      <AccountDashboardPage />
                    </PageBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/check-in"
                element={
                  <ProtectedRoute>
                    <PageBoundary name="Daily Check-in">
                      <CheckIn />
                    </PageBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <PageBoundary name="Admin">
                      <AdminRatings />
                    </PageBoundary>
                  </AdminRoute>
                }
              />

              <Route
                path="*"
                element={
                  <PageBoundary name="Not Found">
                    <NotFound />
                  </PageBoundary>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        {/* Smart Footer — tied to viewport hook */}
        <FooterSmart className="shop-footer" />

        <CartDrawer />
      </div>
    </>
  );
}
