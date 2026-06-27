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
