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

// Lazy pages
const Home = lazy(() => import("./pages/Home.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const WishlistPage = lazy(() => import("./pages/WishlistPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const AdminRatings = lazy(() => import("./pages/AdminRatings.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

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
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
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
  const { ready } = useAuth();
  const { search, hash } = useLocation();

  useEffect(() => {
    let alive = true;

    (async () => {
      // Let supabase parse the URL (already on by client option) and hydrate storage.
      // We simply poll for a valid session for a short moment, then move on.
      const waitForSession = async (tries = 12) => {
        for (let i = 0; i < tries; i++) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) return data.session;
          await new Promise((r) => setTimeout(r, 150)); // ~1.8s max
        }
        return null;
      };

      await waitForSession();

      // Optional: remove auth params from the URL bar
      // (so refreshes don’t try to re-handle the callback)
      if (alive && (search || hash)) {
        const clean = window.location.pathname;
        window.history.replaceState({}, "", clean);
      }

      // Go where logged-in folks usually go
      if (alive) navigate("/account", { replace: true });
    })();

    return () => {
      alive = false;
    };
  }, [navigate, ready, search, hash]);

  return (
    <div style={{ padding: 24, opacity: 0.9 }}>
      Signing you in…
    </div>
  );
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
                path="/product/:handle"
                element={
                  <PageBoundary name="Product">
                    <ProductDetail />
                  </PageBoundary>
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
                      <AccountDashboard />
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
