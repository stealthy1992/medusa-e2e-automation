import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── Custom metrics ──────────────────────────────────────────────────────────
const cartCreationErrors = new Counter('cart_creation_errors');
const authFailures = new Counter('auth_failures');
const checkoutDuration = new Trend('checkout_duration', true);
const contentCheckRate = new Rate('content_check_rate');

// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://store.solception.com';
const API_URL = 'https://medusa.solception.com';
const PUB_KEY = 'pk_fd323a11f1d1ef3641386b1067e890fc2c8054989c26bcfd06119a478c428455';
const CUSTOMER_EMAIL = 'john@test.com';
const CUSTOMER_PASSWORD = 'JazacPz123!';
const REGION_ID = 'reg_01KV377A82M48AP26SM5AAH3EB';
const COUNTRY_CODE = 'dk';
const PRODUCT_VARIANT_ID = 'variant_01KV377B3N3HXP7YDTA1055TES';
const PROMO_CODE = 'TEST10';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUB_KEY,
};

// ── Thresholds ────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    homepage_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: "homepage_load",
      tags: { scenario: "homepage_load" },
    },
    product_browsing: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      startTime: '35s',
      exec: "product_browsing",
      tags: { scenario: "product_browsing" },
    },
    cart_flow: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
      startTime: '70s',
      exec: "cart_flow",
      tags: { scenario: "cart_flow" },
    },
    authenticated_checkout: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      startTime: '105s',
      exec: "authenticated_checkout",
      tags: { scenario: "authenticated_checkout" },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
    content_check_rate: ['rate>0.95'],
    checkout_duration: ['p(95)<5000'],
  },
};

// ── Scenario 1: Homepage load ─────────────────────────────────────────────────
export function homepage_load() {
  const res = http.get(BASE_URL, { tags: { name: 'homepage' } });

  const ok = check(res, {
    'homepage status 200': (r) => r.status === 200,
    'homepage has content': (r) => r.body && r.body.length > 0,
  });
  contentCheckRate.add(ok);
  sleep(1);
}

// ── Scenario 2: Product browsing ──────────────────────────────────────────────
export function product_browsing() {
  // Product listing
  const listRes = http.get(
    `${API_URL}/store/products?region_id=${REGION_ID}`,
    { headers: JSON_HEADERS, tags: { name: 'product_list' } }
  );

  const listOk = check(listRes, {
    'product list status 200': (r) => r.status === 200,
    'product list has products': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.products && body.products.length > 0;
      } catch { return false; }
    },
  });
  contentCheckRate.add(listOk);
  sleep(1);

  // Single product
  const productRes = http.get(
    `${API_URL}/store/products?handle=t-shirt&region_id=${REGION_ID}`,
    { headers: JSON_HEADERS, tags: { name: 'single_product' } }
  );

  const productOk = check(productRes, {
    'single product status 200': (r) => r.status === 200,
    'single product has variants': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.products && body.products[0].variants.length > 0;
      } catch { return false; }
    },
  });
  contentCheckRate.add(productOk);
  sleep(1);
}

// ── Scenario 3: Cart flow ─────────────────────────────────────────────────────
export function cart_flow() {
  // Create cart
  const cartRes = http.post(
    `${API_URL}/store/carts`,
    JSON.stringify({ region_id: REGION_ID }),
    { headers: JSON_HEADERS, tags: { name: 'create_cart' } }
  );

  const cartOk = check(cartRes, {
    'cart created status 200': (r) => r.status === 200,
    'cart has id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.cart && body.cart.id;
      } catch { return false; }
    },
  });
  contentCheckRate.add(cartOk);

  if (!cartOk) {
    cartCreationErrors.add(1);
    return;
  }

  const cartId = JSON.parse(cartRes.body).cart.id;
  sleep(1);

  // Add line item
  const lineItemRes = http.post(
    `${API_URL}/store/carts/${cartId}/line-items`,
    JSON.stringify({ variant_id: PRODUCT_VARIANT_ID, quantity: 1 }),
    { headers: JSON_HEADERS, tags: { name: 'add_line_item' } }
  );

  const lineItemOk = check(lineItemRes, {
    'line item added status 200': (r) => r.status === 200,
    'cart has line items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.cart && body.cart.items && body.cart.items.length > 0;
      } catch { return false; }
    },
  });
  contentCheckRate.add(lineItemOk);
  sleep(1);
}

// ── Scenario 4: Authenticated checkout ───────────────────────────────────────
export function authenticated_checkout() {
  const startTime = Date.now();

  // Authenticate
  const authRes = http.post(
    `${API_URL}/auth/customer/emailpass`,
    JSON.stringify({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD }),
    { headers: JSON_HEADERS, tags: { name: 'auth' } }
  );

  const authOk = check(authRes, {
    'auth status 200': (r) => r.status === 200,
    'auth returns token': (r) => {
      try {
        return JSON.parse(r.body).token;
      } catch { return false; }
    },
  });

  if (!authOk) {
    authFailures.add(1);
    return;
  }

  const token = JSON.parse(authRes.body).token;
  const authHeaders = {
    ...JSON_HEADERS,
    Authorization: `Bearer ${token}`,
  };
  sleep(1);

  // Create cart
  const cartRes = http.post(
    `${API_URL}/store/carts`,
    JSON.stringify({ region_id: REGION_ID }),
    { headers: authHeaders, tags: { name: 'auth_create_cart' } }
  );

  if (!check(cartRes, { 'auth cart created': (r) => r.status === 200 })) {
    cartCreationErrors.add(1);
    return;
  }

  const cartId = JSON.parse(cartRes.body).cart.id;
  sleep(1);

  // Add line item
  http.post(
    `${API_URL}/store/carts/${cartId}/line-items`,
    JSON.stringify({ variant_id: PRODUCT_VARIANT_ID, quantity: 1 }),
    { headers: authHeaders, tags: { name: 'auth_add_item' } }
  );
  sleep(1);

  // Apply promo
  http.post(
    `${API_URL}/store/carts/${cartId}/promotions`,
    JSON.stringify({ promo_codes: [PROMO_CODE] }),
    { headers: authHeaders, tags: { name: 'apply_promo' } }
  );
  sleep(1);

  // Get payment providers
  const paymentRes = http.get(
    `${API_URL}/store/payment-providers?region_id=${REGION_ID}`,
    { headers: authHeaders, tags: { name: 'payment_providers' } }
  );

  check(paymentRes, {
    'payment providers status 200': (r) => r.status === 200,
  });

  checkoutDuration.add(Date.now() - startTime);
  sleep(1);
}

export default function () {}
