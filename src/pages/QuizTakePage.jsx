// src/pages/QuizTakePage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import AttractionProfileCard from "@components/quizzes/AttractionProfileCard.jsx";

// Evaluators
import { evaluateWeightedQuiz } from "@lib/evaluateWeightedQuiz.js";
import { evaluateArchetype2D } from "@lib/evaluateArchetype2D.js";
import { evaluateArchetypePreference } from "@lib/evaluateArchetypePreference.js";

import { summarizeResults, buildNarrativeSignals } from "@lib/quizResultSummary.ts";
import StyleDistributionBar from "@components/quizzes/StyleDistributionBar";
import ResultGeneratingOverlay from "@components/quizzes/ResultGeneratingOverlay.jsx";

/* ---------- helpers ---------- */
// stable PRNG from string seed
function xmur3(str){ let h=1779033703^str.length; for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353); h=h<<13|h>>>19;} return ()=>{ h=Math.imul(h^ (h>>>16),2246822507); h=Math.imul(h^ (h>>>13),3266489909); return (h^ (h>>>16))>>>0; }; }
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t ^ t>>>15, t | 1); t ^= t + Math.imul(t ^ t>>>7, t | 61); return ((t ^ t>>>14) >>> 0) / 4294967296; }; }
function stableShuffle(arr, seedStr){
  const rand = mulberry32(xmur3(seedStr)());
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// choose "a" or "an" for a given label (basic vowel check)
const aOrAn = (s = "") => (/^[aeiou]/i.test((s || "").trim()) ? "an" : "a");

function normalizeQuiz(raw) {
  if (!raw) return { meta: { version: 1, min_required: 7, results: [] }, list: [] };
  if (raw.questions && typeof raw.questions === "object" && !Array.isArray(raw.questions)) {
    const q = raw.questions;
    return {
      meta: {
        version: q.version ?? 1,
        min_required: q.min_required ?? 7,
        results: Array.isArray(q.results) ? q.results : [],
      },
      list: Array.isArray(q.questions) ? q.questions : [],
    };
  }
  if (Array.isArray(raw.questions)) {
    return {
      meta: {
        version: raw.version ?? 1,
        min_required: raw.min_required ?? 7,
        results: Array.isArray(raw.results) ? raw.results : [],
      },
      list: raw.questions,
    };
  }
  return { meta: { version: 1, min_required: 7, results: [] }, list: [] };
}

const PATTERN_COPY = {
  "comm-trigger": {
    title: "Communication Gaps Stir Feelings",
    tip: "Anchor before reaching out: one deep breath, one kind thought, then your message."
  },
  "anxious-conflict": {
    title: "Conflict Raises Reassurance Needs",
    tip: "Try a repair phrase: “I care about us. Can we talk after a 10-minute breather?”"
  },
  "avoidant-conflict": {
    title: "Space Is Your First Language in Conflict",
    tip: "Name the space explicitly and schedule reconnection to keep the bond warm."
  },
  "disorg-approach-avoid": {
    title: "Push–Pull Around Closeness",
    tip: "Co-create rhythm: short connection windows, then a reset ritual."
  }
};

function normalizeArchetypeQuiz(raw) {
  const n = normalizeQuiz(raw);
  n.dimensions = {
    elements: ["fire","water","earth","air","electricity"],
    roles: ["protector","healer","muse","architect","rebel","sage","guardian","artisan","visionary","navigator"]
  };
  return n;
}

// --- helpers for result text formatting (JS-only) ---
const PRACTICAL_SUBTITLES = {
  accountability: "You forgive when someone owns what happened and its impact.",
  repair:         "You forgive when someone fixes what broke.",
  gift:           "Thoughtful gestures help you forgive.",
  time:           "Time and steady presence help you forgive.",
  words:          "You forgive once the apology acknowledges the harm done to you.",
  change:         "You forgive when behavior truly changes."
};

function splitParagraphs(text = "", need = 2) {
  const parts = String(text)
    .replace(/\*/g, "")
    .split(/\n{2,}/g)
    .map(s => s.trim())
    .filter(Boolean);
  while (parts.length < need) parts.push("");
  return parts.slice(0, need);
}

function stitchOverlayParagraph(overlay) {
  if (!overlay) return "";
  const parts = [];
  const clean = (s = "") => String(s).replace(/\*/g, "").trim();
  if (overlay.note) parts.push(clean(overlay.note));
  if (overlay.micro_practice) {
    let txt = clean(overlay.micro_practice);
    if (!/^[A-Z]/.test(txt)) txt = `You might try ${txt}`;
    if (!/[.!?]$/.test(txt)) txt += ".";
    parts.push(txt);
  }
  if (overlay.partner_script) {
    let script = clean(overlay.partner_script);
    script = script.replace(/^["“]+|["”]+$/g, "");
    parts.push(`If words help, you could say, “${script}.”`);
  }
  return parts.join(" ");
}

/** Map per-quiz style labels for display */
function labelMapForSlug(slug = "") {
  const s = (slug || "").toLowerCase();
  if (s.startsWith("archetype")) return {};
  if (s.includes("love-language-receiving") || s.includes("love_language_receiving") ||
      s.includes("love-language-giving")    || s.includes("love_language_giving")) {
    return {
      words: "Words of Affirmation",
      time: "Quality Time",
      touch: "Physical Touch",
      gifts: "Gifts",
      acts:  "Acts of Service",
    };
  }
  if (s.includes("self-love-style")) {
    return {
      ritualist: "Ritual",
      indulger:  "Rest & Indulgence",
      creator:   "Creation",
      reflector: "Reflection",
      connector: "Connection",
      achiever:  "Achievement",
    };
  }
  if (s.includes("stress-response")) {
    return {
      problem_solve:   "Problem-Solving",
      emotion_process: "Emotion-Focused",
      avoidance:       "Avoidance",
      internalize:     "Internalizing",
    };
  }
  if (s.includes("mistake-response-style")) {
    return {
      appease:     "Appeasement",
      defensive:   "Defensive",
      avoidant:    "Avoidant",
      aggressive:  "Aggressive",
      withdrawn:   "Withdrawn",
      solution:    "Solution-Oriented",
      accountable: "Accountable",
    };
  }
  if (s.includes("attachment-style")) {
    return { secure: "Secure", anxious: "Anxious", avoidant: "Avoidant", fearful: "Fearful-Avoidant" };
  }
  if (s.includes("ambiversion")) {
    return {
      introvert_strong: "Strong Introvert",
      introvert:        "Leaning Introvert",
      ambivert:         "Balanced Ambivert",
      extrovert:        "Leaning Extrovert",
      extrovert_strong: "Strong Extrovert",
    };
  }
  // default: forgiveness/apology family
  return {
    accountability: "Accountability",
    repair:         "Repair / Amends",
    gift:           "Gesture / Gift",
    time:           "Time / Consistency",
    words:          "Words",
    change:         "Changed Behavior",
  };
}

const toTitle = (s="") =>
  s.replace(/^_+|_+$/g,"")
   .replace(/[_-]+/g," ")
   .replace(/\b\w/g, c => c.toUpperCase());

function labelForKey(key = "", labelsMap = {}) {
  if (labelsMap[key]) return labelsMap[key];
  if (/^role_/i.test(key))    return toTitle(key.slice(5));
  if (/^energy_/i.test(key))  return toTitle(key.slice(7));
  if (/^element_/i.test(key)) return toTitle(key.slice(8));
  return key;
}

/** Heading copy per quiz (fallback) */
function displayHeadingForSlug(slug = "") {
  const s = (slug || "").toLowerCase();
  if (s.startsWith("archetype-preference")) return "Your attraction map (roles & energies)";
  if (s.startsWith("archetype-dual") || s === "archetype") return "Your role & energy distribution";
  if (s.startsWith("soul-connection")) return "How your connection signals stack";
  if (s.includes("love-language-receiving")) return "How your love-receiving styles show up";
  if (s.includes("love-language-giving"))    return "How your love-giving styles show up";
  if (s.includes("self-love-style"))         return "How your self-love styles show up";
  if (s.includes("stress-response"))         return "How your stress responses show up";
  if (s.includes("mistake-response-style"))  return "How you tend to respond to mistakes";
  if (s.includes("attachment-style"))        return "How your attachment traits show up";
  if (s.includes("ambiversion"))             return "Your energy mix";
  return "How your forgiveness styles show up";
}

/** Convert legacy object → generic rows with smart labels */
function prettyKeyLabel(k = "", labelsMap = {}, slug = "") {
  if (labelsMap && labelsMap[k]) return labelsMap[k];
  if (/^role_/.test(k))    return k.replace(/^role_/, "").replace(/_/g, " ");
  if (/^energy_/.test(k))  return k.replace(/^energy_/, "").replace(/_/g, " ");
  if (/^element_/.test(k)) return k.replace(/^element_/, "").replace(/_/g, " ");
  return k;
}
/** Convert our legacy `resultView.distribution` into generic rows */
function rowsFromDistribution(dist, labelsMap, slug = "") {
  if (!dist || !dist.keys || !dist.percentages) return [];
  return (dist.order || dist.keys).map((k, i) => ({
    key: k,
    label: prettyKeyLabel(k, labelsMap, slug),
    score: dist.counts?.[k] ?? 0,
    percent: dist.percentages[k] ?? 0,
    rank: i + 1,
  }));
}

// Simple in-file dual evaluator (Role + Energy) for the identity quiz
function evaluateArchetypeDual(quiz, answers) {
  const { list } = normalizeQuiz(quiz);
  const roleTotals = {}, energyTotals = {};
  for (const q of list) {
    const chosenKey = answers[q.id]; if (!chosenKey) continue;
    const opt = (q.options||[]).find(o => (o.key ?? o.id) === chosenKey);
    if (!opt) continue;
    for (const [k,v] of Object.entries(opt.weights_role||{}))   roleTotals[k]   = (roleTotals[k]||0) + (+v||0);
    for (const [k,v] of Object.entries(opt.weights_energy||{})) energyTotals[k] = (energyTotals[k]||0) + (+v||0);
  }

  const topOf = (obj) => {
    let bestK = null, bestV = -Infinity;
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v) || 0;
      if (n > bestV) { bestV = n; bestK = k; }
    }
    return bestK;
  };

  const roleTop = topOf(roleTotals);
  const energyTop = topOf(energyTotals);

  return {
    ok: !!(roleTop && energyTop),
    roleTotals,
    energyTotals,
    roleTop,
    energyTop,
    result_key: roleTop && energyTop ? `${roleTop.toLowerCase()}__${energyTop.toLowerCase()}` : null,
    result_title: roleTop && energyTop ? `${roleTop} × ${energyTop}` : null,
  };
}

