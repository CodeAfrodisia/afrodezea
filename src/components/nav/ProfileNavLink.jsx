// src/components/nav/ProfileNavLink.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@context/AuthContext.jsx";
import { supabase } from "@lib/supabaseClient.js";

export default function ProfileNavLink() {
  const { user } = useAuth();
  const [handle, setHandle] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id) { setHandle(null); return; }
      const { data } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      setHandle(data?.handle || null);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (!user) return null;

  // If user has a handle, link to /u/:handle and highlight when on that page.
  if (handle) {
    return (
      <NavLink
        to={`/u/${handle}`}
        className={({ isActive }) => (isActive ? "is-active" : undefined)}
      >
        Profile
      </NavLink>
    );
  }

  // Otherwise, guide to settings; highlight when anywhere under /account
  return (
    <NavLink
      to="/account?tab=settings"
      className={({ isActive }) => (isActive ? "is-active" : undefined)}
    >
      Set up profile
    </NavLink>
  );
}
