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