/* Weighted evaluation + micro & pattern extraction for generic quizzes */
function evaluate(quiz, answers) {
  const { meta, list } = normalizeQuiz(quiz);
  const { results = [] } = meta;

  const allKeys = new Set(results.map(r => r.key));
  const totals = {}; for (const k of allKeys) totals[k] = 0;

  const micro = [];
  const patternCounts = {};

  for (const q of list) {
    const opts = q.options || q.choices || [];
    const chosenKey = answers[q.id];
    if (!chosenKey) continue;
    const opt = opts.find(o => (o.key ?? o.id) === chosenKey);
    if (!opt) continue;

    if (opt.weights && typeof opt.weights === "object") {
      for (const [k, v] of Object.entries(opt.weights)) {
        if (!(k in totals)) totals[k] = 0;
        totals[k] += Number(v) || 0;
      }
    }

    if (opt.suggestion) micro.push({ qid: q.id, text: opt.suggestion });

    const tags = Array.isArray(opt.tags) ? opt.tags : [];
    for (const t of tags) patternCounts[t] = (patternCounts[t] || 0) + 1;
  }

  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  const result_key = sorted[0]?.[0] || null;
  const result = results.find(r => r.key === result_key) || null;

  const patternNotes = Object.entries(patternCounts)
    .filter(([,count]) => count >= 2)
    .map(([tag]) => ({
      tag,
      title: PATTERN_COPY[tag]?.title || "Pattern Noticed",
      tip: PATTERN_COPY[tag]?.tip || "A gentle experiment may help here."
    }));

  return {
    ok: !!result,
    result_key,
    result,
    totals,
    micro,
    patterns: patternNotes,
    min_required: meta.min_required ?? 7
  };
}

