// AccountDashboardPage.jsx
import React from "react";
import AccountDashboardShell from "@components/account/AccountDashboardShell.jsx";
import { DashboardProvider } from "@context/DashboardContext.jsx";

/**
 * Thin wrapper that provides shared dashboard state
 * (profile, stats, achievements, XP, etc.) to the entire
 * Account Dashboard experience, without having to edit
 * the massive AccountDashboardShell.jsx directly.
 */
export default function AccountDashboardPage() {
  return (
    <DashboardProvider>
      <AccountDashboardShell />
    </DashboardProvider>
  );
}

