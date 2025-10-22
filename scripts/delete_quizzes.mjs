// scripts/delete_quizzes.mjs
import dotenv from "dotenv";
dotenv.config({ path: "../.env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing Supabase env vars");
  process.exit(1);
}
const admin = createClient(url, key);

// List all quiz slugs you want to delete
const slugs = [
  "ambiversion-spectrum",
  "apology-style",
  "archetype-preference",
  "archetype",
  "attachment-style",
  "emotional-regulation",
  "expression-balance",
  "forgiveness-language",
  "love-language-giving",
  "love-language-receiving",
  "love-language",
  "resilience-style",
  "self-love-style",
  "soul-connection",
  "stress-response"
];

try {
  console.log("🗑 Deleting quizzes:", slugs);
  const { data, error } = await admin
    .from("quizzes")
    .delete()
    .in("slug", slugs);

  if (error) throw error;
  console.log("✅ Deleted:", data?.length, "rows");
  process.exit(0);
} catch (e) {
  console.error("❌ Delete failed:", e.message);
  process.exit(1);
}