export default function QuizTakePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [resultView, setResultView] = useState(null);

  const sectionRef = useRef(null);
  const [nudges, setNudges] = useState([]);
  const narrativeRequestedRef = useRef(false);
  const [subjectLabel, setSubjectLabel] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ holds an optional stable subject hash passed from the URL (or derived locally)
  const subjectHashRef = useRef(null);

  // Prefill subject from URL on Soul-Connection and skip the intro step
  useEffect(() => {
    if (quiz?.slug !== "soul-connection") return;
    const params   = new URLSearchParams(window.location.search);
    const preLabel = (params.get("subject_label") || "").trim();
    const preHash  = (params.get("subject_hash")  || "").trim().toLowerCase();
    if (preLabel) setSubjectLabel(preLabel.slice(0, 40));
    if (preHash)  subjectHashRef.current = preHash;
    if (preLabel || preHash) setAnswers(prev => ({ ...prev, __intro_done: true }));
  }, [quiz?.slug]);

  // treat this as a pre-question step
  const isSoul = quiz?.slug === "soul-connection";
  const atIntro = isSoul && index === 0 && !answers.__intro_done;

  function finishIntro() {
    if (!subjectLabel.trim()) return;
    if (!subjectHashRef.current) subjectHashRef.current = subjectLabel.trim().toLowerCase();
    setAnswers(prev => ({ ...prev, __intro_done: true }));
  }

  const onReveal = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setErr("");
    // 🔔 Show luxe overlay immediately and keep it up for a short beat
    setIsGenerating(true);
    const minDelay = new Promise(res => setTimeout(res, 900));

    try {
      let view = null;            // UI payload
      let persistPayload = null;  // DB payload

      // --- keep a stable hash for the entered name (Soul-Connection only) ---
      const isSoul = quiz.slug === "soul-connection";
      if (!subjectHashRef.current && subjectLabel.trim()) {
        subjectHashRef.current = subjectLabel.trim().toLowerCase();
      }
      const subjectBits = (isSoul && subjectLabel.trim())
        ? {
            subject_label: subjectLabel.trim(),
            subject_kind: "person",
            subject_hash: subjectHashRef.current || subjectLabel.trim().toLowerCase(),
          }
        : {};

      // ───────────────────────────────── Archetype Dual
      if (["archetype-dual", "archetype_dual"].includes(quiz.slug)) {
        const ev = evaluateArchetypeDual(quiz, answers);
        if (!ev.ok) { setErr("Please answer a few more questions."); return; }

        const totalsFlat = Object.fromEntries([
          ...Object.entries(ev.roleTotals   || {}).map(([k, v]) => [`role_${k}`,   Number(v) || 0]),
          ...Object.entries(ev.energyTotals || {}).map(([k, v]) => [`energy_${k}`, Number(v) || 0]),
        ]);

        const title = ev.result_title || "Archetype";
        view = {
          title: `You may be ${aOrAn(title)} ${title}`,
          subtitle: "Your Role is how you function; your Energy is how you’re felt.",
          summary:
            "This pairing is your signature blend. Use Role for what you do; bring your Energy to how you do it.",
          guidance: [
            "Name your Role in your calendar; bring your Energy to how you do it.",
            "When stressed, choose one micro-practice that nourishes your Energy."
          ],
          result_key: ev.result_key,
          totals: totalsFlat,
          max_raw: null,
          confidence: null,
        };

        persistPayload = {
          result_key: ev.result_key,
          result_title: ev.result_title,
          result_summary: view.summary,
          result_totals: totalsFlat,
          meta: {
            role_top: ev.roleTop,
            energy_top: ev.energyTop,
            ...(isSoul ? { subject_label: subjectBits.subject_label, subject_hash: subjectBits.subject_hash } : {})
          },
          ...(isSoul ? subjectBits : {})
        };
      }
      // ───────────────────────────────── Legacy Archetype
      else if (quiz.slug === "archetype") {
        const ev = evaluateArchetype2D(quiz, answers);
        if (!ev.ok) { setErr(ev.reason || "Please answer a few more questions."); return; }
        const ELABEL = { fire:"Fire", water:"Water", earth:"Earth", air:"Air", electricity:"Electricity" };
        const RLABEL = {
          protector:"Protector", healer:"Healer", muse:"Muse", architect:"Architect", rebel:"Rebel",
          sage:"Sage", guardian:"Guardian", artisan:"Artisan", visionary:"Visionary", navigator:"Navigator"
        };
        const title = `${ELABEL[ev.element_key]} ${RLABEL[ev.role_key]}`;
        const totalsRaw = { ...ev.element_totals, ...ev.role_totals };

        view = {
          title: `You may be ${aOrAn(title)} ${title}`,
          subtitle: "Element is your core energy; Role is your operating mode.",
          summary:
            "Blend the light traits of both. Notice shadow tendencies and pick one small corrective practice.",
          guidance: [
            "Lean into the light traits of both dimensions.",
            "Notice when shadow tendencies appear and choose one small corrective practice."
          ],
          result_key: ev.result_key,
          totals: totalsRaw,
          max_raw: null,
          confidence: null,
        };

        persistPayload = {
          result_key: ev.result_key,
          result_title: title,
          result_summary: view.summary,
          result_totals: totalsRaw,
          meta: {
            element_key: ev.element_key,
            role_key: ev.role_key,
            ...(isSoul ? { subject_label: subjectBits.subject_label, subject_hash: subjectBits.subject_hash } : {})
          },
          ...(isSoul ? subjectBits : {})
        };
      }
      // ───────────────────────────────── Archetype Preference
      else if (["archetype-preference", "archetype_preference"].includes(quiz.slug)) {
        const ev = evaluateArchetypePreference(quiz, answers);
        if (!ev.ok) { setErr(ev.reason || "Please answer a few more questions."); return; }

        const energyAsElement = Object.fromEntries(
          Object.entries(ev.energyTotals || {}).map(([k, v]) => [`element_${k}`, +v || 0])
        );

        const totalsFlat = Object.fromEntries([
          ...Object.entries(ev.roleTotals   || {}).map(([k, v]) => [`role_${k}`,   +v || 0]),
          ...Object.entries(ev.energyTotals || {}).map(([k, v]) => [`energy_${k}`, +v || 0]),
          ...Object.entries(energyAsElement),
        ]);
        const totalsForView = { ...(ev.result_totals || {}), ...energyAsElement };

        const summary =
          "This maps the archetypal Role and Energy you’re most attracted to right now—useful for connection patterns.";

        const prefTitle = ev.result_title || ev.result_key || "Archetype Preference";
        view = {
          title: `You may prefer ${prefTitle}`,
          subtitle: null,
          summary,
          guidance: [
            "Notice where this preference shows up across friendships, dating, and collaboration.",
            "Experiment: seek one small expression of this energy this week and journal how it lands."
          ],
          result_key: ev.result_key || null,
          totals: totalsForView,
          max_raw: null,
          confidence: null,
        };

        persistPayload = {
          result_key: ev.result_key || null,
          result_title: ev.result_title || null,
          result_summary: summary,
          result_totals: ev.result_totals || {},
          meta: {
            ...ev.meta,
            is_preference: true,
            ...(isSoul ? { subject_label: subjectBits.subject_label, subject_hash: subjectBits.subject_hash } : {})
          },
          ...(isSoul ? subjectBits : {})
        };
      }
      // ───────────────────────────────── Generic weighted quizzes (incl. Soul-Connection)
      else {
        const ev = evaluateWeightedQuiz(quiz, answers);
        if (!ev.ok) { setErr(ev.reason || "Please answer a few more questions."); return; }

        const title    = ev.result?.label || ev.result_key || "Your result";
        const name = subjectLabel?.trim();
        const isSoulQuiz = quiz.slug === "soul-connection";
        const headline = (isSoulQuiz && name)
          ? `${name} may be your ${title}.`
          : `You may be ${aOrAn(title)} ${title}.`;
        const summary  = ev.result?.summary || "";

        view = {
          title: headline,
          subtitle: summary,
          summary,
          guidance: Array.isArray(ev.result?.guidance) ? ev.result.guidance : [],
          result_key: ev.result_key,
          totals: ev.totals_raw || {},
          max_raw: ev.max_raw,
          confidence: ev.confidence ?? null,
        };

        persistPayload = {
          result_key: ev.result_key,
          result_title: title,
          result_summary: summary || null,
          result_totals: ev.totals_raw || {},
          meta: {
            max_raw: ev.max_raw,
            confidence: ev.confidence ?? null,
            ...(isSoul ? { subject_label: subjectBits.subject_label, subject_hash: subjectBits.subject_hash } : {})
          },
          ...(isSoul ? subjectBits : {})
        };
      }

      // If Soul-Connection and we have a name, adjust headline nicely
      if (quiz.slug === "soul-connection" && subjectLabel.trim()) {
        const name = subjectLabel.trim();
        const humanTitle =
          view?.result_title || view?.title?.replace(/^You may be (an?|the)\s+/i, "") || "";
        if (humanTitle) view.title = `${name} may be your ${humanTitle}`;
      }

      // 1) Show result immediately (local distribution)
      const dist = summarizeResults(view.totals, { capPerStyle: 16 });
      const labelsForThisQuiz = labelMapForSlug(quiz.slug);
      setResultView({
        ...view,
        distribution: dist,
        meta: {
          styles_heading: displayHeadingForSlug(quiz.slug),
          display_distribution: rowsFromDistribution(dist, labelsForThisQuiz),
        },
      });

      // Optional: richer signals for your Edge Function
      const narrativeSignals = buildNarrativeSignals({
        quiz_slug: quiz.slug,
        result_title: view.title,
        totals: view.totals,
        capPerStyle: 16,
      });

      // 2) Persist attempt; then nudges + AI narrative
      let attemptId = null;

      if (user?.id) {
        const { data: inserted, error: insertErr } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            quiz_id: quiz.id,
            quiz_slug: quiz.slug,
            completed_at: new Date().toISOString(),
            is_public: false,
            ...persistPayload,
            ...subjectBits,
          })
          .select("id")
          .single();

        if (insertErr || !inserted?.id) {
          console.warn("quiz_attempts insert failed:", insertErr?.message || "unknown");
        } else {
          attemptId = inserted.id;

          // compose-nudges
          try {
            const { data: resp, error: nErr } = await supabase.functions.invoke(
              "compose-nudges",
              { body: { user_id: user.id, attempt_id: attemptId } }
            );
            if (nErr) {
              console.warn("compose-nudges error:", nErr.message);
            } else {
              const list = Array.isArray(resp) ? resp : resp?.nudges;
              if (Array.isArray(list) && list.length) {
                setResultView((rv) => (rv ? { ...rv, nudges: list } : rv));
              }
            }
          } catch (e) {
            console.warn("compose-nudges invoke failed:", e);
          }

          // quiz-narrative (guarded)
          if (!narrativeRequestedRef.current) {
            narrativeRequestedRef.current = true;
            try {
              const mapSlugToFamily = (slug = "") => {
                const s = (slug || "").toLowerCase();
                if (/apology|forgive|forgiveness|repair/.test(s)) return "Forgiveness Language";
                if (/love-language|love_language/.test(s)) return "Love Language";
                if (/archetype/.test(s)) return "Archetype";
                return "Quiz";
              };

              const STYLE_LABEL = {
                words: "Words",
                accountability: "Accountability",
                repair: "Repair/Amends",
                gift: "Gifts/Gestures",
                time: "Time",
                change: "Changed Behavior",
              };

              const computeOrderedDistribution = (totals = {}) =>
                Object.entries(totals)
                  .map(([k, v]) => ({ key: k, label: STYLE_LABEL[k] || k, score: Number(v) || 0 }))
                  .sort((a, b) => b.score - a.score)
                  .map((x) => x.label);

              const quizSlug = quiz?.slug || view?.quiz_slug || "";
              const totals   = view?.totals || persistPayload?.result_totals || {};
              const ordered  = computeOrderedDistribution(totals);

              const payload = {
                quiz_type: mapSlugToFamily(quizSlug),
                ordered_distribution: ordered,
                notes: "Keep it ~600 words. Audience: adult, emotionally literate. No diagnosis. Include one concrete everyday example."
              };

              const fnName = `quiz-narrative?attempt_id=${encodeURIComponent(attemptId)}`;
              const { data: ai, error: aiErr } = await supabase.functions.invoke(fnName, {
                body: { attempt_id: attemptId, payload }
              });

              if (aiErr) {
                console.warn("quiz-narrative error:", aiErr.message);
              } else if (ai) {
                setResultView((rv) => {
                  if (!rv) return rv;
                  const core    = ai.core_result || {};
                  const overlay = ai.archetype_overlay || null;
                  const incomingMeta = ai.meta ?? null;

                  const practicalSubtitle =
                    core.headline || rv.subtitle || rv.summary || "";

                  return {
                    ...rv,
                    subtitle: practicalSubtitle,
                    core_result: { ...core },
                    archetype_overlay: overlay || rv.archetype_overlay,
                    overlay_paragraph: overlay?.paragraph || rv.overlay_paragraph || "",
                    meta: incomingMeta ?? rv.meta ?? null,
                    narrative_meta: ai.meta ?? rv.narrative_meta ?? null,
                    source: "ai",
                  };
                });
              }
            } catch (e) {
              console.warn("quiz-narrative invoke failed:", e);
            }
          }
        }
      }

      // Ensure the overlay has shown long enough
      await minDelay;
    } catch (e) {
      console.warn("Reveal failed:", e);
      setErr(e?.message || "Could not save your result");
    } finally {
      setSubmitting(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (quiz?.slug !== "soul-connection") return;
    const params = new URLSearchParams(window.location.search);
    const lbl = params.get("subject_label");
    const hsh = params.get("subject_hash");
    if (lbl) setSubjectLabel(lbl);
    if (hsh) subjectHashRef.current = hsh.toLowerCase();
  }, [quiz?.slug]);

  useEffect(() => {
    sectionRef.current?.focus();
  }, [quiz?.slug, index]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(""); setResultView(null);
      setAnswers({}); setIndex(0);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("id, slug, title, category, description, questions")
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Quiz not found.");
        if (alive) setQuiz(data);
      } catch (e) {
        if (alive) setErr(e.message || "Could not load quiz.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const { meta, list } = useMemo(() => normalizeQuiz(quiz), [quiz]);
  const total = list.length;
  const current = list[index] || null;

  // stable-scrambled options for current question
  const currentOptions = useMemo(() => {
    const opts = (current?.options || current?.choices || []);
    if (!quiz?.slug || !current?.id) return opts;
    return stableShuffle(opts, `${quiz.slug}:${current.id}`);
  }, [quiz?.slug, current?.id, current]);

  const requiredAnswered = useMemo(
    () => list.filter(q => !q.optional && answers[q.id]).length,
    [list, answers]
  );
  const canReveal = requiredAnswered >= (meta.min_required ?? 7);

  function pick(qid, key) {
    setAnswers(prev => ({ ...prev, [qid]: key }));
    if (index < total - 1) setIndex(i => i + 1);
  }
  function onBack(){ setIndex(i => Math.max(0, i - 1)); }
  function onNext(){
    if (!current) return;
    const isAnswered = !!answers[current.id];
    if (!current.optional && !isAnswered) return;
    if (index < total - 1) setIndex(i => i + 1);
  }

  const isLast = index === total - 1;
  let ctaLabel = "Next";
  if (current?.optional && !answers[current?.id]) ctaLabel = "Continue";
  if (isLast && canReveal) ctaLabel = "Reveal My Result";

  const ctaDisabled = (() => {
    if (isLast && canReveal) return false;
    if (current?.optional) return false;
    return !answers[current?.id];
  })();

  const progress = total > 0 ? Math.round(((index + 1) / total) * 100) : 0;

  if (loading) return <div className="container quiz-page" style={{ padding: 24 }}>Loading…</div>;
  if (err) return (
    <div className="container quiz-page" style={{ padding: 24 }}>
      <div className="surface" style={{ padding: 16 }}>{err}</div>
      <ResultGeneratingOverlay open={isGenerating} />
    </div>
  );
  if (!quiz) return null;

  function handleCTA(cta) {
    try {
      const tgt = cta?.target || "";
      if (!tgt) return;
      if (tgt.startsWith("modal://")) {
        alert(`Open modal: ${tgt}`);
      } else {
        window.open(tgt, "_blank", "noopener,noreferrer");
      }
    } catch {}
  }

  // result view
  if (resultView) {
    const labelMap = labelMapForSlug(quiz.slug);
    const isArchetypeDual = /^(archetype-dual|archetype_dual)$/.test(quiz?.slug || "");
    const isArchetypePref = /^(archetype-preference|archetype_preference)$/.test(quiz?.slug || "");
    const showAttractionProfile = !(isArchetypeDual || isArchetypePref);

    const displayRows =
      resultView?.meta?.display_distribution && Array.isArray(resultView.meta.display_distribution)
        ? resultView.meta.display_distribution
        : rowsFromDistribution(resultView?.distribution, labelMap);

    const stylesHeading =
      resultView?.meta?.styles_heading || displayHeadingForSlug(quiz.slug);

    const core    = resultView.core_result ?? {};
    const overlay = resultView.archetype_overlay ?? {};
    const headline = core.headline || resultView.title || "";
    const subline  = core.subtitle || resultView.subtitle || "";

    return (
      <>
        <div className="container quiz-page" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>{quiz.title}</h1>

          <section
            ref={sectionRef}
            tabIndex={-1}
            className="surface"
            style={{ padding: 18, display: "grid", gap: 12 }}
          >
            <h2 style={{ marginTop: 0 }}>{headline}</h2>
            {subline && (
              <div style={{ fontSize: 20, opacity: 0.9, marginTop: -6 }}>
                {subline}
              </div>
            )}

            {showAttractionProfile && (
              <AttractionProfileCard
                totals={resultView.totals}
                results={meta.results}
              />
            )}

            {core.mirror && <p style={{ opacity: 0.95 }}>{core.mirror}</p>}
            {core.shadow && <p style={{ opacity: 0.95 }}>{core.shadow}</p>}
            {core.gift && <p style={{ opacity: 0.95 }}>{core.gift}</p>}
            {core.full_spectrum && <p style={{ opacity: 0.95 }}>{core.full_spectrum}</p>}
            {core.mantra && <p style={{ opacity: 0.9, fontStyle: "italic" }}>{core.mantra}</p>}

            {!core.mirror && resultView.para1 && (
              <p style={{ opacity: 0.95 }}>{resultView.para1}</p>
            )}
            {!core.gift && resultView.para2 && (
              <p style={{ opacity: 0.95 }}>{resultView.para2}</p>
            )}

            {displayRows.length > 0 && (
              <section className="surface" style={{ padding: 12, marginTop: 12, display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>{stylesHeading}</div>
                <StyleDistributionBar rows={displayRows} />
              </section>
            )}

            {resultView.nudges?.length > 0 && (
              <section style={{ marginTop: 12 }}>
                <h3>Personalized nudges</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  {resultView.nudges.map((n, i) => (
                    <div key={n.hit_id || n.id || i} className="surface" style={{ padding: 12, borderRadius: 10 }}>
                      {n.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{n.title}</div>}
                      {n.body && <div style={{ opacity: 0.9 }}>{n.body}</div>}
                      {Array.isArray(n.tips) && n.tips.length > 0 && (
                        <ul style={{ marginTop: 8 }}>
                          {n.tips.map((t, j) => <li key={j}>{t}</li>)}
                        </ul>
                      )}
                      {n.cta?.label && (
                        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => handleCTA(n.cta)}>
                          {n.cta.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn" onClick={() => { setResultView(null); setAnswers({}); setIndex(0); }}>
                Retake
              </button>
              <button className="btn btn--ghost" onClick={() => navigate("/quizzes")}>
                Back to quizzes
              </button>
              <button
                className="btn btn--gold"
                onClick={() => navigate("/account?tab=profile&ptab=quizzes&focus=insights")}
                title="Jump to your Quiz Insights on your Personality Profile"
              >
                See My Insights
              </button>
            </div>
          </section>
        </div>

        <ResultGeneratingOverlay open={isGenerating} />
      </>
    );
  }

  // question view
  return (
    <>
      <div className="container quiz-page" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <section className="surface" style={{ padding: 18, marginBottom: 12 }}>
          <h1 style={{ marginTop: 0 }}>{quiz.title}</h1>
          {quiz.description ? (
            <p style={{ opacity: .85 }}>
              {quiz.description}<br/>
              Reflective guidance — <strong>not</strong> a verdict. 
            </p>
          ) : null}

          {isSoul && atIntro && (
            <section ref={sectionRef} tabIndex={-1} className="surface" style={{ padding: 18, display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Who is this about?</div>
              <input
                value={subjectLabel}
                onChange={(e)=>setSubjectLabel(e.target.value.slice(0, 40))}
                placeholder="Name or initials (e.g., “A.B.”, “Jordan”, “Mom”)"
                className="input"
                style={{ maxWidth: 360 }}
                aria-label="Name or initials"
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn--gold" onClick={finishIntro} disabled={!subjectLabel.trim()}>
                  Start
                </button>
                <button className="btn btn--ghost" onClick={()=>navigate("/quizzes")}>Cancel</button>
              </div>
            </section>
          )}

          {isSoul && !atIntro && subjectLabel?.trim() && (
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
              About: <strong>{subjectLabel.trim()}</strong>
            </div>
          )}

          {/* progress */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              height: 10, borderRadius: 999, border: "1px solid var(--hairline)",
              background: "rgba(255,255,255,.06)", overflow: "hidden"
            }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(145deg, var(--gold), var(--gold-2))"
              }}/>
            </div>
            <div style={{ fontSize: 12, opacity: .75, marginTop: 6 }}>
              Question {Math.min(index+1, total)} of {total}
            </div>
          </div>
        </section>

        {current && (
          <section
            ref={sectionRef}
            tabIndex={-1}
            className="surface"
            style={{ padding: 18, display: "grid", gap: 12 }}
          >
            <div style={{ fontWeight: 700 }}>
              {current.prompt || current.text || "Question"}
              {current.optional ? <span style={{ opacity: .6, marginLeft: 6 }}>(optional)</span> : null}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {currentOptions.map(opt => {
                const key = opt.key ?? opt.id;
                const label = opt.label ?? opt.text ?? String(key);
                const selected = answers[current.id] === key;
                return (
                  <button
                    key={key}
                    className="pill"
                    data-selected={selected ? "" : undefined}
                    aria-pressed={selected}
                    onClick={() => pick(current.id, key)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
              <button className="btn btn--ghost" disabled={index === 0} onClick={onBack}>Back</button>
              {!isLast ? (
                <button className="btn btn--gold" disabled={ctaDisabled} onClick={onNext}>{ctaLabel}</button>
              ) : (
                <button className="btn btn--gold" disabled={!canReveal || submitting} onClick={onReveal}>
                  {submitting ? "Scoring…" : "Reveal My Result"}
                </button>
              )}
            </div>

            {!current.optional && !answers[current.id] && (
              <div style={{ fontSize: 12, opacity: .75 }}>Please choose an option to continue.</div>
            )}
          </section>
        )}
      </div>

      <ResultGeneratingOverlay open={isGenerating} />
    </>
  );
}
