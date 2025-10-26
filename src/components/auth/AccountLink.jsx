// src/components/auth/AccountLink.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AccountLink() {
  const { user, loading } = useAuth(); // ← unified flag
  if (loading) {
    // Optionally render a tiny placeholder to prevent layout shift
    return <span style={{ opacity: 0.6 }}>…</span>;
  }

  return user ? (
    <NavLink
      to="/account"
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
    >
      Account Dashboard
    </NavLink>
  ) : (
    <NavLink
      to="/login"
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
      end
    >
      Sign in
    </NavLink>
  );
}
