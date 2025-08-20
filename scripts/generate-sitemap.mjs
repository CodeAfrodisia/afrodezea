// scripts/generate-sitemap.mjs
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/** Minimal .env loader (no deps). Supports KEY=val, KEY="val", ignores # comments */
function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const src = readFileSync(path, "utf8");
  const out = {};
  for (const lineRaw of src.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env then .env.local (env.local overrides)
const env = {
  ...loadEnvFile(resolve(root, ".env")),
  ...loadEnvFile(resolve(root, ".env.local")),
  ...process.env, // allow CI/Dashboard to override
};

const SITE_URL = env.VITE_SITE_URL || "http://localhost:4173";
const SUPABASE_URL = env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || "";

async function fetchProducts() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[sitemap] Missing Supabase envs; writing minimal sitemap.");
    return [];
  }
  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/products?select=slug,updated_at`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn("[sitemap] Fetch failed:", res.status, await res.text());
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn("[sitemap] Fetch exception:", e?.message || e);
    return [];
  }
}

function buildXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    ${u.priority ? `<priority>${u.priority}</priority>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>
`;
}

const rows = await fetchProducts();

const urls = [
  { loc: `${SITE_URL}/`, priority: 0.9 },
  { loc: `${SITE_URL}/products`, priority: 0.8 },
];

for (const r of rows) {
  const slug = r.slug;
  if (!slug) continue;
  urls.push({
    loc: `${SITE_URL}/product/${slug}`,
    lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
    priority: 0.7,
  });
}

await fs.mkdir("dist", { recursive: true });
await fs.writeFile("dist/sitemap.xml", buildXml(urls), "utf8");

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
await fs.writeFile("dist/robots.txt", robots, "utf8");

console.log("✓ Generated sitemap.xml and robots.txt");
