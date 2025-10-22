// Fetch the archetypes JSON from your GitHub repo and enrich seasonal messages.
// You can later mirror this JSON into Supabase/storage if you prefer.
const SRC = "https://raw.githubusercontent.com/CodeAfrodisia/soul-framework/main/archetypes_soul_framework.json";

export async function loadSoulFramework() {
  const res = await fetch(SRC, { cache: "force-cache" });
  const data = await res.json();

  // Optional enrich (short and safe):
  const enrich = (a) => {
    if (a.name === "Windbearer" && !a.seasonalMessages) {
      a.seasonalMessages = {
        Spring: "Let the breezes of change lift your spirit.",
        Summer: "Ride the thermals of inspiration.",
        Autumn: "Soften your pace and listen to the wind.",
        Winter: "Even the quietest air holds secrets.",
      };
    }
    return a;
  };

  return Array.isArray(data) ? data.map(enrich) : [];
}

