# Medusa V2 — Playwright Test Plan (Expanded)
**Target:** Medusa v2 (v2.15.x) — Next.js 15 Storefront + Admin Dashboard  
**Framework:** Playwright (JavaScript/CommonJS)  
**Scope:** UI validation, API interception, ground-truth data validation, E2E flows, accessibility  
**Last updated:** June 2026

---

## Architecture Reference

| Service | URL | Notes |
|---|---|---|
| Medusa backend | `https://medusa.solception.com` | REST API + Admin at `/app` |
| Next.js storefront | `https://store.solception.com` | App Router, SSR + streaming |
| Admin API prefix | `/admin` | JWT Bearer auth required |
| Store API prefix | `/store` | `x-publishable-api-key` header required |
| PostgreSQL | `localhost:5432` | Primary datastore |
| Redis | `localhost:6379` | Session/cache |

---

## Phase 0 — Data Seeding Strategy (Run Before All Tests)

The storefront currently has 4 products. For meaningful testing coverage, seed the following via Admin API in a `global-setup.js` before any test suite runs.

### `fixtures/global-setup.js`

```js
const { request } = require('@playwright/test');

async function globalSetup() {
  const api = await request.newContext({
    baseURL: process.env.BACKEND_URL,
  });

  // Authenticate
  const authRes = await api.post('/auth/user/emailpass', {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
  });
  const { token } = await authRes.json();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Seed 20 products across 4 categories
  const categories = ['Tops', 'Bottoms', 'Accessories', 'Footwear'];
  for (const cat of categories) {
    await api.post('/admin/product-categories', { data: { name: cat }, headers });
  }

  // Create collections
  const collections = ['Summer Sale', 'New Arrivals', 'Best Sellers'];
  for (const col of collections) {
    await api.post('/admin/collections', { data: { title: col }, headers });
  }

  // Seed products with variants, prices, inventory
  const products = [
    { title: 'Classic Hoodie', handle: 'classic-hoodie', tags: ['hoodie', 'winter'] },
    { title: 'Running Shorts', handle: 'running-shorts', tags: ['sports', 'summer'] },
    { title: 'Leather Belt', handle: 'leather-belt', tags: ['accessories'] },
    { title: 'Canvas Sneakers', handle: 'canvas-sneakers', tags: ['footwear'] },
    { title: 'Wool Scarf', handle: 'wool-scarf', tags: ['winter', 'accessories'] },
    { title: 'Denim Jacket', handle: 'denim-jacket', tags: ['tops', 'outerwear'] },
    { title: 'Linen Shirt', handle: 'linen-shirt', tags: ['tops', 'summer'] },
    { title: 'Cargo Pants', handle: 'cargo-pants', tags: ['bottoms'] },
    { title: 'Baseball Cap', handle: 'baseball-cap', tags: ['accessories'] },
    { title: 'Ankle Boots', handle: 'ankle-boots', tags: ['footwear', 'winter'] },
  ];

  for (const p of products) {
    const res = await api.post('/admin/products', {
      data: {
        title: p.title,
        handle: p.handle,
        status: 'published',
        options: [{ title: 'Size', values: ['S', 'M', 'L', 'XL'] }],
        variants: [
          { title: 'S', sku: `${p.handle}-S`, prices: [{ amount: 2999, currency_code: 'eur' }], inventory_quantity: 50 },
          { title: 'M', sku: `${p.handle}-M`, prices: [{ amount: 2999, currency_code: 'eur' }], inventory_quantity: 100 },
          { title: 'L', sku: `${p.handle}-L`, prices: [{ amount: 2999, currency_code: 'eur' }], inventory_quantity: 75 },
          { title: 'XL', sku: `${p.handle}-XL`, prices: [{ amount: 3499, currency_code: 'eur' }], inventory_quantity: 25 },
        ],
        tags: p.tags.map(t => ({ value: t })),
      },
      headers,
    });
  }

  // Create a promotion/discount code
  await api.post('/admin/promotions', {
    data: {
      code: 'TEST10',
      type: 'standard',
      application_method: {
        type: 'percentage',
        value: 10,
        target_type: 'order',
      },
    },
    headers,
  });

  // Create a customer for auth tests
  await api.post('/admin/customers', {
    data: {
      email: process.env.CUSTOMER_EMAIL,
      password: process.env.CUSTOMER_PASSWORD,
      first_name: 'Test',
      last_name: 'Customer',
    },
    headers,
  });

  await api.dispose();
}

module.exports = globalSetup;
```

Add to `playwright.config.js`:
```js
globalSetup: require.resolve('./fixtures/global-setup.js'),
```

---

## `.env` — Complete Reference

