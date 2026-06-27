'use strict';

require('dotenv').config();
const { test, expect } = require('@playwright/test');

const STOREFRONT_URL = process.env.STOREFRONT_URL;
const BACKEND_URL = process.env.BACKEND_URL;
const PUB_KEY = process.env.PUBLISHABLE_API_KEY;
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL;
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── VR-001: Homepage ──────────────────────────────────────────────────────────

test.describe('VR-001 — Homepage', () => {
  test('homepage matches baseline screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mask any dynamic elements that change between runs
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      mask: [],
      maxDiffPixelRatio: 0.02,
    });
  });
});

// ── VR-002: Product Listing Page ──────────────────────────────────────────────

test.describe('VR-002 — Product Listing Page', () => {
  test('product listing page matches baseline screenshot', async ({ page }) => {
    await page.goto('/store');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('product-listing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

// ── VR-003: Product Detail Page ───────────────────────────────────────────────

test.describe('VR-003 — Product Detail Page', () => {
  test('sweatshirt PDP matches baseline screenshot', async ({ page }) => {
    await page.goto('/products/sweatshirt');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot('pdp-sweatshirt.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

// ── VR-004: Cart Page ─────────────────────────────────────────────────────────

test.describe('VR-004 — Cart Page', () => {
  test('cart with one item matches baseline screenshot', async ({ page, request }) => {
    const cartId = await buildCartWithItem(request);

    // Inject the cart cookie so the storefront picks it up
    await page.goto('/');
    await page.evaluate((id) => {
      document.cookie = `_medusa_cart_id=${id}; path=/`;
    }, cartId);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('cart.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

// ── VR-005: Account Login Page ────────────────────────────────────────────────

test.describe('VR-005 — Account Login Page', () => {
  test('login page matches baseline screenshot', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot('account-login.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});