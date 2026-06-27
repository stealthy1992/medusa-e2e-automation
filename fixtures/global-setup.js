'use strict';

/**
 * global-setup.js
 * Runs once before the entire Playwright test suite.
 * Seeds all data required by tests:
 *   - 2 collections (Shirts, Bottoms)
 *   - 2 categories (Tops, Accessories)
 *   - 14 products across collections/categories (4 already seeded → 10 new)
 *   - 1 test customer (customer@test.com)
 *   - 1 promo code (TEST10 — 10% off)
 *
 * Idempotent: checks if items already exist before creating them.
 * Writes seed data summary to fixtures/seed-data.json for reference in tests.
 */

const { request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = process.env.BACKEND_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@test.com';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'Customer12345';
const PROMO_CODE = process.env.PROMO_CODE || 'TEST10';

// Output file — tests can import this to get seeded IDs
const SEED_DATA_PATH = path.resolve(__dirname, 'seed-data.json');

// ── Product definitions ───────────────────────────────────────────────────────
// 4 original Medusa seed products are already in DB (Sweatshirt, T-Shirt, Sweatpants, Shorts)
// 10 custom products seeded manually — listed here for idempotency checks only.
// Handles match what Medusa auto-generated when products were first created.
//
// Medusa V2 REST API variant options format: [{ value: "..." }] — positional,
// matching the order of the product-level options array.
const PRODUCTS_TO_SEED = [
  // ── Tops / Shirts ──────────────────────────────────────────────────────────
  {
    title: 'Orion Shirt',
    handle: 'orion-shirt',
    description: 'A cool shirt.',
    status: 'published',
    collectionKey: 'shirts',
    categoryKey: 'tops',
    options: [{ title: 'Color' }],
    variants: [
      { title: 'Black Shirt',  prices: [{ amount: 3000, currency_code: 'usd' }], options: [{ value: 'Black' }] },
      { title: 'White Shirt',  prices: [{ amount: 3000, currency_code: 'usd' }], options: [{ value: 'White' }] },
    ],
  },
  {
    title: 'Nova Hoodie',
    handle: 'nova-hoodie',
    description: 'A cozy hoodie available in multiple sizes.',
    status: 'published',
    collectionKey: 'shirts',
    categoryKey: 'tops',
    options: [{ title: 'Size' }],
    variants: [
      { title: 'Small Hoodie',  prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'S' }] },
      { title: 'Medium Hoodie', prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'M' }] },
      { title: 'Large Hoodie',  prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'L' }] },
      { title: 'XL Hoodie',     prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'XL' }] },
    ],
  },
  {
    title: 'Astra Polo',
    handle: 'astra-polo',
    description: 'A clean polo in fresh seasonal colors.',
    status: 'published',
    collectionKey: 'shirts',
    categoryKey: 'tops',
    options: [{ title: 'Color' }],
    variants: [
      { title: 'Green Polo', prices: [{ amount: 3200, currency_code: 'usd' }], options: [{ value: 'Green' }] },
      { title: 'Beige Polo', prices: [{ amount: 3200, currency_code: 'usd' }], options: [{ value: 'Beige' }] },
    ],
  },
  {
    title: 'Zenith Tank Top',
    handle: 'zenith-tank-top',
    description: 'Lightweight tank top for warm days.',
    status: 'published',
    collectionKey: 'shirts',
    categoryKey: 'tops',
    options: [{ title: 'Size' }],
    variants: [
      { title: 'Small Tank Top',  prices: [{ amount: 2000, currency_code: 'usd' }], options: [{ value: 'S' }] },
      { title: 'Medium Tank Top', prices: [{ amount: 2000, currency_code: 'usd' }], options: [{ value: 'M' }] },
      { title: 'Large Tank Top',  prices: [{ amount: 2000, currency_code: 'usd' }], options: [{ value: 'L' }] },
    ],
  },
  // ── Bottoms ────────────────────────────────────────────────────────────────
  {
    title: 'Atlas Joggers',
    handle: 'atlas-joggers',
    description: 'Comfortable joggers in neutral tones.',
    status: 'published',
    collectionKey: 'bottoms',
    categoryKey: null,
    options: [{ title: 'Color' }],
    variants: [
      { title: 'Charcoal Joggers', prices: [{ amount: 3500, currency_code: 'usd' }], options: [{ value: 'Charcoal' }] },
      { title: 'Olive Joggers',    prices: [{ amount: 3500, currency_code: 'usd' }], options: [{ value: 'Olive' }] },
    ],
  },
  {
    title: 'Helios Chinos',
    handle: 'helios-chinos',
    description: 'Smart chinos in a relaxed fit.',
    status: 'published',
    collectionKey: 'bottoms',
    categoryKey: null,
    options: [{ title: 'Size' }],
    variants: [
      { title: 'Small Chinos',  prices: [{ amount: 4000, currency_code: 'usd' }], options: [{ value: 'S' }] },
      { title: 'Medium Chinos', prices: [{ amount: 4000, currency_code: 'usd' }], options: [{ value: 'M' }] },
      { title: 'Large Chinos',  prices: [{ amount: 4000, currency_code: 'usd' }], options: [{ value: 'L' }] },
      { title: 'XL Chinos',     prices: [{ amount: 4000, currency_code: 'usd' }], options: [{ value: 'XL' }] },
    ],
  },
  {
    title: 'Luna Cargo Pants',
    handle: 'luna-cargo-pants',
    description: 'Utility cargo pants with plenty of pockets.',
    status: 'published',
    collectionKey: 'bottoms',
    categoryKey: null,
    options: [{ title: 'Color' }],
    variants: [
      { title: 'Sand Cargo Pants',   prices: [{ amount: 4200, currency_code: 'usd' }], options: [{ value: 'Sand' }] },
      { title: 'Forest Cargo Pants', prices: [{ amount: 4200, currency_code: 'usd' }], options: [{ value: 'Forest' }] },
    ],
  },
  // ── Accessories ────────────────────────────────────────────────────────────
  {
    title: 'Vega Cap',
    handle: 'vega-cap',
    description: 'Structured cap in classic silhouette.',
    status: 'published',
    collectionKey: null,
    categoryKey: 'accessories',
    options: [{ title: 'Size' }],
    variants: [
      { title: 'Small Cap',  prices: [{ amount: 1500, currency_code: 'usd' }], options: [{ value: 'S' }] },
      { title: 'Medium Cap', prices: [{ amount: 1500, currency_code: 'usd' }], options: [{ value: 'M' }] },
      { title: 'Large Cap',  prices: [{ amount: 1500, currency_code: 'usd' }], options: [{ value: 'L' }] },
    ],
  },
  {
    title: 'Sirius Beanie',
    handle: 'sirius-beanie',
    description: 'Ribbed knit beanie for cold weather.',
    status: 'published',
    collectionKey: null,
    categoryKey: 'accessories',
    options: [{ title: 'Color' }],
    variants: [
      { title: 'Gray Beanie',   prices: [{ amount: 1800, currency_code: 'usd' }], options: [{ value: 'Gray' }] },
      { title: 'Maroon Beanie', prices: [{ amount: 1800, currency_code: 'usd' }], options: [{ value: 'Maroon' }] },
    ],
  },
  {
    title: 'Aurora Tote Bag',
    handle: 'aurora-tote-bag',
    description: 'Spacious canvas tote for everyday carry.',
    status: 'published',
    collectionKey: null,
    categoryKey: 'accessories',
    options: [{ title: 'Size' }],
    variants: [
      { title: 'Standard Tote Bag', prices: [{ amount: 2500, currency_code: 'usd' }], options: [{ value: 'Standard' }] },
      { title: 'XL Tote Bag',       prices: [{ amount: 2800, currency_code: 'usd' }], options: [{ value: 'XL' }] },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[global-setup] ${msg}`);
}

async function assertOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`[global-setup] ${label} failed — HTTP ${res.status()}: ${body}`);
  }
  return res.json();
}

async function getAdminToken(ctx) {
  const res = await ctx.post(`${BACKEND_URL}/auth/user/emailpass`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const data = await assertOk(res, 'admin login');
  return data.token;
}

function adminHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Collection seeding ────────────────────────────────────────────────────────

async function ensureCollections(ctx, token) {
  const res = await ctx.get(`${BACKEND_URL}/admin/collections?limit=50`, { headers: adminHeaders(token) });
  const data = await assertOk(res, 'list collections');
  const existing = data.collections || [];

  const collections = {};

  const desired = [
    { key: 'shirts', title: 'Shirts', handle: 'shirts' },
    { key: 'bottoms', title: 'Bottoms', handle: 'bottoms' },
  ];

  for (const col of desired) {
    const found = existing.find(c => c.handle === col.handle);
    if (found) {
      log(`Collection already exists: ${col.title} (${found.id})`);
      collections[col.key] = found.id;
    } else {
      const createRes = await ctx.post(`${BACKEND_URL}/admin/collections`, {
        data: { title: col.title, handle: col.handle },
        headers: adminHeaders(token),
      });
      const created = await assertOk(createRes, `create collection ${col.title}`);
      log(`Created collection: ${col.title} (${created.collection.id})`);
      collections[col.key] = created.collection.id;
    }
  }

  return collections;
}

// ── Category seeding ──────────────────────────────────────────────────────────

async function ensureCategories(ctx, token) {
  const res = await ctx.get(`${BACKEND_URL}/admin/product-categories?limit=50`, { headers: adminHeaders(token) });
  const data = await assertOk(res, 'list categories');
  const existing = data.product_categories || [];

  const categories = {};

  const desired = [
    { key: 'tops', name: 'Tops', handle: 'tops' },
    { key: 'accessories', name: 'Accessories', handle: 'accessories' },
  ];

  for (const cat of desired) {
    const found = existing.find(c => c.handle === cat.handle);
    if (found) {
      log(`Category already exists: ${cat.name} (${found.id})`);
      categories[cat.key] = found.id;
    } else {
      const createRes = await ctx.post(`${BACKEND_URL}/admin/product-categories`, {
        data: { name: cat.name, handle: cat.handle, is_active: true, is_internal: false },
        headers: adminHeaders(token),
      });
      const created = await assertOk(createRes, `create category ${cat.name}`);
      log(`Created category: ${cat.name} (${created.product_category.id})`);
      categories[cat.key] = created.product_category.id;
    }
  }

  return categories;
}

// ── Product seeding ───────────────────────────────────────────────────────────

async function ensureProducts(ctx, token, collections, categories) {
  // Explicitly request id+handle+title — Medusa V2 field selection means
  // handle is not always returned in the default field set.
  const res = await ctx.get(
    `${BACKEND_URL}/admin/products?limit=100&fields=id,handle,title`,
    { headers: adminHeaders(token) }
  );
  const data = await assertOk(res, 'list products');
  const existing = data.products || [];

  // Debug: log first product so we can verify handle is actually present
  if (existing.length > 0) {
    log(`Sample existing product: ${JSON.stringify({ id: existing[0].id, handle: existing[0].handle, title: existing[0].title })}`);
  }

  // Build lookup maps — match by handle (primary) OR title (fallback)
  const existingByHandle = new Map(existing.filter(p => p.handle).map(p => [p.handle, p]));
  const existingByTitle  = new Map(existing.map(p => [p.title, p]));

  log(`Found ${existing.length} existing products (${existingByHandle.size} with handles)`);

  const seededProducts = [];

  for (const def of PRODUCTS_TO_SEED) {
    // Check by handle first, then fall back to title
    const found = existingByHandle.get(def.handle) || existingByTitle.get(def.title);

    if (found) {
      log(`Product already exists: ${def.title} — handle: ${found.handle} (${found.id})`);
      seededProducts.push({ id: found.id, handle: found.handle, title: found.title });
      continue;
    }

    const payload = {
      title: def.title,
      handle: def.handle,
      description: def.description,
      status: def.status,
      options: def.options,
      variants: def.variants,
    };

    if (def.collectionKey && collections[def.collectionKey]) {
      payload.collection_id = collections[def.collectionKey];
    }
    if (def.categoryKey && categories[def.categoryKey]) {
      payload.categories = [{ id: categories[def.categoryKey] }];
    }

    const createRes = await ctx.post(`${BACKEND_URL}/admin/products`, {
      data: payload,
      headers: adminHeaders(token),
    });
    const created = await assertOk(createRes, `create product ${def.title}`);
    log(`Created product: ${def.title} (${created.product.id})`);
    seededProducts.push({ id: created.product.id, handle: created.product.handle, title: created.product.title });
  }

  // Include any existing products not in PRODUCTS_TO_SEED in the seed-data.json output
  for (const p of existing) {
    if (!seededProducts.find(sp => sp.id === p.id)) {
      seededProducts.push({ id: p.id, handle: p.handle, title: p.title });
    }
  }

  return seededProducts;
}

// ── Customer seeding ──────────────────────────────────────────────────────────

async function ensureCustomer(ctx, token) {
  // Check existence via admin API (read-only — this endpoint is fine with Bearer token)
  const res = await ctx.get(
    `${BACKEND_URL}/admin/customers?limit=50`,
    { headers: adminHeaders(token) }
  );
  const data = await assertOk(res, 'list customers');
  const existing = (data.customers || []).find(c => c.email === CUSTOMER_EMAIL);

  if (existing) {
    log(`Customer already exists: ${CUSTOMER_EMAIL} (${existing.id})`);
    return existing;
  }

  // Medusa V2 customer registration is a two-step process:
  // Step 1 — Register auth identity via /auth/customer/emailpass
  //           This creates the auth record and returns a JWT.
  const authRes = await ctx.post(`${BACKEND_URL}/auth/customer/emailpass/register`, {
    data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
  });
  const authData = await assertOk(authRes, 'register customer auth identity');
  const customerToken = authData.token;

  // Step 2 — Create the customer profile via /store/customers
  //           Requires the customer JWT + publishable API key.
  const profileRes = await ctx.post(`${BACKEND_URL}/store/customers`, {
    data: { first_name: 'Test', last_name: 'Customer', email: CUSTOMER_EMAIL },
    headers: {
      Authorization: `Bearer ${customerToken}`,
      'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
      'Content-Type': 'application/json',
    },
  });
  const profileData = await assertOk(profileRes, `create customer profile ${CUSTOMER_EMAIL}`);
  log(`Created customer: ${CUSTOMER_EMAIL} (${profileData.customer.id})`);
  return profileData.customer;
}

// ── Promo code seeding ────────────────────────────────────────────────────────

async function ensurePromoCode(ctx, token) {
  const res = await ctx.get(`${BACKEND_URL}/admin/promotions?limit=50`, { headers: adminHeaders(token) });
  const data = await assertOk(res, 'list promotions');
  const existing = (data.promotions || []).find(p => p.code === PROMO_CODE);

  if (existing) {
    log(`Promo code already exists: ${PROMO_CODE} (${existing.id})`);
    return existing;
  }

  // Medusa V2 REST API — minimal payload only, no internal SDK fields.
  // apply_to_cart_rules / target_rules are module-level concepts, not REST API fields.
  const createRes = await ctx.post(`${BACKEND_URL}/admin/promotions`, {
    data: {
      code: PROMO_CODE,
      type: 'standard',
      is_automatic: false,
      application_method: {
        type: 'percentage',
        target_type: 'items',
        allocation: 'across',
        value: 10,
      },
    },
    headers: adminHeaders(token),
  });
  const created = await assertOk(createRes, `create promo ${PROMO_CODE}`);
  log(`Created promo code: ${PROMO_CODE} (${created.promotion.id})`);
  return created.promotion;
}

// ── Main ──────────────────────────────────────────────────────────────────────

module.exports = async function globalSetup() {
  log('Starting global setup...');
  log(`Backend: ${BACKEND_URL}`);

  const ctx = await request.newContext();

  try {
    const token = await getAdminToken(ctx);
    log('Admin authenticated ✓');

    const collections = await ensureCollections(ctx, token);
    log(`Collections ready: ${JSON.stringify(collections)}`);

    const categories = await ensureCategories(ctx, token);
    log(`Categories ready: ${JSON.stringify(categories)}`);

    const products = await ensureProducts(ctx, token, collections, categories);
    log(`Products ready: ${products.length} total`);

    const customer = await ensureCustomer(ctx, token);
    log(`Customer ready: ${customer.email}`);

    const promo = await ensurePromoCode(ctx, token);
    log(`Promo ready: ${promo.code}`);

    // Write seed data summary for use in tests
    const seedData = {
      generatedAt: new Date().toISOString(),
      collections,
      categories,
      products,
      customer: { id: customer.id, email: customer.email },
      promo: { id: promo.id, code: promo.code },
    };

    fs.writeFileSync(SEED_DATA_PATH, JSON.stringify(seedData, null, 2));
    log(`Seed data written to fixtures/seed-data.json`);

    log('Global setup complete ✓');
  } catch (err) {
    console.error('[global-setup] FAILED:', err.message);
    throw err;
  } finally {
    await ctx.dispose();
  }
};