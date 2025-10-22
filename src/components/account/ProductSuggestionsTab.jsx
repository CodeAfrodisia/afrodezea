// src/components/account/ProductSuggestionsTab.jsx
import { useEffect, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { PRODUCT_LIBRARY } from "@productLibrary.js";

export default function ProductSuggestionsTab({ userId }) {
  const [mood, setMood] = useState("neutral");
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const { data, error } = await supabase
        .from("moods")
        .select("mood, created_at")
        .eq("user_id", userId)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);

      const moodResult = data?.[0]?.mood || "neutral";
      setMood(moodResult);
      setProducts(PRODUCT_LIBRARY[moodResult] || PRODUCT_LIBRARY.neutral);
    })();
  }, [userId]);

  if (!userId) return <div className="surface" style={{padding:18}}>Loading product suggestions…</div>;

  return (
    <div className="surface" style={{ padding: 18 }}>
      <h2>Suggested Products for Your Mood ({mood})</h2>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12, marginTop:12 }}>
        {products.map((p, i) => (
          <div key={i} className="card">
            <h3>{p.name}</h3>
            <small>{p.type}</small>
            <p>{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

