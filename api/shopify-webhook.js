// /api/shopify-webhook.js
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function verifyShopify(req, rawBody) {
  const hmac = req.headers["x-shopify-hmac-sha256"];
  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac || ""), Buffer.from(digest));
}

export default async function handler(req, res) {
  const raw = await new Promise(resolve => {
    let d = ""; req.on("data", c => d += c); req.on("end", () => resolve(d));
  });
  if (!verifyShopify(req, raw)) return res.status(401).end("bad hmac");

  const evt = JSON.parse(raw); // order/create recommended
  const email = evt.email || evt.customer?.email || null;

  for (const li of evt.line_items || []) {
    const handle = (li?.product_exists && li?.title) ? 
      (li?.handle || li?.sku || "") : (li?.sku || "");

    // Map handle/sku → your product_id
    const { data: prod } = await supa
      .from("products")
      .select("id")
      .eq("slug", handle)
      .maybeSingle();

    if (!prod) continue;

    const token = crypto.randomBytes(24).toString("hex");
    await supa.from("rating_tokens").insert({
      product_id: prod.id,
      email,
      token,
    });

    // TODO: email them the link (Resend, Postmark, or Shopify email)
    // `https://your-site.com/product/${handle}?rateToken=${token}&email=${encodeURIComponent(email||"")}`
  }

  res.status(200).end("ok");
}

