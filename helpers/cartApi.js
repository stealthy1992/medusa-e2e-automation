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
