'use strict';

/**
 * Suite 6 — Store API Ground Truth
 * Pure API tests, no browser.
 * Uses the `api` project in playwright.config.js (no baseURL, no browser).
 *
 * Ground-truth pattern:
 *   1. Fetch data from Medusa API
 *   2. Assert the response shape and values are correct
 *   3. Later, storefront UI tests assert the page reflects these same values
 */

const { test, expect } = require('../../fixtures/base');
const seedData = require('../../fixtures/seed-data.json');

test.describe('Suite 6 — Store API', () => {

  let cartId;
  let lineItemId;
  let variantId;
  let regionId;

  test.beforeAll(async ({ storeRequest }) => {
    // Pull a real variant ID dynamically
    const productRes = await storeRequest.get('/store/products?handle=sweatshirt');
    const { products } = await productRes.json();

    // const variant = products[0].variants.find(v => v.calculated_price !== null);
    // variantId = variant.id;
    // console.log('Using variant:', variantId, variant.title);

    variantId = products[0].variants[0].id;

    // Pull a real region ID
    const regionRes = await storeRequest.get('/store/regions?limit=1');
    const { regions } = await regionRes.json();
    // console.log('Regions are: ',regions);
    regionId = regions[0].id;

    // Create the cart once — all cart tests share this
    const cartRes = await storeRequest.post('/store/carts', {
      data: { region_id: regionId, email: process.env.CUSTOMER_EMAIL }
    });
    const { cart } = await cartRes.json();
    cartId = cart.id;
    
  });
  // ── TC-API-001: Product list ───────────────────────────────────────────────
  test('TC-API-001: GET /store/products returns all published products', async ({ storeRequest }) => {
    const res = await storeRequest.get('/store/products');
    expect(res.ok()).toBeTruthy();

    const { products, count } = await res.json();

    // At least 14 products seeded
    expect(count).toBeGreaterThanOrEqual(14);
    expect(products.length).toBeGreaterThan(0);
    // console.log(products);

    // Every product in the response must have these fields
    for (const p of products) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('handle');
      expect(p).toHaveProperty('variants');
      // console.log(p.variants);
      expect(p.variants.length).toBeGreaterThan(0);
    }
  });

  test('TC-API-002: GET /store/products?handle=orion-shirt  → single product shape', async ({ storeRequest }) => {
    const res = await storeRequest.get('/store/products?handle=orion-shirt');
    expect(res.ok()).toBeTruthy();
    expect(res.status()).toBe(200);
    const data = await res.json();
    const products = await data?.products;
    expect(products.length).toBe(1);
    expect(products[0]).toHaveProperty('id');
    expect(products[0]).toHaveProperty('title', 'Orion Shirt');
    expect(products[0]).toHaveProperty('description', 'A cool shirt.');
    expect(products[0]).toHaveProperty('handle', 'orion-shirt');
    
    
  })
  
  test('TC-API-003: GET /store/collections', async ({storeRequest}) => {
    const res = await storeRequest.get('/store/collections');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('collections');
    const collections = data?.collections;
    for(let collection of collections){
      expect(collection).toHaveProperty('id');
      expect(collection).toHaveProperty('title');
      expect(collection).toHaveProperty('handle');
      expect(collection.id).not.toBeNull();
      expect(collection.title).not.toBeNull();
      expect(collection.handle).not.toBeNull();
    }
  })

  test('TC-API-004: GET /store/product-categories', async ({storeRequest}) => {
    const res = await storeRequest.get('/store/product-categories');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data).toHaveProperty('product_categories');
    expect(data).toHaveProperty('count');
    const categories = data?.product_categories;
    for(let category of categories){
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('description');
      expect(category).toHaveProperty('handle');
      expect(category.id).not.toBeNull();
      expect(category.name).not.toBeNull();
      expect(category.handle).not.toBeNull();
    }
  })

  test('TC-API-005: GET /store/regions', async ({ storeRequest }) => {
    const res = await storeRequest.get('/store/regions');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('regions');
    expect(data).toHaveProperty('count');
    const regions = data?.regions;
    for(let region of regions){
      expect(region).toHaveProperty('id');
      expect(region).toHaveProperty('name');
      expect(region).toHaveProperty('currency_code');
      expect(region.id).not.toBeNull();
      expect(region.name).not.toBeNull();
      expect(region.currency_code).not.toBeNull();
    }
  
  })

  test('TC-API-006: POST /store/carts ', async ({ storeRequest }) => {
    expect(cartId).toBeDefined();
    const res = await storeRequest.get(`/store/carts/${cartId}`);
    expect(res.ok()).toBeTruthy();
    const { cart } = await res.json();
    console.log(cart);
    expect(cart).toHaveProperty('id', cartId);
    expect(cart).toHaveProperty('email', process.env.CUSTOMER_EMAIL);
    expect(cart).toHaveProperty('currency_code');
    expect(cart).toHaveProperty('region_id');
    expect(cart).toHaveProperty('total');
    expect(cart).toHaveProperty('subtotal');
    expect(cart).toHaveProperty('item_total');
    expect(cart).toHaveProperty('customer');
    expect(cart).toHaveProperty('region');

  })

  test('TC-API-007: POST /store/carts/:id/line-items', async ({storeRequest}) => {
    // console.log(`Cart ID is ${cartId} and variant ID is ${variantId}`);
    const res = await storeRequest.post(`/store/carts/${cartId}/line-items`, {
      data: {
        quantity: 2,
        variant_id: variantId
      }
    })
    // console.log(res.status());
    expect(res.ok()).toBeTruthy();
    // console.log('line item status:', res.status());
    const text = await res.text();
    // console.log('line item response:', text);
    const data = await res.json();
    const cart = data?.cart;
    expect(cart).toHaveProperty('items')
    expect(cart).toHaveProperty('id');
    lineItemId = cart.items[0].id;
    
    expect(cart).toHaveProperty('currency_code');
    expect(cart).toHaveProperty('email');
    expect(cart).toHaveProperty('region_id');
    expect(cart).toHaveProperty('total');
    expect(cart).toHaveProperty('subtotal');
    expect(cart).toHaveProperty('item_total');
    expect(cart).toHaveProperty('original_item_subtotal');
    expect(cart).toHaveProperty('sales_channel_id');
    expect(cart).toHaveProperty('customer_id');
    expect(cart).toHaveProperty('customer');
    
    expect(cart).toHaveProperty('region');
    expect(cart.id).toBe(cartId);
    expect(cart.items).not.toBeNull();
  })

  test('TC-API-008: POST /store/carts/:id/promotions', async ({ storeRequest }) => {
  const res = await storeRequest.post(`/store/carts/${cartId}/promotions`, {
    data: { promo_codes: ['TEST10'] }
  });
  expect(res.ok()).toBeTruthy();

  // POST response doesn't populate promotions — do a fresh GET
  const getRes = await storeRequest.get(`/store/carts/${cartId}`);
  const { cart } = await getRes.json();

  expect(cart).toHaveProperty('promotions');
  expect(cart.promotions.length).toBeGreaterThan(0);
  expect(cart.promotions[0]).toHaveProperty('code', 'TEST10');
  expect(cart.discount_total).toBeGreaterThan(0);
});

  test('TC-API-009: GET  /store/carts/:id', async ({storeRequest}) => {
    const res = await storeRequest.get(`/store/carts/${cartId}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const cart = data?.cart;
    expect(cart).toHaveProperty('id');
    expect(cart.id).toBe(cartId);
    expect(cart).toHaveProperty('currency_code');
    expect(cart).toHaveProperty('region_id');
    expect(cart).toHaveProperty('total');
    expect(cart).toHaveProperty('item_total');
    expect(cart).toHaveProperty('item_tax_total');
    expect(cart).toHaveProperty('shipping_total');
    expect(cart).toHaveProperty('sales_channel_id');
    expect(cart).toHaveProperty('customer_id');
    expect(cart).toHaveProperty('customer');
    expect(cart.customer).not.toBeNull();
    expect(cart).toHaveProperty('region');
    expect(cart).toHaveProperty('promotions');
  })

  test('TC-API-010: DELETE /store/carts/:id/line-items/:id', async ({storeRequest}) => {

    const res = await storeRequest.delete(`/store/carts/${cartId}/line-items/${lineItemId}`)
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.object).toBe('line-item');
    expect(data.deleted).toBe(true);

  })
  

  // ── YOUR TURN — implement the remaining test cases below ──────────────────
  //
  // TC-API-002: GET /store/products?handle=orion-shirt  → single product shape
  // TC-API-003: GET /store/collections                  → Shirts + Bottoms present
  // TC-API-004: GET /store/product-categories           → Tops + Accessories present
  // TC-API-005: GET /store/regions                      → at least 1 region, has currency
  // TC-API-006: POST /store/carts                       → cart created with id
  // TC-API-007: POST /store/carts/:id/line-items        → item added, totals update
  // TC-API-008: POST /store/carts/:id/promotions        → TEST10 applied, discount present
  // TC-API-009: GET  /store/carts/:id                   → cart matches ground truth
  // TC-API-010: DELETE /store/carts/:id/line-items/:id  → item removed, cart empty
});