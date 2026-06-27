#!/bin/bash
# deploy-infra.sh
# Run as: solception@VPS in any directory
# Creates all Phase 1 infrastructure files in /home/solception/e2e/
# Safe to re-run — overwrites files but won't touch existing test specs.

set -e
E2E="/home/solception/e2e"
cd "$E2E"

echo "=== Creating directories ==="
mkdir -p fixtures helpers tests/api

echo "=== Writing .env additions ==="
# Append only if not already present
add_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    echo "  .env: ${key} already set (skipping)"
  else
    echo "${key}=${val}" >> .env
    echo "  .env: added ${key}"
  fi
}
add_env "CUSTOMER_EMAIL"       "customer@test.com"
add_env "CUSTOMER_PASSWORD"    "Customer12345"
add_env "PUBLISHABLE_API_KEY"  "pk_fd323a11f1d1ef3641386b1067e890fc2c8054989c26bcfd06119a478c428455"
add_env "COUNTRY_CODE"         "dk"
add_env "TEST_PRODUCT_HANDLE"  "medusa-sweatshirt"
add_env "PROMO_CODE"           "TEST10"

echo ""
echo "=== Writing playwright.config.js ==="
cat > playwright.config.js << 'PWCONFIG'
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  globalSetup: require.resolve('./fixtures/global-setup.js'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'admin-setup',
      testMatch: '**/auth/admin.setup.spec.js',
      use: {
        baseURL: process.env.ADMIN_URL,
      },
    },
    {
      name: 'api',
      testMatch: '**/api/**/*.spec.js',
      // No browser — uses APIRequestContext only
    },
    {
      name: 'storefront',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STOREFRONT_URL,
      },
      testMatch: '**/storefront/**/*.spec.js',
    },
    {
      name: 'admin',
      dependencies: ['admin-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.ADMIN_URL,
        storageState: 'auth.json',
      },
      testMatch: '**/admin/**/*.spec.js',
    },
  ],
});
PWCONFIG
echo "  playwright.config.js written"

echo ""
echo "=== Writing fixtures/base.js ==="
cat > fixtures/base.js << 'BASEJS'
'use strict';

const { test: base, request } = require('@playwright/test');
require('dotenv').config();

