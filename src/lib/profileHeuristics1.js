// src/lib/profileHeuristics.js
const WORDS = {
  floral:  ["rose","jasmine","lily","violet","gardenia","floral","bouquet","petal"],
  fruity:  ["berry","pear","apple","peach","plum","fruit","fruity","fig"],
  citrus:  ["citrus","lemon","lime","orange","bergamot","grapefruit","yuzu"],
  fresh:   ["fresh","linen","ocean","marine","rain","clean","mint"],
  woody:   ["cedar","oak","sandalwood","mahogany","pine","wood","woody"],
  spicy:   ["spice","spicy","clove","cinnamon","cardamom","pepper","nutmeg"],
  sweet:   ["vanilla","caramel","sugar","sweet","tonka","honey"],
  smoky:   ["smoke","smoky","incense","ember","fireside","tar"],
};

export function profileFromText(text = "") {
  const t = text.toLowerCase();
  const score = Object.fromEntries(Object.keys(WORDS).map(k => [k, 0]));
  Object.entries(WORDS).forEach(([k, arr]) => {
    arr.forEach(word => { if (t.includes(word)) score[k] += 1; });
  });
  // normalize to 0..5
  const max = Math.max(1, ...Object.values(score));
  const scaled = {};
  for (const k in score) scaled[k] = +(score[k] ? (score[k] / max) * 4 + 1 : 0).toFixed(1);
  return scaled;
}

