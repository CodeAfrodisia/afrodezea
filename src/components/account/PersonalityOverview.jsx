// PersonalityOverview.jsx
import TooltipWrapper from "@TooltipWrapper.jsx"

export default function PersonalityOverview({ archetype, theme }) {
    if (!archetype) {
        return (
            <p style={{ color: theme?.text || "#ccc" }}>
                Loading personality profile...
            </p>
        )
    }

    const { name, element, affirmation, manifestationStyle } = archetype

    return (
        <div
            style={{
                maxWidth: "700px",
                textAlign: "center",
                fontSize: "18px",
                lineHeight: "1.6",
            }}
        >
            <h2
                style={{
                    fontSize: "32px",
                    marginBottom: "24px",
                    color: theme?.primary,
                }}
            >
                {name}
            </h2>

            <p>
                <TooltipWrapper tooltip="The elemental essence that fuels your personality and spiritual gifts.">
                    <strong>🌿 Element:</strong>
                </TooltipWrapper>{" "}
                {element}
            </p>

            <p>
                <TooltipWrapper tooltip="A powerful belief tailored to your energy. Repeat it daily to align with your higher self.">
                    <strong>💬 Affirmation:</strong>
                </TooltipWrapper>{" "}
                <span style={{ fontStyle: "italic", color: theme?.primary }}>
                    “{affirmation}”
                </span>
            </p>

            <p>
                <TooltipWrapper tooltip="How your soul’s desires tend to take form—through action, emotion, thought, or stillness.">
                    <strong>✨ Manifestation Style:</strong>
                </TooltipWrapper>{" "}
                {manifestationStyle}
            </p>
        </div>
    )
}

