// src/lib/adiClient.js
export async function fetchArchetypeDeep(supabase, userId, { include_journals = false, days = 30 } = {}) {
  if (!userId) throw new Error("userId required");

  const base = `${supabase?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL}/functions/v1/archetype-deep-insights`;

  // 1) Cache-only fast path
  const peek = await fetch(`${base}?cache_only=1&user_id=${encodeURIComponent(userId)}&days=${days}&include_journals=${include_journals ? "true" : "false"}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (peek.status === 200) {
    return await peek.json(); // { insights, cached:true, signature }
  }
  if (peek.status !== 202) {
    // Some other error surfaced
    const t = await peek.text().catch(() => "");
    throw new Error(`peek failed: ${peek.status} ${t}`);
  }

  // 2) Generate (single POST), with snake_case keys
  const post = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      include_journals,
      days,
    }),
  });
  if (!post.ok) {
    const t = await post.text().catch(() => "");
    throw new Error(`generate failed: ${post.status} ${t}`);
  }
  return await post.json(); // { insights, cached:false, signature }
}

