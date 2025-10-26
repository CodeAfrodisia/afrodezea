// src/components/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();           // ← unified flag
  const location = useLocation();

  if (loading) return <div style={{ padding: 16 }}>Checking auth…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}