const test = base.extend({
  adminToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/user/emailpass', {
      data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    if (!res.ok()) throw new Error(`Admin auth failed: ${res.status()} ${await res.text()}`);
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },

  adminRequest: async ({ adminToken }, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  storeRequest: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  customerToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/customer/emailpass', {
      data: { email: process.env.CUSTOMER_EMAIL, password: process.env.CUSTOMER_PASSWORD },
    });
    if (!res.ok()) throw new Error(`Customer auth failed: ${res.status()} ${await res.text()}`);
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },

  customerRequest: async ({ customerToken }, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${customerToken}`,
        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

module.exports = { test, expect: base.expect };
BASEJS
echo "  fixtures/base.js written"

echo ""
echo "=== Writing helpers/adminApi.js ==="
cat > helpers/adminApi.js << 'ADMINAPI'
'use strict';

async function assertOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '(unreadable body)');
    throw new Error(`[adminApi] ${label} failed — ${res.status()}: ${body}`);
  }
  return res.json();
}

async function listProducts(req, limit = 50) {
  return assertOk(await req.get(`/admin/products?limit=${limit}`), 'listProducts');
}
async function getProduct(req, productId) {
  return assertOk(await req.get(`/admin/products/${productId}`), `getProduct(${productId})`);
}
async function createProduct(req, data) {
  return assertOk(await req.post('/admin/products', { data }), 'createProduct');
}
async function updateProduct(req, productId, data) {
  return assertOk(await req.post(`/admin/products/${productId}`, { data }), `updateProduct(${productId})`);
}
async function deleteProduct(req, productId) {
  return assertOk(await req.delete(`/admin/products/${productId}`), `deleteProduct(${productId})`);
}
async function listOrders(req, params = {}) {
  const qs = new URLSearchParams({ limit: 50, ...params }).toString();
  return assertOk(await req.get(`/admin/orders?${qs}`), 'listOrders');
}
async function getOrder(req, orderId) {
  return assertOk(await req.get(`/admin/orders/${orderId}`), `getOrder(${orderId})`);
}
async function listCustomers(req, params = {}) {
  const qs = new URLSearchParams({ limit: 50, ...params }).toString();
  return assertOk(await req.get(`/admin/customers?${qs}`), 'listCustomers');
}
async function getCustomer(req, customerId) {
  return assertOk(await req.get(`/admin/customers/${customerId}`), `getCustomer(${customerId})`);
}
async function createCustomer(req, data) {
  return assertOk(await req.post('/admin/customers', { data }), 'createCustomer');
}
async function listPromotions(req) {
  return assertOk(await req.get('/admin/promotions?limit=50'), 'listPromotions');
}
async function createPromotion(req, data) {
  return assertOk(await req.post('/admin/promotions', { data }), 'createPromotion');
}
async function listCollections(req) {
  return assertOk(await req.get('/admin/collections?limit=50'), 'listCollections');
}
async function createCollection(req, data) {
  return assertOk(await req.post('/admin/collections', { data }), 'createCollection');
}
async function listCategories(req) {
  return assertOk(await req.get('/admin/product-categories?limit=50'), 'listCategories');
}
async function createCategory(req, data) {
  return assertOk(await req.post('/admin/product-categories', { data }), 'createCategory');
}
async function listRegions(req) {
  return assertOk(await req.get('/admin/regions?limit=50'), 'listRegions');
}
async function listInventoryItems(req) {
  return assertOk(await req.get('/admin/inventory-items?limit=50'), 'listInventoryItems');
}
async function listSalesChannels(req) {
  return assertOk(await req.get('/admin/sales-channels?limit=50'), 'listSalesChannels');
}

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  listOrders, getOrder,
  listCustomers, getCustomer, createCustomer,
  listPromotions, createPromotion,
  listCollections, createCollection,
  listCategories, createCategory,
  listRegions, listInventoryItems, listSalesChannels,
};
ADMINAPI
echo "  helpers/adminApi.js written"

echo ""
echo "=== Writing helpers/cartApi.js ==="
cat > helpers/cartApi.js << 'CARTAPI'
'use strict';

async function assertOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '(unreadable body)');
    throw new Error(`[cartApi] ${label} failed — ${res.status()}: ${body}`);
  }
  return res.json();
}

async function getFirstRegion(req) {
  const data = await assertOk(await req.get('/store/regions?limit=1'), 'getFirstRegion');
  if (!data.regions || data.regions.length === 0) throw new Error('[cartApi] No regions found');
  return data.regions[0];
}
async function createCart(req, regionId) {
  const data = await assertOk(await req.post('/store/carts', { data: { region_id: regionId } }), 'createCart');
  return data.cart;
}
async function getCart(req, cartId) {
  const data = await assertOk(await req.get(`/store/carts/${cartId}`), `getCart(${cartId})`);
  return data.cart;
}
async function addLineItem(req, cartId, variantId, quantity = 1) {
  const data = await assertOk(
    await req.post(`/store/carts/${cartId}/line-items`, { data: { variant_id: variantId, quantity } }),
    `addLineItem(${cartId})`
  );
  return data.cart;
}
async function updateLineItem(req, cartId, lineItemId, quantity) {
  const data = await assertOk(
    await req.post(`/store/carts/${cartId}/line-items/${lineItemId}`, { data: { quantity } }),
    `updateLineItem(${lineItemId})`
  );
  return data.cart;
}
async function removeLineItem(req, cartId, lineItemId) {
  const data = await assertOk(
    await req.delete(`/store/carts/${cartId}/line-items/${lineItemId}`),
    `removeLineItem(${lineItemId})`
  );
  return data.cart;
}
async function applyPromoCode(req, cartId, promoCode) {
  const data = await assertOk(
    await req.post(`/store/carts/${cartId}/promotions`, { data: { promo_codes: [promoCode] } }),
    `applyPromoCode(${promoCode})`
  );
  return data.cart;
}
async function getShippingOptions(req, cartId) {
  const data = await assertOk(await req.get(`/store/shipping-options?cart_id=${cartId}`), `getShippingOptions`);
  return data.shipping_options || [];
}
async function addShippingMethod(req, cartId, shippingOptionId) {
  const data = await assertOk(
    await req.post(`/store/carts/${cartId}/shipping-methods`, { data: { option_id: shippingOptionId } }),
    `addShippingMethod`
  );
  return data.cart;
}
async function updateCartAddress(req, cartId, { email, firstName, lastName, address1, city, countryCode, postalCode }) {
  const data = await assertOk(
    await req.post(`/store/carts/${cartId}`, {
      data: {
        email,
        shipping_address: { first_name: firstName, last_name: lastName, address_1: address1, city, country_code: countryCode, postal_code: postalCode },
      },
    }),
    `updateCartAddress`
  );
  return data.cart;
}
async function createPaymentCollection(req, cartId) {
  const data = await assertOk(
    await req.post('/store/payment-collections', { data: { cart_id: cartId } }),
    `createPaymentCollection`
  );
  return data.payment_collection;
}
async function completeCart(req, cartId) {
  return assertOk(await req.post(`/store/carts/${cartId}/complete`), `completeCart`);
}
async function createCartWithItem(req, variantId, quantity = 1) {
  const region = await getFirstRegion(req);
  const cart = await createCart(req, region.id);
  const updatedCart = await addLineItem(req, cart.id, variantId, quantity);
  return { cart: updatedCart, cartId: updatedCart.id };
}

module.exports = {
  getFirstRegion, createCart, getCart, addLineItem, updateLineItem,
  removeLineItem, applyPromoCode, getShippingOptions, addShippingMethod,
  updateCartAddress, createPaymentCollection, completeCart, createCartWithItem,
};
CARTAPI
echo "  helpers/cartApi.js written"

echo ""
echo "=== Writing helpers/groundTruth.js ==="
cat > helpers/groundTruth.js << 'GROUNDTRUTH'
'use strict';

async function assertOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '(unreadable body)');
    throw new Error(`[groundTruth] ${label} failed — ${res.status()}: ${body}`);
  }
  return res.json();
}

async function fetchStoreProducts(storeReq, limit = 50) {
  const data = await assertOk(await storeReq.get(`/store/products?limit=${limit}`), 'fetchStoreProducts');
  return data.products || [];
}
async function fetchProductByHandle(storeReq, handle) {
  const data = await assertOk(await storeReq.get(`/store/products?handle=${handle}&limit=1`), `fetchProductByHandle`);
  const products = data.products || [];
  if (!products.length) throw new Error(`[groundTruth] Product not found: handle=${handle}`);
  return products[0];
}
async function fetchCollections(storeReq) {
  const data = await assertOk(await storeReq.get('/store/collections?limit=50'), 'fetchCollections');
  return data.collections || [];
}
async function fetchCategories(storeReq) {
  const data = await assertOk(await storeReq.get('/store/product-categories?limit=50'), 'fetchCategories');
  return data.product_categories || [];
}
async function fetchRegions(storeReq) {
  const data = await assertOk(await storeReq.get('/store/regions?limit=50'), 'fetchRegions');
  return data.regions || [];
}
async function fetchCart(storeReq, cartId) {
  const data = await assertOk(await storeReq.get(`/store/carts/${cartId}`), `fetchCart`);
  return data.cart;
}
async function fetchOrder(storeReq, orderId) {
  const data = await assertOk(await storeReq.get(`/store/orders/${orderId}`), `fetchOrder`);
  return data.order;
}
async function fetchAdminProducts(adminReq, limit = 50) {
  const data = await assertOk(await adminReq.get(`/admin/products?limit=${limit}`), 'fetchAdminProducts');
  return data.products || [];
}
async function fetchAdminProduct(adminReq, productId) {
  const data = await assertOk(await adminReq.get(`/admin/products/${productId}`), `fetchAdminProduct`);
  return data.product;
}
async function fetchAdminOrders(adminReq, params = {}) {
  const qs = new URLSearchParams({ limit: 50, ...params }).toString();
  const data = await assertOk(await adminReq.get(`/admin/orders?${qs}`), 'fetchAdminOrders');
  return data.orders || [];
}
async function fetchAdminCustomers(adminReq, params = {}) {
  const qs = new URLSearchParams({ limit: 50, ...params }).toString();
  const data = await assertOk(await adminReq.get(`/admin/customers?${qs}`), 'fetchAdminCustomers');
  return data.customers || [];
}
async function fetchInventoryItems(adminReq) {
  const data = await assertOk(await adminReq.get('/admin/inventory-items?limit=50'), 'fetchInventoryItems');
  return data.inventory_items || [];
}
function formatPrice(amount, currencyCode = 'usd') {
  return (amount / 100).toFixed(2);
}
function getCheapestVariantPrice(product) {
  const prices = (product.variants || [])
    .flatMap(v => v.prices || [])
    .map(p => p.amount)
    .filter(a => typeof a === 'number');
  if (!prices.length) return null;
  return Math.min(...prices);
}

module.exports = {
  fetchStoreProducts, fetchProductByHandle, fetchCollections, fetchCategories,
  fetchRegions, fetchCart, fetchOrder,
  fetchAdminProducts, fetchAdminProduct, fetchAdminOrders, fetchAdminCustomers,
  fetchInventoryItems, formatPrice, getCheapestVariantPrice,
};
GROUNDTRUTH
echo "  helpers/groundTruth.js written"

echo ""
echo "=== Writing fixtures/global-setup.js ==="
# The global-setup is long — write it via a separate heredoc
node - << 'WRITEGLOBALSETUP'
const fs = require('fs');
const content = fs.readFileSync('/dev/stdin', 'utf8');
// We'll just signal that this needs to be copied separately
WRITEGLOBALSETUP

# Write global-setup.js directly
cat > fixtures/global-setup.js << 'GLOBALSETUP'
'use strict';

const { request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BACKEND_URL = process.env.BACKEND_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@test.com';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'Customer12345';
const PROMO_CODE = process.env.PROMO_CODE || 'TEST10';
const SEED_DATA_PATH = path.resolve(__dirname, 'seed-data.json');

const PRODUCTS_TO_SEED = [
  { title: 'Medusa Hoodie', handle: 'medusa-hoodie', description: 'A comfortable oversized hoodie.', status: 'published', collectionKey: 'shirts', categoryKey: 'tops', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S / Black', prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'S' }, { value: 'Black' }] }, { title: 'M / Black', prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'M' }, { value: 'Black' }] }, { title: 'L / Black', prices: [{ amount: 4500, currency_code: 'usd' }], options: [{ value: 'L' }, { value: 'Black' }] }] },
  { title: 'Medusa Polo', handle: 'medusa-polo', description: 'A clean slim-fit polo.', status: 'published', collectionKey: 'shirts', categoryKey: 'tops', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S / White', prices: [{ amount: 3000, currency_code: 'usd' }], options: [{ value: 'S' }, { value: 'White' }] }, { title: 'M / White', prices: [{ amount: 3000, currency_code: 'usd' }], options: [{ value: 'M' }, { value: 'White' }] }] },
  { title: 'Medusa Tank Top', handle: 'medusa-tank-top', description: 'Lightweight tank top.', status: 'published', collectionKey: 'shirts', categoryKey: 'tops', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S / Gray', prices: [{ amount: 1800, currency_code: 'usd' }], options: [{ value: 'S' }, { value: 'Gray' }] }, { title: 'M / Gray', prices: [{ amount: 1800, currency_code: 'usd' }], options: [{ value: 'M' }, { value: 'Gray' }] }] },
  { title: 'Medusa Joggers', handle: 'medusa-joggers', description: 'Tapered joggers.', status: 'published', collectionKey: 'bottoms', categoryKey: null, options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S / Black', prices: [{ amount: 3500, currency_code: 'usd' }], options: [{ value: 'S' }, { value: 'Black' }] }, { title: 'M / Black', prices: [{ amount: 3500, currency_code: 'usd' }], options: [{ value: 'M' }, { value: 'Black' }] }] },
  { title: 'Medusa Chinos', handle: 'medusa-chinos', description: 'Slim-fit chinos.', status: 'published', collectionKey: 'bottoms', categoryKey: null, options: [{ title: 'Waist' }, { title: 'Color' }], variants: [{ title: '30 / Navy', prices: [{ amount: 5500, currency_code: 'usd' }], options: [{ value: '30' }, { value: 'Navy' }] }, { title: '32 / Navy', prices: [{ amount: 5500, currency_code: 'usd' }], options: [{ value: '32' }, { value: 'Navy' }] }] },
  { title: 'Medusa Cargo Pants', handle: 'medusa-cargo-pants', description: 'Utility cargo pants.', status: 'published', collectionKey: 'bottoms', categoryKey: null, options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S / Olive', prices: [{ amount: 6000, currency_code: 'usd' }], options: [{ value: 'S' }, { value: 'Olive' }] }, { title: 'M / Olive', prices: [{ amount: 6000, currency_code: 'usd' }], options: [{ value: 'M' }, { value: 'Olive' }] }] },
  { title: 'Medusa Cap', handle: 'medusa-cap', description: 'Six-panel cap.', status: 'published', collectionKey: null, categoryKey: 'accessories', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'One Size / Black', prices: [{ amount: 2500, currency_code: 'usd' }], options: [{ value: 'One Size' }, { value: 'Black' }] }] },
  { title: 'Medusa Beanie', handle: 'medusa-beanie', description: 'Ribbed knit beanie.', status: 'published', collectionKey: null, categoryKey: 'accessories', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'One Size / Gray', prices: [{ amount: 2000, currency_code: 'usd' }], options: [{ value: 'One Size' }, { value: 'Gray' }] }] },
  { title: 'Medusa Tote Bag', handle: 'medusa-tote-bag', description: 'Canvas tote bag.', status: 'published', collectionKey: null, categoryKey: 'accessories', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'Standard / Natural', prices: [{ amount: 3000, currency_code: 'usd' }], options: [{ value: 'Standard' }, { value: 'Natural' }] }] },
  { title: 'Medusa Socks (3-Pack)', handle: 'medusa-socks', description: 'Three-pack ankle socks.', status: 'published', collectionKey: null, categoryKey: 'accessories', options: [{ title: 'Size' }, { title: 'Color' }], variants: [{ title: 'S-M / White', prices: [{ amount: 1200, currency_code: 'usd' }], options: [{ value: 'S-M' }, { value: 'White' }] }, { title: 'L-XL / White', prices: [{ amount: 1200, currency_code: 'usd' }], options: [{ value: 'L-XL' }, { value: 'White' }] }] },
];

function log(msg) { console.log(`[global-setup] ${msg}`); }
async function assertOk(res, label) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new Error(`[global-setup] ${label} failed — HTTP ${res.status()}: ${body}`);
  }
  return res.json();
}
async function getAdminToken(ctx) {
  const res = await ctx.post(`${BACKEND_URL}/auth/user/emailpass`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  const data = await assertOk(res, 'admin login');
  return data.token;
}
function H(token) { return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

async function ensureCollections(ctx, token) {
  const data = await assertOk(await ctx.get(`${BACKEND_URL}/admin/collections?limit=50`, { headers: H(token) }), 'list collections');
  const existing = data.collections || [];
  const collections = {};
  for (const col of [{ key: 'shirts', title: 'Shirts', handle: 'shirts' }, { key: 'bottoms', title: 'Bottoms', handle: 'bottoms' }]) {
    const found = existing.find(c => c.handle === col.handle);
    if (found) { log(`Collection exists: ${col.title}`); collections[col.key] = found.id; }
    else {
      const created = await assertOk(await ctx.post(`${BACKEND_URL}/admin/collections`, { data: { title: col.title, handle: col.handle }, headers: H(token) }), `create collection`);
      log(`Created collection: ${col.title}`); collections[col.key] = created.collection.id;
    }
  }
  return collections;
}

async function ensureCategories(ctx, token) {
  const data = await assertOk(await ctx.get(`${BACKEND_URL}/admin/product-categories?limit=50`, { headers: H(token) }), 'list categories');
  const existing = data.product_categories || [];
  const categories = {};
  for (const cat of [{ key: 'tops', name: 'Tops', handle: 'tops' }, { key: 'accessories', name: 'Accessories', handle: 'accessories' }]) {
    const found = existing.find(c => c.handle === cat.handle);
    if (found) { log(`Category exists: ${cat.name}`); categories[cat.key] = found.id; }
    else {
      const created = await assertOk(await ctx.post(`${BACKEND_URL}/admin/product-categories`, { data: { name: cat.name, handle: cat.handle, is_active: true, is_internal: false }, headers: H(token) }), `create category`);
      log(`Created category: ${cat.name}`); categories[cat.key] = created.product_category.id;
    }
  }
  return categories;
}

async function ensureProducts(ctx, token, collections, categories) {
  const data = await assertOk(await ctx.get(`${BACKEND_URL}/admin/products?limit=100`, { headers: H(token) }), 'list products');
  const existing = data.products || [];
  const existingHandles = new Set(existing.map(p => p.handle));
  log(`Found ${existing.length} existing products`);
  const seededProducts = [];
  for (const def of PRODUCTS_TO_SEED) {
    if (existingHandles.has(def.handle)) {
      const found = existing.find(p => p.handle === def.handle);
      log(`Product exists: ${def.title}`);
      seededProducts.push({ id: found.id, handle: found.handle, title: found.title });
      continue;
    }
    const payload = { title: def.title, handle: def.handle, description: def.description, status: def.status, options: def.options, variants: def.variants };
    if (def.collectionKey && collections[def.collectionKey]) payload.collection_id = collections[def.collectionKey];
    if (def.categoryKey && categories[def.categoryKey]) payload.categories = [{ id: categories[def.categoryKey] }];
    const created = await assertOk(await ctx.post(`${BACKEND_URL}/admin/products`, { data: payload, headers: H(token) }), `create product`);
    log(`Created product: ${def.title}`);
    seededProducts.push({ id: created.product.id, handle: created.product.handle, title: created.product.title });
  }
  for (const p of existing) {
    if (!seededProducts.find(sp => sp.id === p.id)) seededProducts.push({ id: p.id, handle: p.handle, title: p.title });
  }
  return seededProducts;
}

async function ensureCustomer(ctx, token) {
  const data = await assertOk(await ctx.get(`${BACKEND_URL}/admin/customers?limit=50`, { headers: H(token) }), 'list customers');
  const existing = (data.customers || []).find(c => c.email === CUSTOMER_EMAIL);
  if (existing) { log(`Customer exists: ${CUSTOMER_EMAIL}`); return existing; }
  const created = await assertOk(await ctx.post(`${BACKEND_URL}/admin/customers`, { data: { email: CUSTOMER_EMAIL, first_name: 'Test', last_name: 'Customer', password: CUSTOMER_PASSWORD }, headers: H(token) }), 'create customer');
  log(`Created customer: ${CUSTOMER_EMAIL}`);
  return created.customer;
}

async function ensurePromoCode(ctx, token) {
  const data = await assertOk(await ctx.get(`${BACKEND_URL}/admin/promotions?limit=50`, { headers: H(token) }), 'list promotions');
  const existing = (data.promotions || []).find(p => p.code === PROMO_CODE);
  if (existing) { log(`Promo exists: ${PROMO_CODE}`); return existing; }
  const created = await assertOk(await ctx.post(`${BACKEND_URL}/admin/promotions`, {
    data: { code: PROMO_CODE, type: 'standard', campaign: null, application_method: { type: 'percentage', target_type: 'order', value: 10, allocation: 'across' }, rules: [], is_automatic: false },
    headers: H(token),
  }), 'create promo');
  log(`Created promo: ${PROMO_CODE}`);
  return created.promotion;
}

module.exports = async function globalSetup() {
  log('Starting...');
  const ctx = await request.newContext();
  try {
    const token = await getAdminToken(ctx);
    log('Admin authenticated ✓');
    const collections = await ensureCollections(ctx, token);
    const categories = await ensureCategories(ctx, token);
    const products = await ensureProducts(ctx, token, collections, categories);
    const customer = await ensureCustomer(ctx, token);
    const promo = await ensurePromoCode(ctx, token);
    const seedData = { generatedAt: new Date().toISOString(), collections, categories, products, customer: { id: customer.id, email: customer.email }, promo: { id: promo.id, code: promo.code } };
    fs.writeFileSync(SEED_DATA_PATH, JSON.stringify(seedData, null, 2));
    log(`Seed data written → fixtures/seed-data.json`);
    log('Global setup complete ✓');
  } catch (err) {
    console.error('[global-setup] FAILED:', err.message);
    throw err;
  } finally {
    await ctx.dispose();
  }
};
GLOBALSETUP
echo "  fixtures/global-setup.js written"

echo ""
echo "=== Checking npm package for dotenv ==="
if node -e "require('dotenv')" 2>/dev/null; then
  echo "  dotenv already installed ✓"
else
  echo "  Installing dotenv..."
  npm install dotenv --save-dev
fi

echo ""
echo "=== File summary ==="
echo "Files created/updated in $E2E:"
ls -la fixtures/ helpers/ playwright.config.js .env

echo ""
echo "=== Run this to verify setup (dry-run global-setup only) ==="
echo "  cd $E2E && node fixtures/global-setup.js"
echo ""
echo "=== Then run the full suite ==="
echo "  npx playwright test --project=api"
echo ""
echo "deploy-infra.sh COMPLETE ✓"