```env
BACKEND_URL=https://medusa.solception.com
STOREFRONT_URL=https://store.solception.com
ADMIN_URL=https://medusa.solception.com/app
ADMIN_EMAIL=admin@medusa-test.com
ADMIN_PASSWORD=Admin12345
CUSTOMER_EMAIL=customer@test.com
CUSTOMER_PASSWORD=Customer12345
PUBLISHABLE_API_KEY=pk_a021de80d8cb765f44dab30ac85ea66ee3c7fe91e5e0fa07ac45829efe298629
COUNTRY_CODE=dk
TEST_PRODUCT_HANDLE=classic-hoodie
PROMO_CODE=TEST10
```

---

## Fixtures

### `fixtures/base.js` — Shared fixtures for all tests

```js
const { test: base, expect, request } = require('@playwright/test');
require('dotenv').config();

const test = base.extend({
  // Admin JWT token fixture
  adminToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/user/emailpass', {
      data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    });
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },

  // Admin API context
  adminApi: async ({ adminToken }, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      }
    });
    await use(ctx);
    await ctx.dispose();
  },

  // Store API context
  storeApi: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      }
    });
    await use(ctx);
    await ctx.dispose();
  },

  // Customer JWT token
  customerToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/customer/emailpass', {
      data: { email: process.env.CUSTOMER_EMAIL, password: process.env.CUSTOMER_PASSWORD }
    });
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },
});

module.exports = { test, expect };
```

### `helpers/cartApi.js` — Cart state helpers

```js
const { request } = require('@playwright/test');
require('dotenv').config();

async function createCartWithItem(productHandle = process.env.TEST_PRODUCT_HANDLE) {
  const api = await request.newContext({
    baseURL: process.env.BACKEND_URL,
    extraHTTPHeaders: { 'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY }
  });

  // Get region
  const regRes = await api.get('/store/regions');
  const { regions } = await regRes.json();
  const regionId = regions[0].id;

  // Create cart
  const cartRes = await api.post('/store/carts', {
    data: { region_id: regionId }
  });
  const { cart } = await cartRes.json();

  // Get product variant
  const prodRes = await api.get(`/store/products?handle=${productHandle}&fields=*variants`);
  const { products } = await prodRes.json();
  const variantId = products[0].variants[0].id;

  // Add line item
  await api.post(`/store/carts/${cart.id}/line-items`, {
    data: { variant_id: variantId, quantity: 1 }
  });

  await api.dispose();
  return cart.id;
}

module.exports = { createCartWithItem };
```

---

## File Structure

```
e2e/
├── fixtures/
│   ├── base.js                    ← shared fixtures
│   └── global-setup.js            ← data seeding
├── helpers/
│   ├── cartApi.js                 ← cart helpers
│   ├── adminApi.js                ← admin CRUD helpers
│   └── groundTruth.js             ← API fetch for data validation
├── pages/
│   ├── storefront/
│   │   ├── HomePage.js
│   │   ├── ProductListPage.js
│   │   ├── ProductDetailPage.js
│   │   ├── CartPage.js
│   │   ├── CheckoutPage.js
│   │   └── AccountPage.js
│   └── admin/
│       ├── AdminLoginPage.js
│       ├── ProductsPage.js
│       ├── OrdersPage.js
│       └── CustomersPage.js
├── tests/
│   ├── storefront/
│   │   ├── catalog.spec.js
│   │   ├── cart.spec.js
│   │   ├── checkout.spec.js
│   │   ├── account.spec.js
│   │   └── ground-truth.spec.js   ← API vs UI validation
│   ├── admin/
│   │   ├── auth.spec.js
│   │   ├── products.spec.js
│   │   ├── orders.spec.js
│   │   ├── customers.spec.js
│   │   ├── inventory.spec.js
│   │   ├── promotions.spec.js
│   │   └── regions.spec.js
│   ├── api/
│   │   ├── store-api.spec.js      ← pure API tests
│   │   ├── admin-api.spec.js
│   │   └── auth-api.spec.js
│   └── accessibility/
│       └── a11y.spec.js
├── playwright.config.js
└── .env
```

---

## SUITE 1 — Storefront: Product Catalog

### TC-CAT-001: Homepage loads with hero and product tiles
**Priority:** P1  
**API Ground Truth:** `GET /store/products?limit=4` → compare count against UI tiles visible  

**Steps:**
1. `page.goto('/')`
2. Intercept `GET /store/products` — assert response status 200
3. Assert hero section visible
4. Fetch products from API: `GET /store/products?fields=title,handle`
5. Assert each returned product title appears somewhere on the page

**Edge cases:**
- TC-CAT-001-E1: No products seeded → assert empty state renders without JS error
- TC-CAT-001-E2: Slow network — assert skeleton/loading state shown before content

---

