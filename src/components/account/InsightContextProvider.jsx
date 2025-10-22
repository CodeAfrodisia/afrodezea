import { createContext, useContext, useState } from "react"

const InsightContext = createContext()

export function useInsights() {
    return useContext(InsightContext)
}

export function InsightProvider({ children }) {
    const [insights, setInsights] = useState([])
    const [activeInsight, setActiveInsight] = useState(null)

    const addInsight = (message) => {
        setInsights((prev) => [...prev, message])
        if (!activeInsight) setActiveInsight(message)
    }

    const dismissInsight = () => {
        setInsights((prev) => {
            const [, ...rest] = prev
            setActiveInsight(rest[0] || null)
            return rest
        })
    }

    return (
        <InsightContext.Provider
            value={{ addInsight, dismissInsight, activeInsight }}
        >
            {children}
        </InsightContext.Provider>
    )
}

