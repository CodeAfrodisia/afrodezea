// src/components/auth/AccountLink.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function AccountLink() {
  const { user, loading } = useAuth();
  if (loading) return null;

  // When signed in, keep this active for /account and any nested routes (no `end`)
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
