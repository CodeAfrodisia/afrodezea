// src/components/account/PersonalityCarousel.jsx
import { useState, useRef, useEffect, useMemo } from "react"
import { useSoul } from "@context/SoulContext.jsx"
import PersonalityOverview from "@PersonalityOverview.jsx"
import StrengthsChallenges from "@StrengthsChallenges.jsx"
import LoveProfile from "@LoveProfile.jsx"
import SoulMessage from "@SoulMessage.jsx"
import MoodTab from "@MoodTab.jsx"

export default function PersonalityCarousel({ userId }) {
  const containerRef = useRef(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [submissionStatus, setSubmissionStatus] = useState(null)

  // Pull archetype from Soul context with a safe fallback
  const { soulData = [], userArchetype } = useSoul()
  const archetype = useMemo(() => {
    const found = soulData.find((a) => a?.name === userArchetype)
    return found ?? { name: "Windbearer", element: "Air" }
  }, [soulData, userArchetype])

  // Lightweight theme; prefer site CSS, but tint if element exists
  const elementThemes = {
    Air:    { primary: "#cceeff", border: "#66aaff" },
    Fire:   { primary: "#ff6633", border: "#ff3300" },
    Water:  { primary: "#6699cc", border: "#3399ff" },
    Earth:  { primary: "#998866", border: "#665544" },
    Light:  { primary: "#fff3a3", border: "#ffeb3b" },
    Shadow: { primary: "#666",    border: "#444" },
    Storm:  { primary: "#8faaff", border: "#5068ff" },
    Flux:   { primary: "#d699ff", border: "#cc66ff" },
  }

  const theme = useMemo(() => {
    const base = {
      background: "transparent",
      text: "inherit",
      primary: "var(--gold)",
      border: "var(--hairline)",
    }
    const tint = elementThemes[archetype?.element] || {}
    return { ...base, ...tint }
  }, [archetype?.element])

  // Prevent initial layout flicker
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    return () => clearTimeout(t)
  }, [])

  const slides = [
    { title: "Overview",  component: <PersonalityOverview archetype={archetype} theme={theme} /> },
    { title: "Strengths", component: <StrengthsChallenges  archetype={archetype} theme={theme} /> },
    { title: "Love",      component: <LoveProfile          archetype={archetype} theme={theme} /> },
    { title: "Message",   component: <SoulMessage          archetype={archetype} theme={theme} /> },
    {
      title: "Mood",
      component: (
        <MoodTab
          userId={userId}
          archetype={archetype}
          theme={theme}
          submissionStatus={submissionStatus}
          setSubmissionStatus={setSubmissionStatus}
        />
      ),
    },
  ]

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "0 0 24px" }}>
      <div ref={containerRef} style={{ width: "100%", maxWidth: 900, display: "grid", gap: 16 }}>
        {/* Slides */}
        <div style={{ position: "relative", minHeight: 580 }}>
          {slides.map((slide, i) => (
            <div
              key={slide.title}
              style={{
                position: "absolute",
                inset: 0,
                opacity: i === currentSlide ? 1 : 0,
                transition: "opacity .25s",
                pointerEvents: i === currentSlide ? "auto" : "none",
                padding: "12px 8px",
              }}
              aria-hidden={i !== currentSlide}
            >
              {slide.component}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {slides.map((slide, i) => {
            const active = i === currentSlide
            return (
              <button
                key={slide.title}
                onClick={() => setCurrentSlide(i)}
                aria-pressed={active}
                className={`chip ${active ? "active" : ""}`}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: `1px solid ${theme.border}`,
                  background: active ? theme.primary : "transparent",
                  color: active ? "var(--bg, #111)" : "inherit",
                  cursor: "pointer",
                }}
              >
                {slide.title}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
