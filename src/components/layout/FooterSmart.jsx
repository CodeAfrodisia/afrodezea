// src/components/layout/Footer.jsx
import React from "react";
import { useLocation, Link } from "react-router-dom";

function Section({ title, children }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>{children}</div>
    </div>
  );
}

export default function Footer({ variant = "smart" }) {
  const { pathname } = useLocation();

  // Simple content-awareness (phase 1)
  const isShop = pathname.startsWith("/products") || pathname.startsWith("/product/");
  const isAccount = pathname.startsWith("/account");
  const isQuizzes = pathname.startsWith("/quizzes");

  // Use <details> so it’s naturally collapsible. Default collapsed to avoid covering content.
  return (
    <div
      className="site-footer site-footer--smart"
      style={{
        position: "fixed",
        left: 0, right: 0, bottom: 0,
        zIndex: 50,
        borderTop: "1px solid var(--c-border-subtle)",
        background: "var(--c-bg)",
      }}
    >
      <details style={{ width: "100%" }}>
        <summary
          role="button"
          className="btn"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "10px 12px",
            background: "transparent",
            color: "var(--c-ink)",
            border: "none",
          }}
          aria-label="Toggle footer"
        >
          {isShop ? "Shop Footer" : isQuizzes ? "Quizzes Footer" : isAccount ? "Account Footer" : "Site Footer"}
          &nbsp;— click to {/** caret hint */}<span className="muted">expand/collapse</span>
        </summary>

        <div
          className="footer__grid"
          style={{
            display: "grid",
            gap: 16,
            padding: "12px 16px 10px",
            gridTemplateColumns: "1.2fr 1.2fr 1fr",
            background: "var(--c-bg)",
          }}
        >
          {/* Left column varies a bit by section */}
          <Section title={isShop ? "Shop" : isQuizzes ? "Quizzes" : "Explore"}>
            {isShop && (
              <>
                <Link to="/products">All Products</Link>
                <Link to="/wishlist">Wishlist</Link>
              </>
            )}
            {isQuizzes && (
              <>
                <Link to="/quizzes">All Quizzes</Link>
                <Link to="/account">My Results</Link>
              </>
            )}
            {isAccount && (
              <>
                <Link to="/account">Dashboard</Link>
                <Link to="/account/check-in">Daily Check-in</Link>
              </>
            )}
            {!isShop && !isQuizzes && !isAccount && (
              <>
                <Link to="/products">Shop</Link>
                <Link to="/quizzes">Quizzes</Link>
              </>
            )}
          </Section>

          {/* Middle — always-present basics */}
          <Section title="Company">
            <a href="/about">About</a>
            <a href="/faq">FAQ</a>
            <a href="/contact">Contact</a>
          </Section>

          {/* Right — policies */}
          <Section title="Legal">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </Section>
        </div>
      </details>
    </div>
  );
}
