// src/App.jsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link, useParams, NavLink } from "react-router-dom";
import Profile from "./pages/Profile.jsx";

import { useCart } from "./context/CartContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useWishlist } from "./context/WishlistContext.jsx";

import { Helmet } from "react-helmet-async";
import { SITE_URL, getSiteOrigin, isPreviewEnv } from "./lib/site.js";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import PageBoundary from "./components/PageBoundary.jsx";
import AccountDashboard from "@components/account/AccountDashboardShell.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AccountLink from "./components/auth/AccountLink.jsx";
import CheckIn from "@pages/CheckIn.jsx";

import ProfilePage from "@pages/ProfilePage.jsx";
import CartDrawer from "./components/shop/CartDrawer.jsx";
import PublicFavorites from "@components/account/PublicFavorites.jsx";
import ProfileNavLink from "@components/nav/ProfileNavLink.jsx";

import QuizzesHub from "@components/quizzes/QuizzesHub.jsx";
import QuizTakePage from "@pages/QuizTakePage.jsx";

import ThemeToggle from "@components/ThemeToggle.jsx";
import FooterSmart from "@components/layout/FooterSmart.jsx";

// 🌿 NEW: dynamic viewport + footer observer
import useViewportChrome from "@lib/useViewportChrome.js";

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

export default function App() {
  // 🌿 Hook in the viewport + footer variable updater
  useViewportChrome(".shop-footer");

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

        {/* Smart Footer — now tied to viewport hook */}
        <FooterSmart className="shop-footer" />

        <CartDrawer />
      </div>
    </>
  );
}
