export function formatCents(cents = 0, currency = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency })
    .format((cents || 0) / 100);
}

