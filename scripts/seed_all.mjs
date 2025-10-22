import { execSync } from "child_process";

const scripts = [
  "seed_archetype.mjs",
  "seed_archetype_preference.mjs",
  "seed_stress_response.mjs",
  "seed_love_language_giving.mjs",
  "seed_love_language_receiving.mjs",
  "seed_attachment_style.mjs",
  "seed_ambiversion_spectrum.mjs",
  "seed_soul_connection.mjs",
  "seed_apology_language.mjs",
  "seed_forgiveness_language.mjs",
  "seed_mistake_response_style.mjs",
  "seed_attachment_style.mjs",
  "seed_self_love_style.mjs",
];

for (const script of scripts) {
  console.log(`\n🚀 Running ${script}`);
  execSync(`node scripts/${script}`, { stdio: "inherit" });
}

