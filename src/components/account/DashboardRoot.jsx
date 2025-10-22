import * as React from "react"
import { SoulProvider } from "@SoulContext.jsx"
import { LoadSoulFramework } from "@LoadSoulFramework.jsx"
import TestComponent from "@TestComponent.jsx"

export default function DashboardRoot() {
  return (
    <SoulProvider>
      <LoadSoulFramework />
      <TestComponent />
    </SoulProvider>
  )
}

