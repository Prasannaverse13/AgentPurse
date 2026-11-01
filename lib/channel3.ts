// Channel3 product search. Agents use it to find what to buy and where it is cheapest.
// Live: POST https://api.trychannel3.com/v1/search with the x-api-key header.
// With no CHANNEL3_API_KEY it serves a small built in catalog so the demo still works.

const KEY = process.env.CHANNEL3_API_KEY || '';
const BASE = 'https://api.trychannel3.com';

export const channel3Mode = (): 'live' | 'mock' => (KEY ? 'live' : 'mock');

export type Offer = {
  merchant: string; // pretty name, used for allow list matching
  domain: string;
  price: number;
  currency: string;
  url: string; // affiliate tracked product link
  inStock: boolean;
};

export type Product = {
  id: string;
  title: string;
  brand: string | null;
  image: string | null;
  offers: Offer[];
};

export function merchantName(domain: string) {
  const first = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[./]/)[0] || domain;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

type C3Search = {
  products?: {
    id: string;
    title: string;
    brands?: { name: string }[];
    images?: { url: string; is_main_image?: boolean }[];
    offers?: { url: string; domain: string; price: { price: number; currency: string }; availability?: string }[];
  }[];
};

async function live(query: string, maxPrice: number | undefined, limit: number): Promise<Product[]> {
  const res = await fetch(`${BASE}/v1/search`, {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      limit: Math.min(30, Math.max(1, limit)),
      ...(maxPrice ? { filters: { price: { max_price: maxPrice } } } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Channel3 search failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as C3Search;
  return (j.products ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    brand: p.brands?.[0]?.name ?? null,
    image: (p.images?.find((i) => i.is_main_image) ?? p.images?.[0])?.url ?? null,
    offers: (p.offers ?? []).map((o) => ({
      merchant: merchantName(o.domain),
      domain: o.domain,
      price: o.price.price,
      currency: o.price.currency,
      url: o.url,
      inStock: o.availability !== 'OutOfStock',
    })),
  }));
}

/* ---------- Mock catalog ---------- */

const o = (domain: string, price: number): Offer => ({
  merchant: merchantName(domain), domain, price, currency: 'USD', url: `https://${domain}/demo-product`, inStock: true,
});

const catalog: (Product & { tags: string })[] = [
  { id: 'mock_paper', title: 'Copy paper 10 reams', brand: 'HP', image: null, tags: 'paper copy printer reams office', offers: [o('staples.com', 42.99), o('amazon.com', 39.5), o('walmart.com', 41.2)] },
  { id: 'mock_coffee', title: 'Coffee beans 2 kg', brand: 'Lavazza', image: null, tags: 'coffee beans kitchen espresso', offers: [o('target.com', 31.2), o('amazon.com', 34), o('walmart.com', 32.4)] },
  { id: 'mock_desk', title: 'Electric standing desk', brand: 'FlexiSpot', image: null, tags: 'standing desk electric furniture office sit stand', offers: [o('amazon.com', 589), o('deskdealz.shop', 299), o('staples.com', 549)] },
  { id: 'mock_chair', title: 'Ergonomic office chair', brand: 'Branch', image: null, tags: 'chair ergonomic office furniture', offers: [o('staples.com', 194.99), o('amazon.com', 189), o('target.com', 199)] },
  { id: 'mock_cables', title: 'USB C cable 5 pack', brand: 'Anker', image: null, tags: 'usb cable cables charger usbc', offers: [o('amazon.com', 18.75), o('target.com', 21.99)] },
  { id: 'mock_markers', title: 'Whiteboard markers 12 pack', brand: 'Expo', image: null, tags: 'whiteboard markers pens stationery', offers: [o('staples.com', 12.4), o('amazon.com', 13.1)] },
  { id: 'mock_mouse', title: 'Wireless mouse', brand: 'Logitech', image: null, tags: 'mouse wireless computer accessory', offers: [o('amazon.com', 24.99), o('target.com', 27.99), o('staples.com', 26.5)] },
  { id: 'mock_monitor', title: '27 inch 4K monitor', brand: 'Dell', image: null, tags: 'monitor screen display 4k computer', offers: [o('amazon.com', 329), o('staples.com', 349.99), o('screenmart.store', 199)] },
  { id: 'mock_headphones', title: 'Noise cancelling headphones', brand: 'Sony', image: null, tags: 'headphones noise cancelling audio', offers: [o('amazon.com', 278), o('target.com', 299.99)] },
  { id: 'mock_lamp', title: 'LED desk lamp', brand: 'BenQ', image: null, tags: 'lamp desk led light office', offers: [o('target.com', 34.99), o('amazon.com', 32.5)] },
  { id: 'mock_giftcard', title: 'Gift card bundle 4 x 25', brand: 'Visa', image: null, tags: 'gift card cards giftcard voucher', offers: [o('amazon.com', 104), o('bestdeals.biz', 99)] },
];

function mock(query: string, maxPrice: number | undefined, limit: number): Product[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !['and', 'the', 'for', 'with', 'under', 'cheap', 'best'].includes(w));
  return catalog
    .map((p) => ({ p, score: words.filter((w) => `${p.title} ${p.brand} ${p.tags}`.toLowerCase().includes(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => ({ id: p.id, title: p.title, brand: p.brand, image: p.image, offers: p.offers.filter((of) => !maxPrice || of.price <= maxPrice) }))
    .filter((p) => p.offers.length)
    .slice(0, limit);
}

export async function searchProducts(query: string, opts: { maxPrice?: number; limit?: number } = {}): Promise<Product[]> {
  const limit = Math.min(10, Math.max(1, opts.limit ?? 5));
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  const products = KEY ? await live(q, opts.maxPrice, limit) : mock(q, opts.maxPrice, limit);
  return products.map((p) => ({ ...p, offers: p.offers.filter((x) => x.inStock).sort((a, b) => a.price - b.price).slice(0, 5) })).filter((p) => p.offers.length);
}
