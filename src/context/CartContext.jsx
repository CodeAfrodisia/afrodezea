import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

const CartCtx = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem("cart:v1")
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem("cart:v1", JSON.stringify(items)) } catch {}
  }, [items])

  const add = (entry) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.variantId === entry.variantId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + (entry.qty ?? 1) }
        return next
      }
      return [...prev, { ...entry, qty: entry.qty ?? 1 }]
    })
    setOpen(true)
  }

  const remove = (variantId) => setItems(prev => prev.filter(p => p.variantId !== variantId))
  const setQty = (variantId, qty) => setItems(prev => prev.map(p => p.variantId === variantId ? { ...p, qty: Math.max(1, qty|0) } : p))
  const clear = () => setItems([])

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.price?.amount ?? 0) * it.qty, 0)
  }, [items])

  const value = useMemo(() => ({
    items, add, remove, setQty, clear,
    isOpen, setOpen,
    subtotal
  }), [items, subtotal, isOpen])

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

export function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
