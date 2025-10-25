// src/components/quizzes/QuizRadarChart.jsx
import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from "react";
import {
  ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Tooltip, Legend,
} from "recharts";

/* ----------------- Theme helpers ----------------- */
function getThemeName() {
  if (typeof document === "undefined") return "cream";
  return document.documentElement?.dataset?.theme || "cream";
}

function getPalette(theme) {
  const hasDoc = typeof document !== "undefined";
  let wine = "#301727";
  let gold = "rgb(212 175 55)";
  if (hasDoc) {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    wine = cs.getPropertyValue("--brand-wine")?.trim() || wine;
    gold = cs.getPropertyValue("--brand-gold")?.trim() || gold;
  }

  if (theme === "charcoal" || theme === "velvet") {
    return {
      bgGradientTop: "#301727",
      bgGradientBottom: "#121212",
      axisText: "rgba(249,249,249,.92)",
      ticks: "rgba(249,249,249,.72)",
      grid: "rgba(249,249,249,.18)",
      stroke: gold,
      fill: "color-mix(in srgb, var(--brand-wine, #301727) 30%, transparent)",
      baselineStroke: "rgba(249,249,249,.85)",
      baselineFill: "rgba(249,249,249,.10)",
      tooltipBg: "#1c1c1c",
      tooltipInk: "rgba(249,249,249,.95)",
      tooltipHead: "rgba(249,249,249,1)",
    };
  }

  // cream (light)
  return {
    bgGradientTop: "#F5EFE7",
    bgGradientBottom: "#EEE6DC",
    axisText: "#2A1C1C",
    ticks: "rgba(42,28,28,.70)",
    grid: "rgba(42,28,28,.20)",
    stroke: "rgba(42,28,28,.55)",
    fill: `color-mix(in srgb, ${wine} 22%, transparent)`,
    baselineStroke: "rgba(42,28,28,.50)",
    baselineFill: "rgba(42,28,28,.06)",
    tooltipBg: "#FFFFFF",
    tooltipInk: "#2A1C1C",
    tooltipHead: "#2A1C1C",
  };
}

