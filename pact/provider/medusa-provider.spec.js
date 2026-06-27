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

async function getCustomerToken(request) {
  const res = await request.post(`${BACKEND_URL}/auth/customer/emailpass`, {
    data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
  });
  const body = await res.json();
  return body.token;
}

function assertType(value, expectedType, label) {
  expect(typeof value, `${label} must be ${expectedType}`).toBe(expectedType);
}

function assertArrayMinLength(value, min, label) {
  expect(Array.isArray(value), `${label} must be an array`).toBe(true);
  expect(value.length, `${label} must have at least ${min} item(s)`).toBeGreaterThanOrEqual(min);
}

// ── Products ──────────────────────────────────────────────────────────────────

test.describe('Pact Provider Verification — MedusaStoreAPI products contract', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-products.json');

  for (const interaction of contract.interactions) {
    test(`Provider honours: "${interaction.description}"`, async ({ request }) => {
      const res = await request.get(`${BACKEND_URL}/store/products`, {
        headers: { 'x-publishable-api-key': PUB_KEY },
      });

      expect(res.status(), 'status matches contract').toBe(interaction.response.status);

      const body = await res.json();
      const rules = interaction.response.matchingRules;
      console.log('Products are: ',body?.products);

      assertArrayMinLength(body.products, rules['$.body.products'].min, 'products');

      const p = body.products[0];
      assertType(p.id, 'string', 'product.id');
      assertType(p.title, 'string', 'product.title');
      assertType(p.handle, 'string', 'product.handle');
      assertArrayMinLength(p.variants, rules['$.body.products[*].variants'].min, 'variants');

      const v = p.variants[0];
      assertType(v.id, 'string', 'variant.id');
      assertType(v.title, 'string', 'variant.title');
      // assertArrayMinLength(v.prices, rules['$.body.products[*].variants[*].prices'].min, 'prices');
      // assertType(v.prices[0].amount, 'number', 'price.amount');
      // assertType(v.prices[0].currency_code, 'string', 'price.currency_code');

      assertType(body.count, 'number', 'count');
      assertType(body.offset, 'number', 'offset');
      assertType(body.limit, 'number', 'limit');
    });
  }
});

// ── Carts ─────────────────────────────────────────────────────────────────────

test.describe('Pact Provider Verification — MedusaStoreAPI carts contract', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-carts.json');

  for (const interaction of contract.interactions) {
    test(`Provider honours: "${interaction.description}"`, async ({ request }) => {
      // Create a real cart with an item
      const createRes = await request.post(`${BACKEND_URL}/store/carts`, {
        headers: { 'x-publishable-api-key': PUB_KEY },
        data: {},
      });
      expect(createRes.status()).toBe(200);
      const { cart: newCart } = await createRes.json();

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

      const res = await request.get(`${BACKEND_URL}/store/carts/${newCart.id}`, {
        headers: { 'x-publishable-api-key': PUB_KEY },
      });

      expect(res.status(), 'status matches contract').toBe(interaction.response.status);

      const body = await res.json();
      const { cart } = body;
      const rules = interaction.response.matchingRules;

      assertType(cart.id, 'string', 'cart.id');
      assertArrayMinLength(cart.items, rules['$.body.cart.items'].min, 'cart.items');

      const item = cart.items[0];
      assertType(item.id, 'string', 'item.id');
      assertType(item.title, 'string', 'item.title');
      assertType(item.quantity, 'number', 'item.quantity');
      assertType(item.unit_price, 'number', 'item.unit_price');
      // assertType(item.item_subtotal, 'number', 'item.item_subtotal');

      assertType(cart.subtotal, 'number', 'cart.subtotal');
      assertType(cart.discount_total, 'number', 'cart.discount_total');
      assertType(cart.shipping_total, 'number', 'cart.shipping_total');
      assertType(cart.total, 'number', 'cart.total');
      assertType(cart.currency_code, 'string', 'cart.currency_code');
      assertType(cart.region.id, 'string', 'region.id');
      assertType(cart.region.name, 'string', 'region.name');
      assertType(cart.region.currency_code, 'string', 'region.currency_code');
    });
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────

test.describe('Pact Provider Verification — MedusaStoreAPI orders contract', () => {
  const contract = loadContract('MedusaStorefrontClient-MedusaStoreAPI-orders.json');

  for (const interaction of contract.interactions) {
    test(`Provider honours: "${interaction.description}"`, async ({ request }) => {
      const token = await getCustomerToken(request);

      const res = await request.get(`${BACKEND_URL}/store/orders`, {
        headers: {
          'x-publishable-api-key': PUB_KEY,
          'Authorization': `Bearer ${token}`,
        },
      });

      expect(res.status(), 'status matches contract').toBe(interaction.response.status);

      const body = await res.json();
      const rules = interaction.response.matchingRules;

      expect(Array.isArray(body.orders), 'orders is array').toBe(true);

      if (body.orders.length > 0) {
        const o = body.orders[0];
        assertType(o.id, 'string', 'order.id');
        assertType(o.status, 'string', 'order.status');
        assertType(o.total, 'number', 'order.total');
        assertType(o.currency_code, 'string', 'order.currency_code');
        assertType(o.payment_status, 'string', 'order.payment_status');
        assertType(o.fulfillment_status, 'string', 'order.fulfillment_status');
        assertArrayMinLength(o.items, rules['$.body.orders[*].items'].min, 'order.items');
        assertType(o.created_at, 'string', 'order.created_at');
      }

      assertType(body.count, 'number', 'count');
      assertType(body.offset, 'number', 'offset');
      assertType(body.limit, 'number', 'limit');
    });
  }
});
