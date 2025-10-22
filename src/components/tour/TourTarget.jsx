// components/tour/TourTarget.jsx
export default function TourTarget({
  id,
  children,
  placeholderTitle = "Coming Soon",
  placeholderBody = "This area lights up as you start using the app.",
  style = {},
}) {
  const hasContent = !!children;
  return (
    <div data-tour={id} style={{ minHeight: 12, position: "relative", ...style }}>
      {hasContent ? (
        children
      ) : (
        <div
          aria-live="polite"
          style={{
            border: "1px dashed var(--hairline)",
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{placeholderTitle}</div>
          <div>{placeholderBody}</div>
        </div>
      )}
    </div>
  );
}

