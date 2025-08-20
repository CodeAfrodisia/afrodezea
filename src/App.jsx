import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Profile from "./pages/Profile.jsx";


import { CartProvider, useCart } from "./context/CartContext.jsx";
import CartDrawer from "./components/shop/CartDrawer.jsx";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { WishlistProvider, useWishlist } from "./context/WishlistContext.jsx";

import { HelmetProvider, Helmet } from "react-helmet-async";
import { SITE_URL } from "./lib/site.js"; // if you created this helper
import { getSiteOrigin, isPreviewEnv } from "./lib/site.js";

import ErrorBoundary from "./components/ErrorBoundary.jsx";
import PageBoundary from "./components/PageBoundary.jsx";




const Home          = lazy(() => import("./pages/Home.jsx"));
const ProductsPage  = lazy(() => import("./pages/ProductsPage.jsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.jsx"));
const WishlistPage  = lazy(() => import("./pages/WishlistPage.jsx"));
const Login         = lazy(() => import("./pages/Login.jsx"));
const AdminRatings  = lazy(() => import("./pages/AdminRatings.jsx"));
const NotFound      = lazy(() => import("./pages/NotFound.jsx"));




/* ---------- Small header controls ---------- */

function WishlistButton() {
  const { ids } = useWishlist();               // <-- use ids, not items
  const count = (ids || []).length;
  return (
    <Link to="/wishlist" style={{ marginLeft: 8, color: "#eee" }}>
      Wishlist {count ? `(${count})` : ""}
    </Link>
  );
}

function CartButton() {
  const { isOpen, setOpen, items } = useCart();
  const count = (items || []).reduce((n, it) => n + (it.qty || 0), 0);
  return (
    <button
      className="btn btn--gold"
      style={{ marginLeft: "auto" }}
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

function UserChip() {
  const { user, signOut } = useAuth();
  if (!user) return <Link to="/login" style={{ color: "#eee" }}>Sign in</Link>;
  return (
    <button
      onClick={signOut}
      style={{ background: "transparent", border: "1px solid #333", color: "#eee", padding: "6px 10px", borderRadius: 8 }}
    >
      Sign out
    </button>
  );
}

const SHOW_ADMIN = !!import.meta.env.VITE_ADMIN_KEY;
function AdminLink() {
  const { user } = useAuth();
  if (!SHOW_ADMIN || !user) return null;
  return <Link to="/admin" style={{ color: "#eee", opacity: .9 }}>Admin</Link>;
}

/* ---------- App ---------- */

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            
              {/* Site-wide meta defaults */}
              <Helmet>
                <meta property="og:site_name" content="Afrodezea" />
                <meta name="twitter:card" content="summary_large_image" />
                {isPreviewEnv() && <meta name="robots" content="noindex,nofollow" />}
                {/* Optional default OG image */}
                {/* <meta property="og:image" content={`${SITE_URL}/og/default.jpg`} /> */}
              </Helmet>

              <div style={{ minHeight: "100vh" }}>
                {/* Top Nav must be inside Router so <Link> has context */}
                <nav className="nav surface glass">
                  <Link to="/">Home</Link>
                  <Link to="/products">Products</Link>
                  <AdminLink />
                  <WishlistButton />
                  <UserChip />
                  <CartButton />
                </nav>
             <ErrorBoundary>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<PageBoundary name="Home">
          <Home />
        </PageBoundary>} />
                    <Route path="/products" element={ <PageBoundary name="Products">
          <ProductsPage />
        </PageBoundary>} />
                    <Route path="/product/:handle" element={<PageBoundary name="Product">
          <ProductDetail />
        </PageBoundary>} />
                    <Route path="/profile/:slug" element={<Profile />} />
                    <Route path="/wishlist" element={<PageBoundary name="Wishlist">
          <WishlistPage />
        </PageBoundary>} />
                    <Route path="/login" element={<PageBoundary name="Login">
          <Login />
        </PageBoundary>} />
                    
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
                   <Route path="*" element={<PageBoundary name="Not Found">
          <NotFound />
        </PageBoundary>} />
                    </Routes>
                </Suspense>
              </ErrorBoundary>
                {/* Lives under CartProvider so it can read cart state */}
                <CartDrawer />
              </div>
            
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}

