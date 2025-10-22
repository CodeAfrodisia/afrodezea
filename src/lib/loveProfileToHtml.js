// /src/lib/loveProfileToHtml.js
export function loveProfileToHtml(obj) {
  if (!obj || typeof obj !== "object") return "<div>—</div>";
  const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  const pill = (p) => `<div class="pill" style="display:flex;gap:6px;align-items:center">
    <span style="opacity:.8">${esc(p.label)}:</span>
    <strong>${esc(p.value ?? "—")}</strong>
    <span style="opacity:.6;font-size:.9em">(${esc(p.source || "")})</span>
  </div>`;

  const mp = (m) => m ? `<p><strong>Micro-practice (~${esc(m.minutes)} min):</strong> ${esc(m.text)}</p>` : "";

  const s = obj.sections || {};
  const parts = [];

  // summary ribbon
  parts.push(`
    <section class="love-summary" style="padding:12px">
      ${obj.summary?.ribbon ? `<p style="margin:0 0 6px 0">${esc(obj.summary.ribbon)}</p>` : ""}
      ${Array.isArray(obj.pillars) ? `<div style="display:grid;gap:6px">${obj.pillars.map(pill).join("")}</div>` : ""}
    </section>
  `);

  // sections
  if (s.how_you_love) {
    parts.push(`
      <section style="padding:12px">
        <h4 style="margin:0">How You Love</h4>
        ${s.how_you_love.strength ? `<p><strong>Strength:</strong> ${esc(s.how_you_love.strength)}</p>` : ""}
        ${s.how_you_love.watchout ? `<p><strong>Watch-out:</strong> ${esc(s.how_you_love.watchout)}</p>` : ""}
        ${s.how_you_love.archetype_line ? `<p>${esc(s.how_you_love.archetype_line)}</p>` : ""}
      </section>
    `);
  }

  if (s.repair_and_trust) {
    parts.push(`
      <section style="padding:12px">
        <h4 style="margin:0">Repair & Trust</h4>
        ${s.repair_and_trust.strength ? `<p><strong>Strength:</strong> ${esc(s.repair_and_trust.strength)}</p>` : ""}
        ${s.repair_and_trust.watchout ? `<p><strong>Watch-out:</strong> ${esc(s.repair_and_trust.watchout)}</p>` : ""}
        ${mp(s.repair_and_trust.micro_practice)}
        ${s.repair_and_trust.partner_script ? `<p><strong>Partner script:</strong> ${esc(s.repair_and_trust.partner_script)}</p>` : ""}
      </section>
    `);
  }

  if (s.receiving_care) {
    parts.push(`
      <section style="padding:12px">
        <h4 style="margin:0">Receiving Care</h4>
        ${s.receiving_care.tip ? `<p>${esc(s.receiving_care.tip)}</p>` : ""}
        ${mp(s.receiving_care.micro_practice)}
        ${s.receiving_care.partner_script ? `<p><strong>Partner script:</strong> ${esc(s.receiving_care.partner_script)}</p>` : ""}
      </section>
    `);
  }

  if (s.giving_care) {
    parts.push(`
      <section style="padding:12px">
        <h4 style="margin:0">Giving Care</h4>
        ${s.giving_care.tip ? `<p>${esc(s.giving_care.tip)}</p>` : ""}
        ${mp(s.giving_care.micro_practice)}
        ${s.giving_care.partner_script ? `<p><strong>Partner script:</strong> ${esc(s.giving_care.partner_script)}</p>` : ""}
      </section>
    `);
  }

  // weaving
  if (obj.weaving && (obj.weaving.principles?.length || obj.weaving.experiment_7day?.length || obj.weaving.notes?.length)) {
    parts.push(`
      <section style="padding:12px">
        <h4 style="margin:0">Weaving the Threads</h4>
        ${Array.isArray(obj.weaving.principles) ? `<ul>${obj.weaving.principles.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${Array.isArray(obj.weaving.experiment_7day) ? `<div style="margin-top:6px"><strong>7-day experiment:</strong><ul>${obj.weaving.experiment_7day.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${Array.isArray(obj.weaving.notes) ? `<div style="margin-top:6px;opacity:.85">${obj.weaving.notes.map(x=>`<div>${esc(x)}</div>`).join("")}</div>` : ""}
      </section>
    `);
  }

  return `<div class="love-profile" style="display:grid;gap:12px">${parts.join("")}</div>`;
}