### TC-CAT-002: Product listing — count matches API
**Priority:** P1  
**Ground Truth Test — API response count vs rendered cards**

**Steps:**
1. `GET /store/products?limit=100` via `storeApi` — record `count`
2. Navigate to `/{countryCode}/store`
3. Count rendered product cards
4. Assert UI count equals API `count` (within pagination window)

**Edge cases:**
- TC-CAT-002-E1: Invalid country code `/xx/store` → assert 404 or redirect
- TC-CAT-002-E2: `?collection_id=` filter → assert filtered results match API response

---

### TC-CAT-003: Product listing — titles match API exactly
**Priority:** P1  
**Ground Truth — field-level validation**

**Steps:**
1. Fetch `GET /store/products?fields=title,handle&limit=20` from API
2. Navigate to `/{countryCode}/store`
3. For each API product title, assert it appears in the rendered product grid
4. Assert no product in the UI has a title NOT returned by the API (no phantom data)

---

### TC-CAT-004: Product listing — sorting
**Priority:** P2

**Steps:**
1. Navigate to `/{countryCode}/store`
2. Intercept `GET /store/products?order=price` request
3. Click sort → "Price: Low to High"
4. Assert intercepted request includes `order=price` or equivalent
5. Extract rendered prices and assert ascending order

**Edge cases:**
- TC-CAT-004-E1: "Price: High to Low" → descending order
- TC-CAT-004-E2: "Newest" → `order=-created_at`

---

### TC-CAT-005: Product detail — data matches API
**Priority:** P1  
**Ground Truth — most important field-level test**

**Steps:**
1. Fetch `GET /store/products/{handle}?fields=*variants,*options,title,description,thumbnail` from `storeApi`
2. Navigate to `/{countryCode}/products/{handle}`
3. Assert page title text equals API `title`
4. Assert description text equals API `description`
5. Assert number of variant option buttons equals API `variants.length`
6. Assert price displayed matches API `variants[0].calculated_price.calculated_amount`

**Edge cases:**
- TC-CAT-005-E1: Out-of-stock variant (inventory 0) → assert "Add to cart" disabled
- TC-CAT-005-E2: Single variant → no option selector shown
- TC-CAT-005-E3: Nonexistent handle → 404 page, not JS crash

---

### TC-CAT-006: Product tags — filtering
**Priority:** P2

**Steps:**
1. `GET /store/product-tags` → get available tags
2. Navigate to store, apply a tag filter (if exposed in UI)
3. Assert products shown match `GET /store/products?tag_id[]={id}` response

---

### TC-CAT-007: Product categories — navigation and filtering
**Priority:** P2

**Steps:**
1. `GET /store/product-categories` → list categories
2. Navigate to a category page
3. Assert products shown match `GET /store/products?category_id[]={id}`
4. Assert category name in breadcrumb matches API `name`

---

### TC-CAT-008: Collections — page renders correct products
**Priority:** P2

**Steps:**
1. `GET /store/collections` → get collection list
2. Navigate to a collection URL
3. Fetch `GET /store/products?collection_id[]={id}` from API
4. Assert UI product count and titles match API response

---

### TC-CAT-009: Product variant selection updates price and image
**Priority:** P1

**Steps:**
1. Navigate to a multi-variant product
2. Fetch all variants from API: `GET /store/products/{handle}?fields=*variants`
3. For each variant size button in UI: click it
4. Assert displayed price matches the variant's API price for that option
5. Assert "Add to cart" button state matches variant's inventory status

---

### TC-CAT-010: Product quantity controls — boundary test
**Priority:** P2

**Steps:**
1. Navigate to product detail page
2. Assert quantity defaults to 1
3. Click increment → assert 2
4. Click decrement → assert 1
5. Click decrement again → assert still 1 (cannot go below 1)
6. Type `0` into quantity field → assert reset to 1 or error shown
7. Type quantity exceeding stock level → assert validation message appears

---

## SUITE 2 — Storefront: Cart

### TC-CART-001: Add to cart — UI and API in sync
**Priority:** P1

**Steps:**
1. Navigate to product detail page
2. Intercept `POST /store/carts/{id}/line-items` request
3. Click "Add to cart"
4. Assert intercepted request body contains correct `variant_id` and `quantity: 1`
5. Assert response status 200 and `line_items` array contains the added item
6. Assert cart badge in nav updates from 0 to 1
7. Open cart → assert item title, variant, and price match what was added

**Edge cases:**
- TC-CART-001-E1: Add same item twice → quantity becomes 2, not duplicate line item
- TC-CART-001-E2: Add two different products → two separate line items

---

### TC-CART-002: Cart line items match API state
**Priority:** P1  
**Ground Truth — API vs UI**

