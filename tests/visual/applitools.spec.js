'use strict';

require('dotenv').config();
const { test } = require('@playwright/test');
const { Eyes, Target, Configuration, RectangleSize, BatchInfo } = require('@applitools/eyes-playwright');

const BACKEND_URL = process.env.BACKEND_URL;
const PUB_KEY = process.env.PUBLISHABLE_API_KEY;

const batch = new BatchInfo({ name: 'Medusa V2 Storefront' });

async function buildCartWithItem(request) {
  const createRes = await request.post(`${BACKEND_URL}/store/carts`, {
    headers: { 'x-publishable-api-key': PUB_KEY },
    data: {},
  }); 
  const { cart } = await createRes.json();

  const productsRes = await request.get(
    `${BACKEND_URL}/store/products?handle=shorts`,
    { headers: { 'x-publishable-api-key': PUB_KEY } }
  );
  const { products } = await productsRes.json();
  const variantId = products[0].variants[0].id;

  await request.post(`${BACKEND_URL}/store/carts/${cart.id}/line-items`, {
    headers: { 'x-publishable-api-key': PUB_KEY },
    data: { variant_id: variantId, quantity: 1 },
  });

  return cart.id;
}

function createEyes() {
  const config = new Configuration();
  config.setApiKey(process.env.APPLITOOLS_API_KEY);
  config.setBatch(batch);
  config.setAppName('Medusa V2 Storefront');
  config.setViewportSize(new RectangleSize({ width: 1280, height: 720 }));
  const eyes = new Eyes();
  eyes.setConfiguration(config);
  return eyes;
}

// ── APL-001: Homepage ─────────────────────────────────────────────────────────

test.describe('APL-001 — Homepage', () => {
  test('homepage visual check', async ({ page }) => {
    const eyes = createEyes();
    try {
      await eyes.open(page, 'Medusa V2 Storefront', 'APL-001 — Homepage');
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await eyes.check('Homepage', Target.window().fully());
      await eyes.close();
    } finally {
      await eyes.abort();
    }
  });
});

// ── APL-002: Product Listing Page ─────────────────────────────────────────────

test.describe('APL-002 — Product Listing Page', () => {
  test('product listing visual check', async ({ page }) => {
    const eyes = createEyes();
    try {
      await eyes.open(page, 'Medusa V2 Storefront', 'APL-002 — Product Listing');
      await page.goto('/store');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await eyes.check('Product Listing', Target.window().fully());
      await eyes.close();
    } finally {
      await eyes.abort();
    }
  });
});

// ── APL-003: Product Detail Page ──────────────────────────────────────────────

test.describe('APL-003 — Product Detail Page', () => {
  test('sweatshirt PDP visual check', async ({ page }) => {
    const eyes = createEyes();
    try {
      await eyes.open(page, 'Medusa V2 Storefront', 'APL-003 — Sweatshirt PDP');
      await page.goto('/products/sweatshirt');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await eyes.check('Sweatshirt PDP', Target.window().fully());
      await eyes.close();
    } finally {
      await eyes.abort();
    }
  });
});

// ── APL-004: Cart Page ────────────────────────────────────────────────────────

test.describe('APL-004 — Cart Page', () => {
  test('cart with one item visual check', async ({ page, request }) => {
    const eyes = createEyes();
    try {
      await eyes.open(page, 'Medusa V2 Storefront', 'APL-004 — Cart');
      const cartId = await buildCartWithItem(request);
      await page.goto('/');
      await page.evaluate((id) => {
        document.cookie = `_medusa_cart_id=${id}; path=/`;
      }, cartId);
      await page.goto('/cart');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await eyes.check('Cart with item', Target.window().fully());
      await eyes.close();
    } finally {
      await eyes.abort();
    }
  });
});

// ── APL-005: Account Login Page ───────────────────────────────────────────────

test.describe('APL-005 — Account Login Page', () => {
  test('account login visual check', async ({ page }) => {
    const eyes = createEyes();
    try {
      await eyes.open(page, 'Medusa V2 Storefront', 'APL-005 — Account Login');
      await page.goto('/account');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await eyes.check('Account Login', Target.window().fully());
      await eyes.close();
    } finally {
      await eyes.abort();
    }
  });
});