/* ----------------- Small helpers ----------------- */
function AngleTick({ payload, x, y, color, fontSize }) {
  const raw = String(payload?.value ?? "");
  let lines = [raw];
  if (raw.length > 12 && raw.includes(" ")) {
    const i = raw.indexOf(" ");
    lines = [raw.slice(0, i), raw.slice(i + 1)];
  }
  return (
    <text x={x} y={y} textAnchor="middle" fill={color} fontSize={fontSize} style={{ pointerEvents: "none" }}>
      {lines.map((line, idx) => (
        <tspan key={idx} x={x} dy={idx === 0 ? 0 : fontSize * 0.95}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function startCase(s = "") {
  return String(s)
    .replace(/^.*?_/,"")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function cleanLabels(labels = {}) {
  const out = {};
  for (const [k, v] of Object.entries(labels || {})) {
    if (k === "title") continue;
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

/* ----------------- Component ----------------- */
function QuizRadarChartInner({
  // Percent/normalized mode
  totals,
  baselineTotals,
  maxValue = 10,

  // Raw/weighted mode
  totalsRaw,
  maxRaw,
  mode = "percent",

  // Shared
  labels = {},
  title,
  subtitle,
  // height/width are now treated as *preferred* sizes; the chart will fit its container
  height = 360,
  width = 360,
  showLegend = false,
  allowDownload = true,
  onOpenModal,
}) {
  const frameRef = useRef(null);     // the square "bed"
  const chartRef = useRef(null);     // outer card
  const menuRef  = useRef(null);

  // live container size for font scaling
  const [boxW, setBoxW] = useState(width || 360);

  useLayoutEffect(() => {
    if (!frameRef.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width) setBoxW(Math.max(200, Math.floor(r.width)));
    });
    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, []);

  // close the download menu when clicking outside or pressing Esc
  useEffect(() => {
    function onDocClick(e) {
      const el = menuRef.current;
      if (!el?.open) return;
      if (!el.contains(e.target)) el.open = false;
    }
    function onKey(e) {
      const el = menuRef.current;
      if (e.key === "Escape" && el?.open) el.open = false;
    }
    document.addEventListener("mousedown", onDocClick, true);
    document.addEventListener("touchstart", onDocClick, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocClick, true);
      document.removeEventListener("touchstart", onDocClick, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  const theme = getThemeName();
  const colors = getPalette(theme);

  // Scaled type ramp based on container width
  const fsBase  = Math.max(12, Math.round(boxW * 0.04));  // angle labels
  const fsTicks = Math.max(11, Math.round(fsBase * 0.85)); // rings

  const hasRaw =
    totalsRaw && typeof totalsRaw === "object" &&
    maxRaw && typeof maxRaw === "object" &&
    Object.keys(totalsRaw).length > 0 &&
    Object.keys(maxRaw).length > 0;

  const chartData = useMemo(() => {
    const safeLabels = labels && typeof labels === "object" ? cleanLabels(labels) : {};

    if (hasRaw) {
      const obj = totalsRaw && typeof totalsRaw === "object" ? totalsRaw : {};
      const rows = Object.keys(obj)
        .filter(k => Number.isFinite(Number(obj[k])))
        .map(k => {
          const raw = Number(obj[k] || 0);
          const kMax = Math.max(1, Number(maxRaw?.[k] ?? 0));
          const val = mode === "raw" ? raw : Math.round((raw / kMax) * 100);
          return { key: k, subject: safeLabels[k] || startCase(k), value: val, baselineValue: 0 };
        });
      return { rows, yDomainMax: 100 };
    }

    const obj = totals && typeof totals === "object" ? totals : {};
    const baselineObj = baselineTotals && typeof baselineTotals === "object" ? baselineTotals : {};
    const keys = Object.keys(obj);

    const clamp = (n) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return 0;
      const m = Number.isFinite(maxValue) ? Number(maxValue) : 10;
      return Math.max(0, Math.min(v, m));
    };

    const rows = keys
      .filter(k => Number.isFinite(Number(obj[k])) || Number.isFinite(Number(baselineObj[k])))
      .map(k => ({
        key: k,
        subject: safeLabels[k] || startCase(k),
        value: clamp(obj[k]),
        baselineValue: clamp(baselineObj[k]),
      }));

    return { rows, yDomainMax: Number.isFinite(maxValue) ? Number(maxValue) : 10 };
  }, [hasRaw, totalsRaw, totals, baselineTotals, maxRaw, mode, labels, maxValue]);

  const hasData =
    chartData.rows.length > 0 &&
    chartData.rows.some(d => d.value > 0 || d.baselineValue > 0);

  /* ----------------- Downloads ----------------- */
  async function downloadSVG() {
    try {
      const svg = chartRef.current?.querySelector("svg");
      if (!svg) return;
      const serializer = new XMLSerializer();
      const src = serializer.serializeToString(svg);
      const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, (title || "quiz-radar") + ".svg");
    } catch (e) {
      console.warn("SVG export failed:", e);
    }
  }

  async function downloadPNG(scale = 2) {
    try {
      const svg = chartRef.current?.querySelector("svg");
      if (!svg) return;

      const serializer = new XMLSerializer();
      const src = serializer.serializeToString(svg);
      const svgBlob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      const { width: w, height: h } = svg.getBoundingClientRect();

      await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(h * scale));
      const ctx = canvas.getContext("2d");

      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, colors.bgGradientTop);
      g.addColorStop(1, colors.bgGradientBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        triggerDownload(pngUrl, (title || "quiz-radar") + ".png");
      }, "image/png");
    } catch (e) {
      console.warn("PNG export failed:", e);
    }
  }

  function downloadCSV() {
    try {
      const rows = chartData?.rows || [];
      if (!rows.length) return;

      const headers = ["Key","Label","Value","BaselineValue"];
      const lines = rows.map(r => [
        JSON.stringify(r.key ?? ""),
        JSON.stringify(r.subject ?? ""),
        JSON.stringify(r.value ?? 0),
        JSON.stringify(r.baselineValue ?? 0),
      ].join(","));

      const csv = [headers.join(","), ...lines].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, (title || "quiz-radar") + ".csv");
    } catch (e) {
      console.warn("CSV export failed:", e);
    }
  }

  function triggerDownload(url, name) {
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  /* ----------------- Render ----------------- */
  return (
    <div
      ref={chartRef}
      style={{
        cursor: onOpenModal ? "pointer" : "default",
        background: `linear-gradient(180deg, ${colors.bgGradientTop} 0%, ${colors.bgGradientBottom} 100%)`,
        border: "1px solid var(--c-border-subtle)",
        borderRadius: 16,
        boxShadow: "0 10px 24px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.03)",
        padding: 16,
        color: "var(--c-ink)",
      }}
      onClick={(e) => {
        if (e.target.closest("details")) return;
        if (e.target.closest("button")) return;
        onOpenModal?.();
      }}
    >
      {(title || subtitle || allowDownload) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            {title ? <h3 style={{ margin: 0 }}>{title}</h3> : null}
            {subtitle ? <div style={{ opacity: 0.75, fontSize: 14 }}>{subtitle}</div> : null}
          </div>

          {allowDownload && hasData ? (
            <div style={{ position: "relative" }}>
              <details ref={menuRef}>
                <summary className="btn btn--ghost" onClick={(e) => e.stopPropagation()}>
                  Download
                </summary>
                <div
                  style={{
                    position: "absolute", right: 0, marginTop: 6,
                    background: "var(--c-card)", border: "1px solid var(--c-border-subtle)",
                    borderRadius: 10, boxShadow: "var(--elev-2)", padding: 6, zIndex: 5, minWidth: 160
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="btn btn--ghost" style={{ width: "100%", justifyContent: "flex-start" }}
                          onClick={() => { downloadPNG(2); if (menuRef.current) menuRef.current.open = false; }}>
                    PNG
                  </button>
                  <button className="btn btn--ghost" style={{ width: "100%", justifyContent: "flex-start" }}
                          onClick={() => { downloadSVG(); if (menuRef.current) menuRef.current.open = false; }}>
                    SVG
                  </button>
                  <button className="btn btn--ghost" style={{ width: "100%", justifyContent: "flex-start" }}
                          onClick={() => { downloadCSV(); if (menuRef.current) menuRef.current.open = false; }}>
                    CSV
                  </button>
                </div>
              </details>
            </div>
          ) : null}
        </div>
      )}

      {/* Responsive square bed — prevents overflow and collisions */}
      <div
        ref={frameRef}
        className="chart-bed"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",        // responsive square
          padding: 10,                  // keep labels inside the card
          boxSizing: "border-box",
          overflow: "hidden",           // clip any stray labels
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            /* slightly smaller radius to keep labels inside on laptops */
            outerRadius="84%"
            margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
            data={chartData.rows}
          >
            <PolarGrid stroke={colors.grid} strokeOpacity={1} gridType="polygon" />

            <PolarAngleAxis
              dataKey="subject"
              tick={<AngleTick color={colors.axisText} fontSize={fsBase} />}
              tickMargin={12}
              axisLine={false}
            />

            <PolarRadiusAxis
              angle={30}
              domain={[0, chartData.yDomainMax]}
              tick={{ fill: colors.ticks, fontSize: fsTicks }}
              tickCount={6}
              axisLine={false}
              stroke={colors.grid}
            />

            <Tooltip
              contentStyle={{
                background: colors.tooltipBg,
                border: "1px solid var(--c-border-subtle)",
                borderRadius: 10,
                color: colors.tooltipInk,
              }}
              labelStyle={{ color: colors.tooltipHead, fontWeight: 600 }}
              itemStyle={{ color: colors.tooltipInk }}
              formatter={(v, _name, props) => [v, props?.payload?.subject || "Score"]}
            />

            {showLegend ? (
              <Legend iconType="circle" wrapperStyle={{ color: colors.axisText }} />
            ) : null}

            {chartData.rows.some((d) => d.baselineValue > 0) && (
              <Radar
                name="Baseline"
                dataKey="baselineValue"
                stroke={colors.baselineStroke}
                fill={colors.baselineFill}
                fillOpacity={1}
                strokeWidth={2}
              />
            )}

            <Radar
              name="You"
              dataKey="value"
              stroke={colors.stroke}
              fill={colors.fill}
              fillOpacity={1}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ----------------- Memoization guard ----------------- */
function shallowEqualObj(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a); const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

function arePropsEqual(prev, next) {
  if (
    prev.title !== next.title ||
    prev.subtitle !== next.subtitle ||
    prev.mode !== next.mode ||
    prev.maxValue !== next.maxValue ||
    prev.height !== next.height ||
    prev.width !== next.width ||
    prev.showLegend !== next.showLegend ||
    prev.allowDownload !== next.allowDownload
  ) return false;

  return (
    shallowEqualObj(prev.totals, next.totals) &&
    shallowEqualObj(prev.baselineTotals, next.baselineTotals) &&
    shallowEqualObj(prev.totalsRaw, next.totalsRaw) &&
    shallowEqualObj(prev.maxRaw, next.maxRaw) &&
    shallowEqualObj(prev.labels, next.labels)
  );
}

export default React.memo(QuizRadarChartInner, arePropsEqual);
