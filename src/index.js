import React, { lazy, Suspense } from "react"
import ProductsPage from "./components/shop/ProductsPage.jsx"
import ProductDetail from "./components/shop/ProductDetail.jsx"

// SINGLE default (Framer registry keeps this around)
export default function _RegistryDefault() {
    return null
}

// Simple sanity component
export function PingBox() {
    return (
        <div
            style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid #444",
                color: "#eee",
                background: "#161616",
            }}
        >
            PingBox is live.
        </div>
    )
}

// Achievements (lazy keeps bundle light)
const TabsLazy = lazy(() =>
    import("./components/achievements/AchievementsAndStatsTabs.jsx").then(
        (m) => ({
            default: m.default ?? m.AchievementsStatsTabs,
        })
    )
)

export function Code_AchievementsAndStats() {
    return (
        <Suspense
            fallback={
                <div style={{ color: "#eee" }}>Loading Achievements…</div>
            }
        >
            <TabsLazy />
        </Suspense>
    )
}

// ✅ Products (named export = appears under Insert → Code)
export function Code_ProductsPage() {
    return <ProductsPage />
}

export function Code_ProductDetailBySlug(props) {
    // Use in Framer props panel: slug="winter-garden"
    return <ProductDetail slug={props.slug} />
}

