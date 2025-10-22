// supabase/functions/archetype-profile/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*", // tighten in prod
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Row = Record<string, unknown>;
type Totals = Record<string, number>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const base = `${SUPABASE_URL}/rest/v1`;
    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    // ---- ARCHETYPE (latest) -------------------------------------------------
    const archRes = await fetch(
      `${base}/quiz_attempts_latest?user_id=eq.${user_id}` +
      `&quiz_slug=eq.archetype-dual` +
      `&select=result_title,result_totals,completed_at&limit=1`,
      { headers }
    );
    const arch = archRes.ok ? (await archRes.json())?.[0] ?? null : null;
    const totals: Totals = (arch?.result_totals ?? {}) as Totals;

    const pickTop = (prefix: "role_"|"energy_") => {
      let best: string|null = null, max = -Infinity;
      for (const [k,v] of Object.entries(totals||{})) {
        if (!k.startsWith(prefix)) continue;
        const n = Number(v)||0;
        if (n>max){ max=n; best=k; }
      }
      return best ? best.replace(prefix,"") : null;
    };
    const tc = (s:string) => s.replace(/\b\w/g,c=>c.toUpperCase()).replace(/_/g," ");
    const role   = tc(pickTop("role_")   || "");
    const energy = tc(pickTop("energy_") || "");
    const archTitle = arch?.result_title || (role && energy ? `${role} × ${energy}` : "—");

    // ---- LOVE QUIZZES (latest per family) ----------------------------------
    const FAM = {
  receiving: ["love-language-receiving","love_language_receiving","love-language"],
  giving:    ["love-language-giving","love_language_giving"],
  apology:   ["apology-style","apology_language","apology-language","apology","repair-style","repair_apology"],
  forgive:   ["forgiveness-language","forgiveness_language","forgiveness","repair-forgiver","repair_forgiver"],
  attach:    ["attachment-style","attachment_style","attachment"],
};

const all = [
  ...FAM.receiving, ...FAM.giving, ...FAM.apology, ...FAM.forgive, ...FAM.attach
].map(s => `"${s}"`).join(",");

const inParam = encodeURIComponent(`(${all})`);

const loveRes = await fetch(
  `${base}/quiz_attempts_latest?user_id=eq.${user_id}&in=quiz_slug.${inParam}` +
  `&select=quiz_slug,result_key,result_title,completed_at`,
  { headers }
);

const loveRows: Row[] = loveRes.ok ? await loveRes.json() : [];

const latestFrom = (family: string[]) =>
  loveRows.find(r => family.includes(String(r.quiz_slug))) || null;

const receiving = latestFrom(FAM.receiving);
const giving    = latestFrom(FAM.giving);
const apology   = latestFrom(FAM.apology);
const forgive   = latestFrom(FAM.forgive);
const attach    = latestFrom(FAM.attach);

const valOf = (r: Row|null) => (r?.result_title || r?.result_key || null) as string|null;
const recV = valOf(receiving);
const givV = valOf(giving);
const apoV = valOf(apology);
const forV = valOf(forgive);
const attV = valOf(attach);


    // ---- MOODS (30d) -------------------------------------------------------
    const since = new Date(); since.setDate(since.getDate() - 30);
    const moodsRes = await fetch(
      `${base}/moods?user_id=eq.${user_id}` +
      `&select=created_at,mood,love_language,need,social_battery` +
      `&created_at=gte.${since.toISOString()}` +
      `&order=created_at.desc&limit=200`,
      { headers }
    );
    const moods: Row[] = moodsRes.ok ? await moodsRes.json() : [];
    const mode = (arr:string[]) => {
      const c:Record<string,number> = {};
      for (const v of arr) if (v) c[v] = (c[v]||0)+1;
      let best="",max=0; for (const [k,n] of Object.entries(c)) if (n>max){max=n;best=k;}
      return best || null;
    };
    const lc = (s:string) => (s||"").toLowerCase();
    const domMood = mode(moods.map(m=>lc(String(m.mood||""))));
    const domNeed = mode(moods.map(m=>lc(String(m.need||""))));
    const domCheckinLove = mode(moods.map(m=>lc(String(m.love_language||""))));
    const avgBattery = (() => {
      const map:Record<string,number>={low:1,medium:2,high:3};
      const vals = moods.map(m=>map[lc(String(m.social_battery||""))]).filter(Boolean);
      return vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : null;
    })();

    // ---- Element from Energy (coarse) --------------------------------------
    const element =
      energy.includes("Warrior") ? "Fire" :
      /Sage|Visionary/i.test(energy) ? "Air" :
      /Healer|Lover/i.test(energy) ? "Water" :
      /Creator|Guardian|Architect/i.test(energy) ? "Earth" : null;

    // ---- Narrative (personal) ----------------------------------------------
    const human = (s?:string|null) => s ? tc(String(s)) : null;
    const bullets:string[] = [];
    if (recV) bullets.push(`You **refuel by ${human(recV)}**; build that into daily transitions.`);
    if (givV) bullets.push(`You **tend to show love via ${human(givV)}**—name it so partners feel your intent.`);
    if (attV) bullets.push(`Your attachment reads **${human(attV)}**; lead with reassurance, not only solutions.`);
    if (apoV && forV) bullets.push(`In conflict, your **apology (${human(apoV)})** pairs best with forgiveness cues of **${human(forV)}**—design the repair ritual around that.`);
    if (domNeed) bullets.push(`Greatest need lately: **${tc(domNeed)}**—treat it as a daily non-negotiable.`);
    if (domCheckinLove) bullets.push(`Under stress, you’ve reached most for **${tc(domCheckinLove)}**—use it as your reset switch.`);
    if (avgBattery!=null) {
      const band = avgBattery>=2.5?"mostly high":avgBattery>=1.5?"mostly medium":"mostly low";
      bullets.push(`Social battery is **${band} (${avgBattery}/3)**—pace decisions to match capacity.`);
    }

    // Pair-specific nudge examples (expand over time)
    if (role==="Architect" && /Warrior/i.test(energy)) {
      bullets.unshift("Share the plan before you drive the pace; agree on the *why* and the *finish line*.");
      bullets.push("Practice **receiving help without repayment**—let support land.");
    }

    // ---- Compatibility & Conflict mapping ----------------------------------
    const compatibility = buildCompatibility(role, energy);
    const conflict_resolution = buildConflictTips(apoV, forV);

    // ---- Traits library (keep your existing one) ----------------------------
    const traits = traitsFor(role, energy);

    // ---- Final summary ------------------------------------------------------
    const summaryParts:string[] = [];
    if (role && energy) summaryParts.push(`You’re showing a **${role} × ${energy}** pattern—${role} is how you *function*, ${energy} is how you’re *felt*.`);
    if (element) summaryParts.push(`This blend leans **${element.toLowerCase()}** (pace, instinct, momentum).`);
    if (domNeed) summaryParts.push(`Recent entries highlight **Need: ${tc(domNeed)}** as your regulator.`);
    const summary = summaryParts.join(" ");

    return new Response(JSON.stringify({
      archetype_title: archTitle,
      element,
      summary,
      traits,
      weaving: { notes: bullets },      // <-- short, personal “because → therefore” lines
      compatibility,
      conflict_resolution,             // <-- apology ↔ forgiveness mapping
      sources: {
        receiving: receiving?.result_key || receiving?.result_title || null,
        giving:    giving?.result_key    || giving?.result_title    || null,
        apology:   apology?.result_key   || apology?.result_title   || null,
        forgiveness: forgive?.result_key || forgive?.result_title   || null,
        attachment: attach?.result_key   || attach?.result_title    || null,
        dominant_need: domNeed,
        dominant_checkin_love: domCheckinLove,
      }
    }), { headers: { ...cors, "Content-Type": "application/json" }, status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 500,
    });
  }
});

