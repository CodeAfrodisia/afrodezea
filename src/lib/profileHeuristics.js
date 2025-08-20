// Lightweight keyword heuristics → { floral, fruity, woody, fresh, spicy, citrus, sweet, smoky, strength } (0–5)

const DICTS = {
    floral: ["rose","jasmine","peony","gardenia","lily","violet","orchid","tuberose","iris","magnolia","bloom","petal","bouquet","floral"],
    fruity: ["berry","blackberry","raspberry","strawberry","pear","apple","peach","plum","fig","fruit","fruity","grape","cherry","apricot"],
    woody:  ["cedar","sandalwood","mahogany","oak","teak","wood","woody","patchouli","vetiver","amberwood","guaiac"],
    fresh:  ["fresh","breeze","linen","ozonic","marine","rain","dew","mint","eucalyptus","herbal","green"],
    spicy:  ["spice","spicy","clove","nutmeg","cardamom","cinnamon","pepper","anise","saffron","ginger"],
    citrus: ["citrus","bergamot","lemon","lime","orange","mandarin","grapefruit","yuzu","neroli"],
    sweet:  ["sweet","vanilla","tonka","caramel","sugar","honey","marshmallow","praline","cotton","cream"],
    smoky:  ["smoke","smoky","smoked","incense","ember","ash","char","fireside","oud","leather","tar"],
  };
  
  const STRENGTH_UP = ["strong","bold","intense","throw","powerful","rich","heavy","room-filling","potent"];
  const STRENGTH_DOWN = ["light","soft","subtle","gentle","whisper","airy","delicate","faint","sheer"];
  
  function scoreTerms(text, terms) {
    let s = 0;
    for (const t of terms) {
      // count whole-word-ish matches; weights small boosts
      const m = text.match(new RegExp(`\\b${escapeRegExp(t)}\\b`, "gi"));
      if (m) s += m.length;
    }
    return s;
  }
  
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  
  function normalizeTo5(n, max = 6) {
    if (n <= 0) return 0;
    // cap then map linearly into 1..5-ish
    const capped = Math.min(n, max);
    // spread: 0..max -> 0..5
    return Math.round((capped / max) * 5);
  }
  
  function inferStrength(text) {
    let s = 3;
    s += scoreTerms(text, STRENGTH_UP) * 0.5;
    s -= scoreTerms(text, STRENGTH_DOWN) * 0.5;
    return Math.max(0, Math.min(5, Math.round(s)));
  }
  
  /** Convert free text into a scent profile (0–5 per axis). */
  export function profileFromText(input = "") {
    const text = String(input || "").toLowerCase();
  
    const raw = {
      floral: scoreTerms(text, DICTS.floral),
      fruity: scoreTerms(text, DICTS.fruity),
      woody:  scoreTerms(text, DICTS.woody),
      fresh:  scoreTerms(text, DICTS.fresh),
      spicy:  scoreTerms(text, DICTS.spicy),
      citrus: scoreTerms(text, DICTS.citrus),
      sweet:  scoreTerms(text, DICTS.sweet),
      smoky:  scoreTerms(text, DICTS.smoky),
    };
  
    // pick a divisor that keeps things readable
    const maxBucket = Math.max(6, ...Object.values(raw));
    const profile = {
      floral: normalizeTo5(raw.floral, maxBucket),
      fruity: normalizeTo5(raw.fruity, maxBucket),
      woody:  normalizeTo5(raw.woody,  maxBucket),
      fresh:  normalizeTo5(raw.fresh,  maxBucket),
      spicy:  normalizeTo5(raw.spicy,  maxBucket),
      citrus: normalizeTo5(raw.citrus, maxBucket),
      sweet:  normalizeTo5(raw.sweet,  maxBucket),
      smoky:  normalizeTo5(raw.smoky,  maxBucket),
      strength: inferStrength(text),
    };
  
    return profile;
  }
  
  // Optional default export if you ever import it that way
  export default { profileFromText };
  