**Steps:**
1. Use `createCartWithItem()` helper to create cart with 3 known items via API
2. Set `_medusa_cart_id` cookie in browser to the created cart ID
3. Navigate to cart page
4. Fetch `GET /store/carts/{id}` from API — get `line_items`
5. Assert each line item title in UI matches API `line_items[n].title`
6. Assert each price in UI matches API `line_items[n].unit_price`
7. Assert cart subtotal in UI matches API `total`

---

### TC-CART-003: Update line item quantity
**Priority:** P2

**Steps:**
1. Create cart with item, navigate to cart page
2. Intercept `POST /store/carts/{id}/line-items/{line_item_id}` update
3. Click quantity increase
4. Assert request body has `quantity: 2`
5. Assert response `line_items[0].quantity` equals 2
6. Assert UI quantity and subtotal update accordingly

**Edge cases:**
- TC-CART-003-E1: Reduce to 0 → item removed from cart

---

### TC-CART-004: Remove item from cart
**Priority:** P1

**Steps:**
1. Navigate to cart with one item
2. Intercept `DELETE /store/carts/{id}/line-items/{line_item_id}`
3. Click remove icon
4. Assert response status 200
5. Assert item disappears from cart UI
6. Assert cart badge shows 0

---

### TC-CART-005: Cart persists across navigation (cookie-based)
**Priority:** P2

**Steps:**
1. Add item to cart
2. Navigate to home, then store, then back to cart
3. Assert item still in cart (cookie `_medusa_cart_id` carries state)

---

### TC-CART-006: Apply promotion code
**Priority:** P2

**Steps:**
1. Create cart with item, navigate to cart/checkout
2. Enter promo code `TEST10` in discount field
3. Intercept `POST /store/carts/{id}/promotions`
4. Assert request contains `promo_codes: ['TEST10']`
5. Assert API response `discounts` array includes the promotion
6. Assert UI shows discounted amount (10% off subtotal)

**Edge cases:**
- TC-CART-006-E1: Invalid code → assert error message "Invalid promo code"
- TC-CART-006-E2: Remove promotion → assert discount removed from total

---

### TC-CART-007: Cart region/currency matches active region
**Priority:** P2

**Steps:**
1. Fetch `GET /store/regions` → get active region and currency code
2. Add product to cart
3. In cart, assert displayed currency symbol matches region currency
4. Assert price is not `0.00` or blank

---

## SUITE 3 — Storefront: Checkout

### TC-CHK-001: Full guest checkout — happy path
**Priority:** P1 — primary E2E test

**Steps:**
1. Create cart with item via API, set cart cookie
2. Navigate to `/{countryCode}/checkout`
3. Intercept `POST /store/carts/{id}` (update email step)
4. Enter guest email address
5. Fill shipping address (first name, last name, address 1, city, postal code, country)
6. Click "Continue to delivery"
7. Intercept `GET /store/shipping-options?cart_id={id}` — assert options returned
8. Select first shipping option
9. Intercept `POST /store/payment-collections` — assert payment collection created
10. Select "Manual" payment provider
11. Click "Place order"
12. Intercept `POST /store/carts/{id}/complete` — assert response contains `order`
13. Assert order confirmation page loads with order ID
14. Fetch `GET /store/orders/{id}` from API — assert order status is `pending`

**Edge cases:**
- TC-CHK-001-E1: Missing required field → inline validation, form doesn't progress
- TC-CHK-001-E2: Invalid postal code → validation error on field
- TC-CHK-001-E3: No shipping option for country → informative error shown

---

### TC-CHK-002: Checkout email validation
**Priority:** P2

**Steps:**
1. Enter `notanemail` in email field
2. Attempt to continue
3. Assert inline format error appears
4. Correct to valid email → assert error clears

---

### TC-CHK-003: Shipping options from API match UI
**Priority:** P2  
**Ground Truth**

**Steps:**
1. Create cart, navigate to shipping step
2. Intercept `GET /store/shipping-options` response — collect option names and prices
3. Assert each API shipping option name appears in UI
4. Assert each price shown in UI matches API `amount`

---

### TC-CHK-004: Back navigation preserves form state
**Priority:** P2

**Steps:**
1. Fill address step fully and proceed to shipping
2. Click back
3. Assert all address fields still populated with entered values

---

### TC-CHK-005: Authenticated checkout — saved address pre-fill
**Priority:** P2

**Steps:**
1. Log in as customer with saved address (added via API in global setup)
2. Add product to cart, navigate to checkout
3. Assert saved address option is shown
4. Select saved address
5. Assert form fields populated from address data
6. Complete checkout normally

---

### TC-CHK-006: Order created in admin after checkout
**Priority:** P1  
**Ground Truth — E2E cross-system validation**

