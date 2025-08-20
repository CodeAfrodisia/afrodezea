// src/lib/shopify.js
const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_DOMAIN;               // e.g. mystore.myshopify.com
const STOREFRONT_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;   // Storefront API access token

if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
  console.warn("[Shopify] Missing VITE_SHOPIFY_DOMAIN or VITE_SHOPIFY_STOREFRONT_TOKEN");
}

async function shopifyFetch(query, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
    if (!res.ok || json.errors) {
    console.error(json.errors || res.statusText);
    throw new Error("Shopify error");
  }
  return json.data;
}

  /* // GraphQL-level errors (query/mutation errors)
  if (json.errors?.length) {
    console.error("[Shopify] GraphQL errors:", json.errors);
    throw new Error(json.errors[0]?.message || "Shopify GraphQL error");
  }

  return json.data;
}
 */
/* =========================
 * READ: products & product
 * ========================= */

export async function fetchProducts({ first = 24 } = {}) {
  const q = `
    query Products($first: Int!) {
      products(first: $first, sortKey: TITLE) {
        nodes {
          id
          handle
          title
          description
          descriptionHtml
          featuredImage { url altText width height }
          images(first: 4) { nodes { url altText width height } }
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          options { name values }
          variants(first: 50) {
            nodes {
              id
              title
              availableForSale
              selectedOptions { name value }
              price { amount currencyCode }
              compareAtPrice { amount currencyCode }
            }
          }
          collections(first: 10) { nodes { id handle title } }
        }
      }
    }
  `;
  const data = await shopifyFetch(q, { first });
  return data.products?.nodes ?? [];
}

export async function fetchProductByHandle(handle) {
  const q = `
    query Product($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        featuredImage { url altText width height }
        images(first: 10) { nodes { url altText width height } }
        options { name values }
        variants(first: 50) {
          nodes {
            id
            title
            availableForSale
            selectedOptions { name value }
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
          }
        }
      }
    }
  `;
  const data = await shopifyFetch(q, { handle });
  return data.product;
}

/* =========================
 * WRITE: checkout create
 * =========================
 * Use when your cart items include REAL Shopify variant IDs.
 * Returns a webUrl for redirect.
 */

export async function cartCreate(lines = []) {
  const q = `
    mutation CreateCart($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyFetch(q, { lines });
  const err = data.cartCreate?.userErrors?.[0]?.message;
  if (err) throw new Error(err);
  return data.cartCreate.cart;
}


/* export async function checkoutCreate(lines) {
  // lines: [{ variantId: "gid://shopify/ProductVariant/123", quantity: 1 }, ...]
  const q = `
    mutation CheckoutCreate($lines: [CheckoutLineItemInput!]!) {
      checkoutCreate(input: { lineItems: $lines }) {
        checkout { id webUrl }
        userErrors { field message }
      }
    }
  `;
  const data = await shopifyFetch(q, { lines });
  const errs = data?.checkoutCreate?.userErrors;
  if (errs?.length) throw new Error(errs[0].message || "Checkout failed");
  const url = data?.checkoutCreate?.checkout?.webUrl;
  if (!url) throw new Error("No checkout URL returned");
  return url;
} */

/**
 * Optional helper:
 * Convert your cart context items into Storefront “lines”.
 * Expects each item to carry item.variantId (Shopify GID) and qty.
 */
export function cartToCheckoutLines(cartItems = []) {
  return cartItems
    .filter(i => i.variantId && i.qty > 0)
    .map(i => ({ variantId: i.variantId, quantity: i.qty }));
}
