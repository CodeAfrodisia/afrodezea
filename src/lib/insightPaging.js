// src/lib/insightPaging.js

/** Split the rendered HTML into whole sections by H2/H3 headings. */
export function htmlToSections(html = "") {
  // Normalize & guard
  const s = String(html || "");
  if (!s.trim()) return [];

  // We capture each <h2>/<h3> block and everything until the next heading
  const re = /<(h2|h3)\b[^>]*>(.*?)<\/\1>/gi;
  const indices = [];
  let m;

  while ((m = re.exec(s))) {
    indices.push({ index: m.index, tag: m[1], headingHtml: m[0], headingText: stripTags(m[2]) });
  }
  if (!indices.length) return [{ heading: "", html: s }];

  const sections = [];
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i].index;
    const end = i + 1 < indices.length ? indices[i + 1].index : s.length;
    const block = s.slice(start, end);
    sections.push({
      heading: indices[i].headingText,
      html: block,
    });
  }
  return sections;
}

function stripTags(x) {
  return String(x || "").replace(/<[^>]*>/g, "").trim();
}

/** Count a "weight" for pagination (paragraphs + list items). */
function weight(html = "") {
  const p = (html.match(/<p\b/gi) || []).length;
  const li = (html.match(/<li\b/gi) || []).length;
  // lists are denser; count li as 0.7 of a paragraph
  return p + Math.round(li * 0.7);
}

/** Pack sections onto pages respecting a rough weight budget. */
function packSections(sections, title, { maxWeight = 14 } = {}) {
  if (!sections.length) return [];
  const pages = [];
  let cur = [];
  let curW = 0;

  for (const sec of sections) {
    const w = Math.max(1, weight(sec.html));
    if (cur.length && curW + w > maxWeight) {
      pages.push({
        key: `${title}-${pages.length + 1}`,
        title: pages.length ? `${title} (cont.)` : title,
        html: cur.map(s => s.html).join("\n"),
      });
      cur = [sec];
      curW = w;
    } else {
      cur.push(sec);
      curW += w;
    }
  }

  if (cur.length) {
    pages.push({
      key: `${title}-${pages.length + 1}`,
      title: pages.length ? `${title} (cont.)` : title,
      html: cur.map(s => s.html).join("\n"),
    });
  }
  return pages;
}

/** Regex “router” config – UPDATED per your request. */
const GROUPS = {
  // Page 1: Love (Receiving + Giving + Attachment)
  love: [
    /love language.*receiv/i,    // "Love Language – Receiving"
    /love language.*giv/i,       // "Love Language – Giving"
    /attachment/i,               // "Attachment Style"
  ],

  // Page 2: Resolution (Apology + Forgiveness + Mistake Response)
  resolution: [
    /apology/i,
    /forgiveness/i,
    /mistake response/i,
  ],

  // Next groups (auto after Love/Resolution)
  archetype_lens: [
    /archetype preference/i,
    /\barchetype\b(?!.*preference)/i,
  ],
  self_energy: [
    /self-?love/i,
    /stress response/i,
    /ambiversion|introvert|extrovert/i,
  ],
  connection_type: [
    /soul connection/i,
  ],

  // Always last page
  finale: [
    /weaving the threads/i,
    /7[- ]day experiment/i,
    /personalized notes/i,
  ],
};

/**
 * Partition a quizzes insight HTML into ordered pages:
 * Love → Resolution → Archetype Lens → Self & Energy → Connection Type → Finale (always last)
 */
export function partitionQuizzesIntoPages(insightHtml, opts = {}) {
  const { maxWeight = 14 } = opts;
  const sections = htmlToSections(insightHtml);

  const buckets = {
    love: [],
    resolution: [],
    archetype_lens: [],
    self_energy: [],
    connection_type: [],
    finale: [],
    other: [],
  };

  // Route each section by heading text against regexes
  for (const sec of sections) {
    const h = (sec.heading || "").toLowerCase();

    if (GROUPS.love.some(r => r.test(h)))              { buckets.love.push(sec); continue; }
    if (GROUPS.resolution.some(r => r.test(h)))        { buckets.resolution.push(sec); continue; }
    if (GROUPS.archetype_lens.some(r => r.test(h)))    { buckets.archetype_lens.push(sec); continue; }
    if (GROUPS.self_energy.some(r => r.test(h)))       { buckets.self_energy.push(sec); continue; }
    if (GROUPS.connection_type.some(r => r.test(h)))   { buckets.connection_type.push(sec); continue; }
    if (GROUPS.finale.some(r => r.test(h)))            { buckets.finale.push(sec); continue; }

    buckets.other.push(sec);
  }

  // Build pages in order; pack within each bucket by weight
  const pages = [
    ...packSections(buckets.love,            "Love",             { maxWeight }),
    ...packSections(buckets.resolution,      "Resolution",       { maxWeight }),
    ...packSections(buckets.archetype_lens,  "Archetype Lens",   { maxWeight }),
    ...packSections(buckets.self_energy,     "Self & Energy",    { maxWeight }),
    ...packSections(buckets.connection_type, "Connection Type",  { maxWeight }),
    ...packSections(buckets.other,           "Other",            { maxWeight }),
  ];

  // Finale ALWAYS last — collapse all finale sections onto one closing page
  if (buckets.finale.length) {
    pages.push({
      key: "Finale",
      title: "Weaving & Practice",
      html: buckets.finale.map(s => s.html).join("\n"),
    });
  }

  return pages;
}