**Steps:**
1. Complete a full guest checkout (TC-CHK-001)
2. Extract order ID from confirmation page
3. Authenticate with Admin API: `GET /admin/orders/{id}`
4. Assert admin API returns the order with matching total, items, and customer email
5. Assert order status in admin matches storefront confirmation

---

## SUITE 4 — Storefront: Customer Account

### TC-AUTH-001: Customer registration
**Priority:** P1

**Steps:**
1. Navigate to `/{countryCode}/account`
2. Click "Create account"
3. Fill: first name, last name, email (unique), password
4. Intercept `POST /auth/customer/emailpass` — assert status 200
5. Assert redirect to account dashboard
6. Fetch `GET /store/customers/me` with returned token — assert email matches

**Edge cases:**
- TC-AUTH-001-E1: Existing email → "Email already in use" error
- TC-AUTH-001-E2: Short password → inline validation
- TC-AUTH-001-E3: Missing required field → validation before submit

---

### TC-AUTH-002: Customer login
**Priority:** P1

**Steps:**
1. Navigate to account login
2. Enter valid credentials
3. Intercept `POST /auth/customer/emailpass` — assert token in response
4. Assert redirect to account dashboard
5. Assert account nav shows logged-in state (name/email visible)

**Edge cases:**
- TC-AUTH-002-E1: Wrong password → "Invalid credentials", no redirect
- TC-AUTH-002-E2: Non-existent email → same generic error (no enumeration)
- TC-AUTH-002-E3: Empty fields → required field indicators

---

### TC-AUTH-003: Customer logout
**Priority:** P1

**Steps:**
1. Log in as customer
2. Navigate to account → click logout
3. Assert redirect to login or home
4. Navigate directly to `/{countryCode}/account` → assert redirect to login

---

### TC-AUTH-004: View order history — ground truth
**Priority:** P2

**Steps:**
1. Log in as customer who has placed an order
2. Navigate to `/{countryCode}/account/orders`
3. Fetch `GET /store/orders?customer_id={id}` from API
4. Assert each order in UI matches API: order ID, date, total
5. Click an order → assert line items match API `items`

---

### TC-AUTH-005: Add and manage saved address
**Priority:** P2

**Steps:**
1. Log in as customer
2. Navigate to account addresses
3. Click "Add address" → fill form → save
4. Intercept `POST /store/customers/me/addresses` — assert request body matches form
5. Assert address appears in address list
6. Edit address city → assert `POST /store/customers/me/addresses/{id}` called with new city
7. Delete address → assert removed from list and `DELETE /store/customers/me/addresses/{id}` called

---

### TC-AUTH-006: Account profile update
**Priority:** P2

**Steps:**
1. Log in as customer
2. Navigate to account profile
3. Update first name
4. Assert `POST /store/customers/me` called with new first name
5. Reload page → assert updated name persists (fetched fresh from API)

---

## SUITE 5 — Admin Dashboard

### TC-ADM-001: Admin login
**Priority:** P1

**Steps:**
1. Navigate to `https://medusa.solception.com/app/login`
2. Enter admin credentials
3. Intercept `POST /auth/user/emailpass` — assert token returned
4. Assert redirect to `/app` dashboard
5. Assert admin email visible in sidebar

**Edge cases:**
- TC-ADM-001-E1: Wrong password → error message, no redirect
- TC-ADM-001-E2: Empty fields → required field indicators

---

### TC-ADM-002: Product list — count matches API
**Priority:** P1  
**Ground Truth**

**Steps:**
1. Fetch `GET /admin/products?limit=100` with admin token — record `count`
2. Navigate to `/app/products`
3. Assert count shown in UI matches API `count`
4. Assert each product title from API appears in the product table

---

### TC-ADM-003: Create product — full flow with ground truth
**Priority:** P1

**Steps:**
1. Navigate to `/app/products` → click "Create product"
2. Fill: title, handle, description
3. Add variant with size "M", SKU `test-product-M`, price €29.99
4. Set status to "Published"
5. Click Save
6. Extract product ID from redirect URL
7. Fetch `GET /admin/products/{id}` — assert title, status, variant count match what was entered
8. Navigate to storefront `/{countryCode}/store` — assert new product visible

**Edge cases:**
- TC-ADM-003-E1: Duplicate handle → validation error
- TC-ADM-003-E2: Missing title → inline validation
- TC-ADM-003-E3: Negative price → validation error

---

### TC-ADM-004: Edit product — changes reflected on storefront
**Priority:** P1  
**Cross-system ground truth**

**Steps:**
1. Via Admin API, note current product description for `TEST_PRODUCT_HANDLE`
2. Navigate to product in admin, edit description to a unique string
3. Save → assert success notification
4. Fetch `GET /admin/products/{id}` — assert description updated
5. Navigate to storefront product detail page
6. Assert new description is shown (may require cache bust or wait for revalidation)

