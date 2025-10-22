import React from "react";
import { Link } from "react-router-dom";

export default function Footer({ variant = "default" }) {
  const year = new Date().getFullYear();
  const isCompact = variant === "compact";

  return (
    <footer className={`site-footer ${isCompact ? "site-footer--compact" : ""}`}>
      {/* top hairline */}
      <div className="footer__rule" aria-hidden />

      <div className="container footer__grid">
        {/* Brand / short message */}
        <div className="footer__brand">
          <Link to="/" className="footer__logo">Afrodezea</Link>
          {!isCompact && (
            <p className="footer__tag muted">
              Slow luxury for the inner life.
            </p>
          )}
        </div>

        {/* Primary footer nav (sitemap-lite) */}
        <nav className="footer__nav" aria-label="Footer">
          <ul>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/quizzes">Quizzes</Link></li>
            <li><Link to="/u/me">Profile</Link></li>
            <li><Link to="/account">Account</Link></li>
          </ul>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/support">Support</Link></li>
            <li><Link to="/status">Status</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </nav>

        {/* Newsletter (quiet, text-first) */}
        {!isCompact && (
          <form
            className="footer__nl"
            onSubmit={(e) => {
              e.preventDefault();
              // hook up later to your API
              alert("Thanks for subscribing ✨");
            }}
          >
            <label htmlFor="nl" className="muted">Newsletter</label>
            <div className="footer__nlRow">
              <input
                id="nl"
                type="email"
                required
                placeholder="you@domain.com"
                className="input"
              />
              <button className="btn btn-outline-gold" type="submit">
                Subscribe
              </button>
            </div>
            <small className="muted">Occasional notes—no spam.</small>
          </form>
        )}
      </div>

      {/* bottom meta line */}
      <div className="container footer__meta">
        <div className="footer__legal">
          © {year} Afrodezea
        </div>
        <div className="footer__links">
          <Link to="/privacy">Privacy</Link>
          <span aria-hidden>·</span>
          <Link to="/terms">Terms</Link>
          <span aria-hidden>·</span>
          <Link to="/cookies">Cookies</Link>
          <span aria-hidden>·</span>
          <Link to="/accessibility">Accessibility</Link>
        </div>
      </div>
    </footer>
  );
}

