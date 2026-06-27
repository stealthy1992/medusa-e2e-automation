'use strict';

require('dotenv').config();
const { test, expect } = require('@playwright/test');
const { validateSchema } = require('../../helpers/schemaValidator');
const productSchema = require('../../helpers/schemas/product.schema');
const cartSchema = require('../../helpers/schemas/cart.schema');
const orderSchema = require('../../helpers/schemas/order.schema');
const customerSchema = require('../../helpers/schemas/customer.schema');

const BACKEND_URL = process.env.BACKEND_URL;
const PUB_KEY = process.env.PUBLISHABLE_API_KEY;
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD;

async function getCustomerToken(request) {
  const res = await request.post(`${BACKEND_URL}/auth/customer/emailpass`, {
    data: { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD },
  });
  const body = await res.json();
  return body.token;
}

// ── SV-001: Product List Schema ───────────────────────────────────────────────

test.describe('SV-001 — GET /store/products schema', () => {
  test('response matches product schema', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/store/products`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    validateSchema(body, productSchema, 'GET /store/products');
  });
});

// ── SV-002: Single Product Schema ─────────────────────────────────────────────

test.describe('SV-002 — GET /store/products?handle=sweatshirt schema', () => {
  test('single product response matches product schema', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/store/products?handle=sweatshirt`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    validateSchema(body, productSchema, 'GET /store/products?handle=sweatshirt');
  });
});

// ── SV-003: Cart Schema ───────────────────────────────────────────────────────

test.describe('SV-003 — GET /store/carts/:id schema', () => {
  test('cart response matches cart schema', async ({ request }) => {
    // Create cart
    const createRes = await request.post(`${BACKEND_URL}/store/carts`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
      data: {},
    });
    expect(createRes.status()).toBe(200);
    const { cart: newCart } = await createRes.json();

    // Add item
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

    // Fetch and validate
    const res = await request.get(`${BACKEND_URL}/store/carts/${newCart.id}`, {
      headers: { 'x-publishable-api-key': PUB_KEY },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    validateSchema(body, cartSchema, 'GET /store/carts/:id');
  });
});

// ── SV-004: Order List Schema ─────────────────────────────────────────────────

test.describe('SV-004 — GET /store/orders schema', () => {
  test('order list response matches order schema', async ({ request }) => {
    const token = await getCustomerToken(request);

    const res = await request.get(`${BACKEND_URL}/store/orders`, {
      headers: {
        'x-publishable-api-key': PUB_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    validateSchema(body, orderSchema, 'GET /store/orders');
  });
});

// ── SV-005: Customer Profile Schema ──────────────────────────────────────────

test.describe('SV-005 — GET /store/customers/me schema', () => {
  test('customer profile response matches customer schema', async ({ request }) => {
    const token = await getCustomerToken(request);

    const res = await request.get(`${BACKEND_URL}/store/customers/me`, {
      headers: {
        'x-publishable-api-key': PUB_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    validateSchema(body, customerSchema, 'GET /store/customers/me');
  });
});