/* ---------------- helpers ---------------- */

function traitsFor(role:string, energy:string) {
  const key = `${role}|${energy}`;
  const LIB: Record<string,{light:string[];shadow:string[];strengths:string[];challenges:string[]}> = {
    "Architect|Warrior": {
      light: [
        "Builds clear systems that enable decisive action",
        "Sets firm but fair boundaries",
        "Turns long-term vision into tactical steps",
      ],
      shadow: [
        "Can over-optimize and rush others",
        "Impatience with ambiguity or emotions",
        "Control can crowd out collaboration",
      ],
      strengths: [
        "Operational clarity",
        "Courage under pressure",
        "Protective leadership",
      ],
      challenges: [
        "Slowing down to include more voices",
        "Letting support in (receiving help)",
        "Balancing precision with play",
      ],
    },
  };
  return LIB[key] || { light:[], shadow:[], strengths:[], challenges:[] };
}

function buildCompatibility(role:string, energy:string) {
  const best: Array<{ pair:string; why:string }> = [];
  const friction: Array<{ pair:string; why:string }> = [];
  if (/Warrior/i.test(energy)) {
    best.push(
      { pair: "Architect × Healer",  why: "Your pace + their attunement = decisive action with care." },
      { pair: "Guardian × Sage",     why: "Your urgency finds perspective; plans stay grounded." },
      { pair: "Artisan × Muse",      why: "You architect structure; they flood it with creative options." },
    );
    friction.push(
      { pair: "Rebel-forward blends",  why: "Boundary-testing + competitive pacing can escalate quickly." },
      { pair: "Jester-forward blends", why: "Your focus vs their spontaneity can misread each other." },
      { pair: "Navigator × Rebel",     why: "Late plan changes can clash with your need for stability." },
    );
  }
  // extend matrix as your library grows
  return { best, friction };
}

function buildConflictTips(apology: string|null, forgiveness: string|null) {
  const norm = (s:string|null) => (s||"").toLowerCase().replace(/\s+/g,"_");
  const a = norm(apology);
  const f = norm(forgiveness);
  const map:Record<string,string> = {
    expressing_regret: "compassion",
    accepting_responsibility: "understanding",
    making_restitution: "transformation",
    genuine_repentance: "forbearance",
    requesting_forgiveness: "release",
  };
  const lines:string[] = [];
  if (a && map[a]) lines.push(`Your apology lands best with partners who forgive through **${title(map[a])}**.`);
  if (f) {
    const entry = Object.entries(map).find(([,v]) => v===f);
    if (entry) lines.push(`You forgive most easily when apologies emphasize **${title(entry[0].replace(/_/g," "))}**.`);
  }
  if (!lines.length) lines.push("Name the harm, own the impact, propose one next step, include a small restitution.");
  return lines;

  function title(s:string){ return s.replace(/\b\w/g,c=>c.toUpperCase()); }
}
