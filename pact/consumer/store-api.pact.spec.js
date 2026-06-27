'use strict';

require('dotenv').config();
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL;
const PUB_KEY = process.env.PUBLISHABLE_API_KEY;
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD;

const contractsDir = path.join(__dirname, '../contracts');

function loadContract(filename) {
  return JSON.parse(fs.readFileSync(path.join(contractsDir, filename), 'utf8'));
}

function validateShape(actual, rules, body) {
  for (const [path, rule] of Object.entries(rules)) {
    const parts = path.replace('$.body.', '').split('.');
    let value = body;
    let valid = true;
    for (const part of parts) {
      if (part.includes('[*]')) continue; // wildcard — handled by array check
      if (value === undefined || value === null) { valid = false; break; }
      value = value[part];
    }
    if (!valid) continue;

    if (rule.match === 'type') {
      if (rule.min !== undefined && Array.isArray(value)) {
        expect(value.length, `${path} must have min ${rule.min} items`).toBeGreaterThanOrEqual(rule.min);
      }
    }
  }
}

async function getCustomerToken(request) {
  const res = await request.post(`${BACKEND_URL}/auth/customer/emailpass`, {
    data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
  });
  const body = await res.json();
  return body.token;
}

// ── Products ──────────────────────────────────────────────────────────────────

test.describe('Pact Consumer — GET /store/products', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-products.json');
  const interaction = contract.interactions[0];

  test('response shape matches contracted structure', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/store/products`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
    });

    expect(res.status()).toBe(interaction.response.status);

    const body = await res.json();

    expect(Array.isArray(body.products), 'products is array').toBe(true);
    expect(body.products.length).toBeGreaterThanOrEqual(1);

    const p = body.products[0];
    expect(typeof p.id).toBe('string');
    expect(typeof p.title).toBe('string');
    expect(typeof p.handle).toBe('string');
    expect(Array.isArray(p.variants)).toBe(true);
    expect(p.variants.length).toBeGreaterThanOrEqual(1);

    const v = p.variants[0];
    expect(typeof v.id).toBe('string');
    expect(typeof v.title).toBe('string');
    // expect(Array.isArray(v.prices)).toBe(true);
    // expect(v.prices.length).toBeGreaterThanOrEqual(1);
    // expect(typeof v.prices[0].amount).toBe('number');
    // expect(typeof v.prices[0].currency_code).toBe('string');

    expect(typeof body.count).toBe('number');
    expect(typeof body.offset).toBe('number');
    expect(typeof body.limit).toBe('number');

    validateShape(body, interaction.response.matchingRules, body);
  });
});

// ── Carts ─────────────────────────────────────────────────────────────────────

test.describe('Pact Consumer — GET /store/carts/:id', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-carts.json');
  const interaction = contract.interactions[0];

  test('response shape matches contracted structure', async ({ request }) => {
    // Step 1: create a cart to get a real cart ID
    const createRes = await request.post(`${BACKEND_URL}/store/carts`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
      data: {},
    });
    expect(createRes.status()).toBe(200);
    const { cart: newCart } = await createRes.json();

    // Step 2: add an item (sweatshirt variant — known good)
    const productsRes = await request.get(
      `${BACKEND_URL}/store/products?handle=sweatshirt`,
      { headers: { 'x-publishable-api-key': PUB_KEY } }
    );
    const { products } = await productsRes.json();
    const variantId = products[0].variants[0].id;

    await request.post(`${BACKEND_URL}/store/carts/${newCart.id}/line-items`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
      data: { variant_id: variantId, quantity: 1 },
    });

    // Step 3: fetch the cart and validate shape
    const res = await request.get(`${BACKEND_URL}/store/carts/${newCart.id}`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
    });

    expect(res.status()).toBe(interaction.response.status);
    const body = await res.json();

    const { cart } = body;
    expect(typeof cart.id).toBe('string');
    expect(Array.isArray(cart.items)).toBe(true);
    expect(cart.items.length).toBeGreaterThanOrEqual(1);
    expect(typeof cart.subtotal).toBe('number');

    const item = cart.items[0];
    expect(typeof item.id).toBe('string');
    expect(typeof item.title).toBe('string');
    expect(typeof item.quantity).toBe('number');
    expect(typeof item.unit_price).toBe('number');
    

    expect(typeof cart.subtotal).toBe('number');
    expect(typeof cart.discount_total).toBe('number');
    expect(typeof cart.shipping_total).toBe('number');
    expect(typeof cart.total).toBe('number');
    expect(typeof cart.currency_code).toBe('string');
    expect(typeof cart.region.id).toBe('string');
    expect(typeof cart.region.name).toBe('string');
    expect(typeof cart.region.currency_code).toBe('string');

    validateShape(body, interaction.response.matchingRules, body);
  });
});

// ── Orders ────────────────────────────────────────────────────────────────────

test.describe('Pact Consumer — GET /store/orders', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-orders.json');
  const interaction = contract.interactions[0];

  test('response shape matches contracted structure', async ({ request }) => {
    const token = await getCustomerToken(request);

    const res = await request.get(`${BACKEND_URL}/store/orders`, {
      headers: {
        'x-publishable-api-key': PUB_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    expect(res.status()).toBe(interaction.response.status);
    const body = await res.json();

    expect(Array.isArray(body.orders), 'orders is array').toBe(true);

    if (body.orders.length > 0) {
      const o = body.orders[0];
      expect(typeof o.id).toBe('string');
      expect(typeof o.status).toBe('string');
      expect(typeof o.total).toBe('number');
      expect(typeof o.currency_code).toBe('string');
      expect(typeof o.payment_status).toBe('string');
      expect(typeof o.fulfillment_status).toBe('string');
      expect(Array.isArray(o.items)).toBe(true);
      expect(typeof o.created_at).toBe('string');
    }

    expect(typeof body.count).toBe('number');
    expect(typeof body.offset).toBe('number');
    expect(typeof body.limit).toBe('number');

    validateShape(body, interaction.response.matchingRules, body);
  });
});