---

### TC-ADM-005: Draft/publish product — storefront visibility
**Priority:** P1  
**Cross-system E2E**

**Steps:**
1. Navigate to a published product in admin
2. Change status to "Draft" → Save
3. Fetch `GET /admin/products/{id}` — assert `status: 'draft'`
4. Navigate to storefront `/{countryCode}/store`
5. Assert the drafted product is NOT visible (not returned by `GET /store/products`)
6. Change back to "Published" → assert reappears on storefront

---

### TC-ADM-006: Inventory management — stock level sync
**Priority:** P2  
**Ground Truth**

**Steps:**
1. Fetch `GET /admin/inventory-items?variant_id={id}` — record stock level
2. Navigate to `/app/inventory` → find the inventory item
3. Assert UI stock level matches API quantity
4. Update stock to a new value via UI
5. Fetch API again — assert updated quantity matches

---

### TC-ADM-007: Order list — ground truth
**Priority:** P1

**Steps:**
1. Fetch `GET /admin/orders?limit=50` — record order IDs and statuses
2. Navigate to `/app/orders`
3. Assert each order ID from API appears in the table
4. Assert order status badges match API `status` field

---

### TC-ADM-008: Order detail and fulfillment
**Priority:** P2

**Steps:**
1. Navigate to a `pending` order in admin
2. Assert order detail shows correct items, customer email, and total (vs API)
3. Click "Create fulfillment"
4. Assert fulfillment items listed match order items
5. Confirm fulfillment
6. Fetch `GET /admin/orders/{id}` — assert `fulfillment_status` changed to `fulfilled`
7. Assert order status badge in UI updated

---

### TC-ADM-009: Customer list — ground truth
**Priority:** P2

**Steps:**
1. Fetch `GET /admin/customers?limit=50` — record count and email list
2. Navigate to `/app/customers`
3. Assert customer count matches API
4. Assert each email from API appears in the customer table
5. Click a customer → assert detail shows name, email, order count matching API

---

### TC-ADM-010: Promotions — create and verify
**Priority:** P2

**Steps:**
1. Navigate to `/app/promotions` → click "Create promotion"
2. Enter code `SUMMER20`, type `percentage`, value `20`
3. Save → assert success
4. Fetch `GET /admin/promotions?code=SUMMER20` — assert promotion exists
5. On storefront, add item to cart and apply code `SUMMER20`
6. Assert 20% discount reflected in cart total

---

### TC-ADM-011: Regions — configure country and currency
**Priority:** P2

**Steps:**
1. Fetch `GET /admin/regions` — get current region config
2. Navigate to `/app/settings/regions`
3. Assert region names, currencies, and countries in UI match API response
4. Add a new region via UI → assert `POST /admin/regions` called
5. Fetch regions again → assert new region in response

---

### TC-ADM-012: Sales channels — product assignment
**Priority:** P2

