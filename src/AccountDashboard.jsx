import * as React from "react"
import { SoulProvider } from "@SoulContext.jsx"
import { ErrorBoundary } from "@ErrorBoundary.jsx"

const LazyShell = React.lazy(() => import("./AccountDashboardShell.jsx"))

export default function AccountDashboard() {
  return (
    <SoulProvider>
      <div style={{ width:"100%", background:"#111", color:"white", overflowX:"hidden", margin:"0 auto", maxWidth:"100vw" }}>
        <ErrorBoundary>
          <React.Suspense fallback={<div style={{ color:"#f0c075", textAlign:"center", padding:"2rem" }}>Loading your sacred dashboard...</div>}>
            <LazyShell />
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </SoulProvider>
  )
}

export const AccountDashboardMain = AccountDashboard

