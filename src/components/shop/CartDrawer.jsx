import React from "react"
import { useCart } from "../../context/CartContext.jsx"
import { cartCreate } from "../../lib/shopify.js";

async function checkoutShopify(items) {
  if (!items?.length) return;

  try {
    // Build cart lines in Shopify's expected shape
    const lines = items.map(it => ({
      quantity: it.qty,
      merchandiseId: it.variantId || it.productId, 
    }));

    const cart = await cartCreate(lines);
    if (cart?.checkoutUrl) {
      window.location.href = cart.checkoutUrl;
    } else {
      alert("Could not create Shopify checkout.");
    }
  } catch (e) {
    console.error(e);
    alert("Checkout failed: " + (e.message || "Unknown error"));
  }
}


function formatCurrency(amount, currency = "USD") {
  try { return new Intl.NumberFormat(undefined, { style:"currency", currency }).format(amount) }
  catch { return `$${Number(amount).toFixed(2)}` }
}

export default function CartDrawer() {
  const { items, remove, setQty, clear, isOpen, setOpen, subtotal } = useCart()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position:"fixed", inset:0,
          background:"rgba(0,0,0,0.5)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition:"opacity .2s",
          zIndex: 90,
        }}
      />
      {/* Panel */}
      <aside
        style={{
          position:"fixed", top:0, right:0, bottom:0, width:380,
          background:"#111", borderLeft:"1px solid #222",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition:"transform .25s ease",
          zIndex: 100, display:"flex", flexDirection:"column"
        }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 16px", borderBottom:"1px solid #222", color:"#eee" }}>
          <strong>Your Bag</strong>
          <button onClick={() => setOpen(false)} style={{ background:"transparent", border:"1px solid #333", color:"#eee", padding:"6px 10px", borderRadius:8 }}>Close</button>
        </div>

        <div style={{ flex:1, overflow:"auto", padding:16 }}>
          {!items.length ? (
            <div style={{ color:"#aaa" }}>Your bag is empty.</div>
          ) : items.map(it => (
            <div key={it.variantId} style={{ display:"grid", gridTemplateColumns:"64px 1fr auto", gap:12, padding:"12px 0", borderBottom:"1px solid #1e1e1e" }}>
              <div style={{ width:64, height:64, background:"#0a0a0a", borderRadius:8, overflow:"hidden" }}>
                {it.image?.url ? <img src={it.image.url} alt={it.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : null}
              </div>
              <div style={{ color:"#eee" }}>
                <div style={{ fontWeight:700 }}>{it.title}</div>
                {it.variantTitle ? <div style={{ fontSize:12, color:"#aaa" }}>{it.variantTitle}</div> : null}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
                  <button onClick={() => setQty(it.variantId, it.qty - 1)} style={btnSm}>−</button>
                  <span style={{ minWidth:24, textAlign:"center" }}>{it.qty}</span>
                  <button onClick={() => setQty(it.variantId, it.qty + 1)} style={btnSm}>+</button>
                </div>
              </div>
              <div style={{ textAlign:"right", color:"#eee" }}>
                <div>{formatCurrency(Number(it.price?.amount ?? 0) * it.qty, it.price?.currencyCode)}</div>
                <button onClick={() => remove(it.variantId)} style={{ ...btnSm, marginTop:8 }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding:16, borderTop:"1px solid #222", color:"#eee" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={clear} style={{ ...btnBase, background:"#1a1a1a", color:"#eee", border:"1px solid #333" }}>Clear</button>
            <button
  className="btn btn--gold"
  onClick={() => checkoutShopify(items)}
>
  Checkout
</button>

          </div>
        </div>
      </aside>
    </>
  )
}

const btnBase = { flex:1, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer" }
const btnSm = { padding:"6px 10px", borderRadius:8, border:"1px solid #333", background:"#1a1a1a", color:"#eee", cursor:"pointer" }