**Steps:**
1. Fetch `GET /admin/sales-channels` — get default sales channel
2. Navigate to a product → verify it's assigned to Default Sales Channel
3. Unassign from sales channel → save
4. Fetch `GET /store/products/{handle}` — assert product no longer returned (not in publishable key's channel)
5. Re-assign → assert product returns in store API response

---

### TC-ADM-013: Price lists — segment pricing
**Priority:** P3

**Steps:**
1. Navigate to `/app/pricing` → create a price list for "VIP customers"
2. Add override price for a product variant (lower than standard)
3. Save → fetch `GET /admin/price-lists` — assert price list created
4. As a customer in the VIP group, add product to cart
5. Assert discounted price shown (not standard price)

---

### TC-ADM-014: Admin logout — session invalidated
**Priority:** P1

**Steps:**
1. Log in as admin
2. Click logout
3. Assert redirect to `/app/login`
4. Attempt `GET /admin/products` with previous token — assert 401 Unauthorized
5. Navigate directly to `/app/products` → assert redirect to login

---

## SUITE 6 — Pure API Tests (No UI)

These run headlessly using Playwright's `request` context, validating the API contract directly.

### TC-API-001: Store products — pagination
**Priority:** P2

**Steps:**
1. `GET /store/products?limit=2&offset=0` → assert exactly 2 products returned
2. `GET /store/products?limit=2&offset=2` → assert next 2 products (different IDs)
3. Assert `count` field is consistent across both responses
4. Assert no duplicate product IDs across pages

---

### TC-API-002: Store products — field selection
**Priority:** P2

**Steps:**
1. `GET /store/products?fields=title,handle` → assert response contains ONLY `title`, `handle`, `id`
2. `GET /store/products?fields=*variants` → assert each product has `variants` array
3. `GET /store/products?fields=-handle` → assert `handle` field absent from response

---

### TC-API-003: Store auth — JWT token lifecycle
**Priority:** P1

**Steps:**
1. `POST /auth/customer/emailpass` with valid credentials → assert token returned
2. `GET /store/customers/me` with token → assert 200 and customer data
3. `GET /store/customers/me` without token → assert 401
4. `DELETE /auth/session` → assert session cleared
5. `GET /store/customers/me` again → assert 401

---

### TC-API-004: Admin products — CRUD lifecycle
**Priority:** P1

**Steps:**
1. `POST /admin/products` → create product → assert 200, capture `id`
2. `GET /admin/products/{id}` → assert all fields match creation payload
3. `POST /admin/products/{id}` → update title → assert updated title in response
4. `DELETE /admin/products/{id}` → assert 200
5. `GET /admin/products/{id}` → assert 404

---

### TC-API-005: Store cart lifecycle
**Priority:** P1

**Steps:**
1. `POST /store/carts` → create cart → capture `id`
2. `GET /store/carts/{id}` → assert `line_items` is empty array
3. Add line item → assert cart updated
4. Update line item quantity → assert `quantity` in response updated
5. Delete line item → assert `line_items` empty again
6. `POST /store/carts/{id}/complete` with payment → assert order returned

---

### TC-API-006: Admin order filtering and sorting
**Priority:** P2

**Steps:**
1. `GET /admin/orders?status[]=pending` → assert all returned orders have `status: pending`
2. `GET /admin/orders?order=-created_at` → assert orders sorted newest first
3. `GET /admin/orders?q={customer_email}` → assert only orders for that customer returned
4. `GET /admin/orders?limit=5&offset=0` → assert exactly 5 returned

---

### TC-API-007: Publishable API key — scope enforcement
**Priority:** P1

**Steps:**
1. `GET /store/products` WITHOUT `x-publishable-api-key` header → assert 400 or 401
2. `GET /store/products` with invalid key → assert 401
3. `GET /store/products` with valid key → assert 200 and products returned

---

### TC-API-008: Region and currency validation
**Priority:** P2

**Steps:**
1. `GET /store/regions` → assert at least one region returned
2. Assert each region has `currency_code`, `countries`, and `id`
3. `GET /store/currencies` → assert currency list includes region's currency
4. Create cart specifying region → assert cart `currency_code` matches region

---

## SUITE 7 — Ground Truth: API vs UI Validation

These tests are the most valuable for catching data integrity issues. They always fetch from the API first, then verify the UI matches exactly.

### TC-GT-001: Product prices — API vs storefront display
**Priority:** P1

**Steps:**
1. Fetch `GET /store/products?fields=*variants,*variants.prices&limit=10`
2. For each product, navigate to its detail page
3. Assert displayed price matches `variants[0].calculated_price.calculated_amount / 100` formatted as currency
4. Select each variant size → assert price updates to match that variant's API price

---

### TC-GT-002: Cart totals — API vs UI
**Priority:** P1

**Steps:**
1. Create cart with 3 items of known quantities via API
2. Open cart in browser
3. Fetch `GET /store/carts/{id}` → extract `subtotal`, `shipping_total`, `tax_total`, `total`
4. Assert each value shown in UI matches API (allow ±1 cent for floating point)

---

### TC-GT-003: Order confirmation — API vs UI
**Priority:** P1

**Steps:**
1. Complete checkout → land on confirmation page
2. Extract order ID shown in UI
3. Fetch `GET /store/orders/{id}` from API
4. Assert order number, total, line items, and email shown in UI match API response

---

### TC-GT-004: Customer profile — API vs UI
**Priority:** P2

**Steps:**
1. Log in as customer
2. Fetch `GET /store/customers/me` → extract first name, last name, email
3. Navigate to account profile page
4. Assert each displayed field matches API value exactly

---

### TC-GT-005: Admin order count — API vs UI badge
**Priority:** P2

**Steps:**
1. Fetch `GET /admin/orders?limit=1` → extract `count`
2. Navigate to `/app/orders`
3. Assert count shown in orders table header/badge matches API `count`

---

### TC-GT-006: Inventory levels — Admin API vs UI
**Priority:** P2

**Steps:**
1. Fetch `GET /admin/inventory-items` → get stock quantities for 5 variants
2. Navigate to `/app/inventory`
3. For each item, assert UI stock number matches API `stocked_quantity`

---

## SUITE 8 — Negative and Security Tests

### TC-NEG-001: Direct checkout without cart
**Priority:** P2  
Navigate to `/{countryCode}/checkout` with no cart cookie → assert redirect or informative error, not broken page.

---

### TC-NEG-002: Nonexistent product handle
**Priority:** P2  
Navigate to `/products/this-does-not-exist` → assert 404 page renders, no JS error in console.

---

### TC-NEG-003: Add out-of-stock variant via API
**Priority:** P2

**Steps:**
1. Via admin API, set a variant's inventory to 0
2. Attempt `POST /store/carts/{id}/line-items` with that variant ID
3. Assert API returns error (not 200)
4. Assert storefront "Add to cart" button is disabled for that variant

---

### TC-NEG-004: Unauthorized admin API access
**Priority:** P1

**Steps:**
1. `GET /admin/products` without auth header → assert 401
2. `GET /admin/orders` with customer token (not admin) → assert 403
3. `DELETE /admin/products/{id}` without auth → assert 401

---

### TC-NEG-005: Admin protected routes without session
**Priority:** P1

**Steps:**
1. Navigate to `https://medusa.solception.com/app/products` without logging in
2. Assert redirect to `/app/login`
3. Navigate to `/app/orders` → assert same redirect

---

### TC-NEG-006: XSS in product title — admin input
**Priority:** P2

**Steps:**
1. Create product with title containing `<script>alert('xss')</script>`
2. View product on storefront
3. Assert title is rendered as escaped text, not executed
4. Assert no alert dialog appears

---

### TC-NEG-007: Malformed cart ID in URL
**Priority:** P2  
Set cookie `_medusa_cart_id=not-a-real-id` → navigate to checkout → assert graceful error, not crash.

---

### TC-NEG-008: Pagination beyond available records
**Priority:** P2  
`GET /store/products?offset=99999` → assert `products: []` returned with status 200, not 500.

---

## SUITE 9 — Accessibility (axe-core)

### Setup

```bash
npm install @axe-core/playwright
```

```js
// In test file
const { checkA11y, injectAxe } = require('axe-playwright');
```

### TC-A11Y-001 through TC-A11Y-007

**Pages to scan:**

| TC | Page | Priority |
|---|---|---|
| TC-A11Y-001 | Home `/` | P2 |
| TC-A11Y-002 | Product listing `/{cc}/store` | P2 |
| TC-A11Y-003 | Product detail `/{cc}/products/{handle}` | P2 |
| TC-A11Y-004 | Cart `/{cc}/cart` | P2 |
| TC-A11Y-005 | Checkout `/{cc}/checkout` | P2 |
| TC-A11Y-006 | Account login `/{cc}/account` | P3 |
| TC-A11Y-007 | Admin login `/app/login` | P3 |

**Standard approach for each:**
```js
await page.goto(url);
await page.waitForLoadState('networkidle');
await injectAxe(page);
await checkA11y(page, null, {
  detailedReport: true,
  axeOptions: {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-access': { enabled: true },
    }
  }
});
```

---

## SUITE 10 — Performance Monitoring

### TC-PERF-001: API response time SLA
**Priority:** P3

**Steps:**
1. Time `GET /store/products` → assert response < 2000ms
2. Time `GET /store/products/{handle}` → assert < 1500ms
3. Time `POST /store/carts` → assert < 2000ms
4. Time `POST /store/carts/{id}/line-items` → assert < 2000ms

---

### TC-PERF-002: Storefront page load time
**Priority:** P3

**Steps:**
1. Use Playwright's `page.metrics()` after navigation
2. Assert homepage `DOMContentLoaded` < 3000ms
3. Assert product listing `networkidle` < 5000ms

---

## Test Data Strategy

| Data Type | Source | Value |
|---|---|---|
| Admin credentials | `.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Customer credentials | `.env` + global setup | `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD` |
| Publishable API key | `.env` | `PUBLISHABLE_API_KEY` |
| Country code | `.env` | `COUNTRY_CODE=dk` |
| Test product handle | `.env` + global setup | `TEST_PRODUCT_HANDLE=classic-hoodie` |
| Promo code | `.env` + global setup | `PROMO_CODE=TEST10` |
| Cart setup | `helpers/cartApi.js` | API-seeded cart before tests |
| Auth state | Playwright `storageState` | Persist login cookies across tests |

---

## Key Differences vs Original Plan

| Area | Original | Expanded |
|---|---|---|
| Data | 4 products | 14+ products, categories, collections, promotions via API seed |
| Test types | UI only | UI + API + Ground Truth + Security + Performance |
| Validation depth | Element visible | Field-level API vs UI comparison |
| Cart setup | Manual via UI | API-seeded for speed and reliability |
| Admin coverage | Basic CRUD | Inventory, promotions, regions, sales channels, price lists |
| API testing | None | Full CRUD lifecycle, pagination, field selection, auth |
| Ground truth | None | 6 dedicated cross-system validation suites |
| Security | None | Auth bypass, XSS, unauthorized access |
| Accessibility | 5 pages | 7 pages with detailed axe config |
| Performance | None | API SLA and page load assertions |
