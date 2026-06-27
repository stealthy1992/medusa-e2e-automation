# Medusa v2 — Playwright Test Plan
**Target:** Medusa v2 (current as of v2.15.x) — Next.js 15 Storefront + Admin Dashboard  
**Framework:** Playwright (JavaScript/CommonJS)  
**Scope:** QA-only — verifying behavior, not modifying application code  
**Last updated:** June 2026

---

## Architecture Reference (Verified)

Before building tests, confirm the running environment matches this structure:

| Service | Port | Notes |
|---|---|---|
| Medusa backend (Node.js) | 9000 | REST API + Admin dashboard served at `/app` |
| Next.js storefront | 8000 | App Router, SSR + client components |
| PostgreSQL | 5432 | Primary datastore (not MariaDB — this is a key change from OpenCart) |
| Redis | 6379 | Session/cache |

**Auth model (v2 — different from OpenCart's session cookies):**
- Store customers: `POST /store/auth` → JWT Bearer token + `x-publishable-api-key` header required on all store requests
- Admin users: `POST /auth/user/emailpass` → JWT Bearer token; alternatively API token via Basic auth
- Customer and admin auth are entirely separate identity systems
- Publishable API key must be set in the storefront env (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`) — missing key causes all dynamic pages to return empty data

**Storefront URL structure (Next.js App Router):**
```
/                          → home / hero
/[countryCode]/store       → product listing
/[countryCode]/products/[handle]  → product detail
/[countryCode]/cart        → cart drawer / cart page
/[countryCode]/checkout    → multi-step checkout
/[countryCode]/account     → customer account (login gate)
/[countryCode]/account/orders    → order history
```

**Admin dashboard URL structure (served from backend at :9000/app):**
```
/app/login                 → admin login
/app/products              → product list
/app/products/[id]         → product detail/edit
/app/orders                → order list
/app/orders/[id]           → order detail
/app/customers             → customer list
/app/categories            → product categories
/app/collections           → collections
/app/pricing               → price lists
/app/inventory             → inventory
/app/settings/regions      → regions & countries
/app/settings/store        → store settings
```

---

## Test Configuration Notes

```javascript
// playwright.config.js — recommended baseline
module.exports = {
  use: {
    baseURL: 'http://localhost:8000',         // storefront
    // Admin tests use a separate project targeting port 9000
  },
  projects: [
    { name: 'storefront', use: { baseURL: 'http://localhost:8000' } },
    { name: 'admin',      use: { baseURL: 'http://localhost:9000' } },
  ]
}
```

**Key selector challenges vs OpenCart:**
- Next.js App Router uses React Server Components — some content is streamed; use `waitForLoadState('networkidle')` or specific element waits rather than `domcontentloaded`
- Country-code prefix in URLs: tests must know the active region's country code (e.g., `/us/store`). Recommend a `BASE_COUNTRY` env var or a fixture that reads the active region from the API
- Cart state is managed via a `_medusa_cart_id` cookie — not a server session; tests that need a pre-populated cart should set this up via API or storage state
- Admin dashboard is a React SPA (Vite-built) — route changes are client-side, not full page loads; use `waitForURL` after navigation actions

---

## SUITE 1 — Storefront: Product Catalog

### TC-CAT-001: Home page loads and displays featured products
**Priority:** P1  
**Flow:** Navigate to `/` → verify hero section renders → verify at least one product/collection tile is visible

**Steps:**
1. `page.goto('/')`
2. Assert hero/banner element is visible (likely `[data-testid="hero"]` or `h1` in hero section)
3. Assert at least one product card is visible in a featured/collection section

**Edge cases:**
- TC-CAT-001-E1: No products seeded — verify graceful empty state rather than JS error

---

### TC-CAT-002: Product listing page renders catalog with correct country code prefix
**Priority:** P1  
**Flow:** Navigate to `/{countryCode}/store` → verify grid of product cards → verify each card shows title and price

**Steps:**
1. Navigate to `/{countryCode}/store`
2. Assert product grid is visible
3. Assert each visible card has a non-empty title
4. Assert each visible card has a price element with currency symbol

**Edge cases:**
- TC-CAT-002-E1: Navigate with an invalid country code (e.g., `/xx/store`) — verify redirect or 404 behavior rather than a broken page
- TC-CAT-002-E2: Collection/category filter param in URL (e.g., `?collection_id=...`) — verify filtered results render

---

### TC-CAT-003: Product listing page — sorting
**Priority:** P2  
**Flow:** Open sort dropdown → select "Price: Low to High" → verify order changes

**Steps:**
1. Navigate to `/{countryCode}/store`
2. Click sort control
3. Select "Price: Low to High" option
4. Wait for results to update
5. Assert first displayed price is less than or equal to last displayed price (extract text, parse, compare)

**Edge cases:**
- TC-CAT-003-E1: "Price: High to Low" — verify descending order
- TC-CAT-003-E2: Sort by "Newest" — verify URL param updates

---

### TC-CAT-004: Product detail page — variant selection
**Priority:** P1  
**Flow:** Click a product card → product detail page loads → select available options (size, color) → verify price and image update

**Steps:**
1. Navigate to `/{countryCode}/store`
2. Click first product card
3. Assert URL changes to `/products/[handle]`
4. Assert product title, description, and price are visible
5. If variant selectors exist, click a size/color option
6. Assert price element updates (or stays same for single-variant products)
7. Assert "Add to cart" button is enabled for an in-stock variant

**Edge cases:**
- TC-CAT-004-E1: Out-of-stock variant — assert "Add to cart" is disabled and an out-of-stock label is displayed
- TC-CAT-004-E2: Product with a single variant — assert no variant selector is shown and button is enabled by default
- TC-CAT-004-E3: Product with multiple images — assert clicking thumbnail updates main image

---

### TC-CAT-005: Product detail page — quantity controls
**Priority:** P2  
**Flow:** On product detail page → increment and decrement quantity → verify quantity input reflects changes → boundary test at 1

**Steps:**
1. Navigate to a product detail page
2. Assert quantity control defaults to 1
3. Click increment (+) → assert value becomes 2
4. Click decrement (−) → assert value returns to 1
5. Click decrement again → assert value stays at 1 (cannot go below 1)

**Edge cases:**
- TC-CAT-005-E1: Type a value directly into quantity field → type `0` → verify reset to 1 or inline error
- TC-CAT-005-E2: Type a value exceeding stock quantity → verify validation message

---

## SUITE 2 — Storefront: Cart

### TC-CART-001: Add product to cart
**Priority:** P1  
**Flow:** Product detail page → "Add to cart" → verify cart indicator updates → open cart → verify item listed

**Steps:**
1. Navigate to a product detail page (with in-stock variant selected)
2. Click "Add to cart"
3. Assert cart icon/badge in nav updates (count changes from 0 to 1)
4. Open cart (click cart icon or navigate to cart page)
5. Assert added product appears in cart with correct title, variant, and price

**Edge cases:**
- TC-CART-001-E1: Add same item twice → assert quantity in cart increments to 2 rather than creating duplicate line items
- TC-CART-001-E2: Add two different products → assert both appear as separate line items

---

### TC-CART-002: Update item quantity in cart
**Priority:** P2  
**Flow:** Cart page → increase item quantity → verify subtotal updates

**Steps:**
1. Set up cart with one item (via prior add or API-seeded cart)
2. Navigate to cart page
3. Click quantity increase on the line item
4. Assert quantity display updates
5. Assert cart subtotal updates proportionally

**Edge cases:**
- TC-CART-002-E1: Reduce quantity to 0 → verify item is removed (or a "Remove" confirmation is shown)

---

### TC-CART-003: Remove item from cart
**Priority:** P1  
**Flow:** Cart page → click remove/trash icon → item disappears → cart shows empty state if last item

**Steps:**
1. Navigate to cart with at least one item
2. Click remove on the line item
3. Assert item no longer appears in cart list
4. If cart is now empty, assert empty cart message/state is displayed
5. Assert cart badge in nav updates to 0

---

### TC-CART-004: Cart persists across page navigation
**Priority:** P2  
**Flow:** Add item to cart → navigate away to home → navigate back to cart page → item still present

**Steps:**
1. Add item to cart
2. Navigate to home page
3. Navigate to `/{countryCode}/store`
4. Navigate to cart
5. Assert item is still in cart (cart ID cookie carries state)

---

### TC-CART-005: Cart region/currency awareness
**Priority:** P2  
**Flow:** Verify price displayed in cart matches the storefront's active region currency

**Steps:**
1. Check active region (e.g., US → USD)
2. Add product to cart
3. In cart, assert currency symbol matches region (e.g., `$` for USD, `€` for EUR)
4. Assert price is not `0.00` or blank

---

## SUITE 3 — Storefront: Checkout

> **Note:** The v2 checkout flow has discrete steps: Email → Address → Shipping → Payment → Confirm. These may be combined differently by the starter's implementation. Verify the actual step structure against the running storefront before finalizing selectors.

### TC-CHK-001: Guest checkout — complete happy path (manual/system payment provider)
**Priority:** P1 — this is the primary end-to-end test  
**Setup:** System payment provider configured; at least one shipping option configured in the active region

**Steps:**
1. Add a product to cart
2. Navigate to `/{countryCode}/checkout`
3. Enter guest email address
4. Fill shipping address form: first name, last name, address line 1, city, postal code, country (must match cart's region)
5. Click "Continue to delivery"
6. Assert shipping options are displayed
7. Select a shipping option
8. Click "Continue to payment"
9. Assert payment providers are displayed
10. Select "Manual" / system payment provider
11. Click "Place order" / "Complete checkout"
12. Assert order confirmation page loads with an order number/ID
13. Assert confirmation email address shown matches the entered email

**Edge cases:**
- TC-CHK-001-E1: Required address field left blank → assert inline validation error on that field, form does not progress
- TC-CHK-001-E2: Invalid postal code format for selected country → assert validation error
- TC-CHK-001-E3: No shipping option available for selected country → assert informative error state

---

### TC-CHK-002: Checkout — email field validation
**Priority:** P2

**Steps:**
1. Enter invalid email format (e.g., `notanemail`)
2. Attempt to continue
3. Assert inline email format validation error
4. Correct email → assert error clears and progression is allowed

---

### TC-CHK-003: Checkout — country selection restricted to region
**Priority:** P2  
**Flow:** Country dropdown only shows countries belonging to the active region

**Steps:**
1. Navigate to checkout
2. Open country dropdown
3. Assert countries listed match the active region's configured countries
4. Assert a country from a different region is absent from the list

---

### TC-CHK-004: Checkout — back navigation preserves form state
**Priority:** P2  
**Flow:** Fill address step → proceed to shipping → click back → address fields still populated

**Steps:**
1. Fill all address fields and proceed to shipping step
2. Click back/previous button
3. Assert address fields still contain the previously entered values

---

### TC-CHK-005: Authenticated checkout — saved address pre-fill
**Priority:** P2  
**Prerequisite:** Logged-in customer with a saved address

**Steps:**
1. Log in as a customer with a previously saved address
2. Add product to cart and navigate to checkout
3. Assert option to select saved address is shown
4. Select the saved address
5. Assert form populates with saved address values
6. Proceed through checkout normally

---

## SUITE 4 — Storefront: Customer Account

### TC-AUTH-001: Customer registration
**Priority:** P1  
**Flow:** Navigate to account page → click "Register" → fill form → submit → logged in state

**Steps:**
1. Navigate to `/{countryCode}/account`
2. Click "Create account" / register link
3. Fill: first name, last name, email, password
4. Submit registration form
5. Assert redirect to account dashboard or confirmation state
6. Assert user's name or email is displayed in account header

**Edge cases:**
- TC-AUTH-001-E1: Email already registered → assert "Email already in use" error
- TC-AUTH-001-E2: Password too short (if validation exists) → assert inline validation
- TC-AUTH-001-E3: Required field missing → assert validation before submission

---
---+-+-+
### TC-AUTH-002: Customer login
**Priority:** P1

**Steps:**
1. Navigate to `/{countryCode}/account`
2. Enter valid email and password
3. Click "Sign in"
4. Assert redirect to account dashboard
5. Assert auth state (account nav shows logged-in state)

**Edge cases:**
- TC-AUTH-002-E1: Wrong password → assert "Invalid credentials" error, no redirect
- TC-AUTH-002-E2: Non-existent email → assert same generic error (no email enumeration)
- TC-AUTH-002-E3: Empty fields → assert required field validation

---

### TC-AUTH-003: Customer logout
**Priority:** P1

**Steps:**
1. Log in as customer
2. Navigate to account
3. Click logout
4. Assert redirect to login page or home
5. Assert cart and account state are cleared (nav shows logged-out state)
6. Attempt to navigate directly to `/{countryCode}/account` → assert redirect to login

---

### TC-AUTH-004: Order history — view past orders
**Priority:** P2  
**Prerequisite:** Customer account with at least one completed order

**Steps:**
1. Log in as customer with prior order
2. Navigate to `/{countryCode}/account/orders`
3. Assert order list is displayed with at least one entry
4. Assert each order shows order ID/number, date, and total amount
5. Click an order → assert order detail view opens with correct line items

---

### TC-AUTH-005: Account — add and manage saved address
**Priority:** P2

**Steps:**
1. Log in as customer
2. Navigate to account addresses section
3. Click "Add address"
4. Fill address form and save
5. Assert new address appears in address list
6. Click edit on the address → modify city → save
7. Assert updated city is displayed
8. Click delete → confirm
9. Assert address is removed from list

---

## SUITE 5 — Admin Dashboard

> **Note:** Admin tests target port 9000 (`http://localhost:9000/app`). Admin is a React SPA — all navigation after login is client-side.

### TC-ADM-001: Admin login
**Priority:** P1

**Steps:**
1. Navigate to `http://localhost:9000/app/login`
2. Enter admin email and password
3. Click "Sign in"
4. Assert redirect to `/app` dashboard
5. Assert admin name or email visible in sidebar/header

**Edge cases:**
- TC-ADM-001-E1: Wrong password → assert error message, no redirect
- TC-ADM-001-E2: Empty fields → assert required field indicators

---

### TC-ADM-002: Product management — create a new product
**Priority:** P1

**Steps:**
1. Log in as admin
2. Navigate to `/app/products`
3. Click "Create product" / "New product"
4. Fill required fields: Title, handle (auto-generated or manual)
5. Add a variant: title, SKU, price (at least one currency/region)
6. Set status to "Published"
7. Click Save
8. Assert redirect to product detail page
9. Assert product title appears on the detail page
10. Navigate to `/app/products` → assert new product appears in list

**Edge cases:**
- TC-ADM-002-E1: Duplicate handle → assert validation error
- TC-ADM-002-E2: Missing required title → assert inline validation, form does not submit
- TC-ADM-002-E3: Variant with negative price → assert validation error

---

### TC-ADM-003: Product management — edit existing product
**Priority:** P1

**Steps:**
1. Navigate to an existing product in admin
2. Click edit / click into the title field
3. Modify the product description
4. Save changes
5. Assert success notification
6. Reload the page → assert updated description persists

---

### TC-ADM-004: Product management — change product status (draft/published)
**Priority:** P2

**Steps:**
1. Navigate to a published product
2. Change status to "Draft"
3. Save
4. Navigate to storefront product listing
5. Assert the drafted product is no longer visible to an unauthenticated visitor

---

### TC-ADM-005: Order management — view order list
**Priority:** P1

**Steps:**
1. Navigate to `/app/orders`
2. Assert order list table renders
3. Assert columns are visible: Order ID, Customer, Date, Status, Total
4. Assert at least one order is listed (requires a prior completed checkout)

---

### TC-ADM-006: Order management — view order detail and fulfill
**Priority:** P2  
**Prerequisite:** At least one completed order exists

**Steps:**
1. Navigate to `/app/orders`
2. Click an order
3. Assert order detail page loads with correct items, customer info, and totals
4. Locate fulfillment section → click "Create fulfillment"
5. Assert fulfillment items are listed
6. Confirm fulfillment creation
7. Assert order status updates to "Partially fulfilled" or "Fulfilled"

---

### TC-ADM-007: Customer management — view customer list and detail
**Priority:** P2

**Steps:**
1. Navigate to `/app/customers`
2. Assert customer list renders
3. Click a customer
4. Assert customer detail shows name, email, and order count
5. Assert orders associated with the customer are listed

---

### TC-ADM-008: Category management — create and assign category
**Priority:** P2

**Steps:**
1. Navigate to `/app/categories`
2. Create a new category with a name and handle
3. Save — assert category appears in list
4. Navigate to a product → assign the new category
5. Save product
6. On storefront, verify the product appears when filtering/browsing by that category (if storefront exposes category navigation)

---

### TC-ADM-009: Admin logout
**Priority:** P1

**Steps:**
1. Log in as admin
2. Click user menu / logout
3. Assert redirect to `/app/login`
4. Attempt to navigate to `/app/products` → assert redirect back to login (session invalidated)

---

## SUITE 6 — Accessibility (axe-core)

> Carry forward the axe-core integration pattern from the OpenCart project. Run against storefront pages only (admin accessibility is lower priority).

### TC-A11Y-001 through TC-A11Y-005: Axe scan on core pages
**Priority:** P3  
**Pages to cover:**
1. Home `/`
2. Product listing `/{countryCode}/store`
3. Product detail `/{countryCode}/products/[handle]`
4. Cart `/{countryCode}/cart`
5. Checkout `/{countryCode}/checkout`

**Approach (same as OpenCart):**
- Inject axe-core via `@axe-core/playwright`
- Run `checkA11y()` after page settles
- Suppress known third-party violations with documented `rules` exclusions
- Assert zero new violations beyond the suppressed list

---

## SUITE 7 — Negative / Edge Cases (Cross-Cutting)

### TC-NEG-001: Direct checkout URL access without cart
**Priority:** P2  
Navigate directly to `/{countryCode}/checkout` with no active cart → assert redirect to store or error state rather than a broken checkout page.

### TC-NEG-002: Expired/invalid product handle in URL
**Priority:** P2  
Navigate to `/products/nonexistent-handle` → assert 404 page or redirect to store rather than a JS error.

### TC-NEG-003: Add out-of-stock product via URL manipulation
**Priority:** P2  
Attempt to add an out-of-stock variant ID to cart via API call during test → assert API returns appropriate error response (inventory check).

### TC-NEG-004: Checkout with empty cart
**Priority:** P2  
Manually navigate to checkout URL with a cart that has had all items removed → assert redirect to cart or informative message, not a broken checkout.

### TC-NEG-005: Admin — attempt to access order pages without auth
**Priority:** P2  
Navigate to `http://localhost:9000/app/orders` without logging in → assert redirect to `/app/login`.

---

## Test Data Strategy

| Data Type | Strategy |
|---|---|
| Admin credentials | `.env` file: `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Customer credentials | `.env` file: `CUSTOMER_EMAIL`, `CUSTOMER_PASSWORD` (pre-seeded) |
| Publishable API key | `.env` file: `PUBLISHABLE_API_KEY` |
| Country code | `.env` file: `COUNTRY_CODE` (e.g., `us`) |
| Product handle for tests | `.env` file: `TEST_PRODUCT_HANDLE` (a known seeded product) |
| Cart setup | Use Playwright `storageState` to persist auth cookies; use Medusa Store API to create/populate cart in `beforeEach` fixtures where needed |

**Seed requirement:** The Medusa demo seed (`yarn seed` / `medusa seed`) must be run before tests. It provisions: default region (US), sample products, sales channel, and a publishable API key. Tests should not create their own regions or payment providers — those require admin configuration that is outside the QA scope.

---

## File / Folder Structure (Recommended)

```
opencart-web-automation/    ← existing repo name; rename or use new repo
medusa-web-automation/
├── tests/
│   ├── storefront/
│   │   ├── catalog.spec.js
│   │   ├── cart.spec.js
│   │   ├── checkout.spec.js
│   │   └── account.spec.js
│   ├── admin/
│   │   ├── products.spec.js
│   │   ├── orders.spec.js
│   │   └── customers.spec.js
│   └── accessibility/
│       └── a11y.spec.js
├── fixtures/
│   ├── auth.js          ← storefront login fixture
│   └── adminAuth.js     ← admin login fixture
├── helpers/
│   └── cartApi.js       ← API helpers to set up cart state
├── playwright.config.js
└── .env
```

---

## Key Differences vs OpenCart — What to Expect

| Concern | OpenCart | Medusa v2 |
|---|---|---|
| Auth | Cookie session | JWT Bearer + publishable API key header |
| Frontend rendering | Server-rendered PHP | Next.js App Router (SSR + streaming) |
| Admin | Same PHP app | Separate Vite SPA at :9000/app |
| Database | MariaDB | PostgreSQL |
| URL structure | `/index.php?route=...` | Clean paths with country-code prefix |
| Cart persistence | Server session | Client cookie (`_medusa_cart_id`) |
| Payment in tests | No real provider needed | "Manual" system provider available — no Stripe required for test coverage |
| Product variants | Simple options | Medusa v2 uses Option/OptionValue model; ensure a variant is fully configured (price + stock) before testing "Add to cart" |
| Empty storefront | Login and test immediately | Requires seeded region, shipping option, and publishable key — test environment will show blank pages without these |
