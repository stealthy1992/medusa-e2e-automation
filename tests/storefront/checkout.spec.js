const { test, expect } = require('../../fixtures/base');
const CheckoutPage = require('../../pages/storefront/CheckoutPage');
const CartPage = require('../../pages/storefront/CartPage');
const CustomerPage = require('../../pages/storefront/CustomerPage')

test.describe('Checkout Module Tests', () => {
    let checkoutPage, cartPage, customerPage;
    let cartId;
    let loggedIn = false;
    let cartDiscountPrice;
    test.beforeEach(async ({page}) => {
        checkoutPage = new CheckoutPage(page);
        cartPage = new CartPage(page);
        customerPage = new CustomerPage(page);
        await page.goto('/store');
    })

    test('TC-CHK-000: Navigating directly to /checkout with no cart items', async ({page}) => {
        await page.goto('/checkout');
        expect(page.locator('h1')).toHaveText('Page not found');
    })

    test('TC-CHK-001: Guest checkout — complete happy path (manual/system payment provider)', async ({page, storeRequest}) => {
        const shippingEmail = 'test@test.com'
        await cartPage.addSingleProductToCart('Medusa Shorts', 'L');
        const cookies = await page.context().cookies();
        const cartCookie = cookies.find(c => c.name === '_medusa_cart_id');
        cartId = cartCookie?.value;

        await page.getByTestId('nav-cart-link').click();
        await page.waitForURL(/cart/);
        
        await checkoutPage.navigateToCheckoutPage();

        await test.step('N-01: Invalid promo code test', async () => {
            cartDiscountPrice = await checkoutPage.applyPromoCode('BLAH');
            expect(cartDiscountPrice).toBeFalsy();
        })

        await test.step('TC-CHK-001A: Valid promo code test', async () => {
            cartDiscountPrice = await checkoutPage.applyPromoCode('TEST10');
            
        })
        
        // cartDiscountPrice = await checkoutPage.applyPromoCode('TEST10');

        const { shippingDetails, contactInfo, withoutDiscountTotal, cartFinalTotal, shippingPrice } = await checkoutPage.guestCheckout(loggedIn, shippingEmail);
        const [firstName, lastName] = shippingDetails.customerName.trim().split(" ");


        const res = await storeRequest.get(`/store/carts/${cartId}`);
        expect(res.ok()).toBeTruthy();
        const { cart } = await res.json();
        console.log('Ápi retrieved cart is: ', cart);
        expect(firstName).toBe(cart.shipping_address.first_name);
        expect(lastName).toBe(cart.shipping_address.last_name);
        // console.log(shippingDetails.postalCode);
        expect(shippingDetails.postalCode).toBe(cart.shipping_address.postal_code);
        expect(shippingDetails.city).toBe(cart.shipping_address.city);
        expect(shippingDetails.country.toLowerCase()).toBe(cart.shipping_address.country_code);
        expect(contactInfo).toBe(cart.customer.email);
        expect(cartFinalTotal).toBe(cart.total);
        expect(withoutDiscountTotal).toBe(cart.item_subtotal);
        expect(shippingPrice).toBe(cart.shipping_total);
        expect(cartDiscountPrice).toBe(cart.discount_total);
        expect(cart.promotions[0].code).toBe('TEST10');

        await checkoutPage.confirmOrder(contactInfo);
        
    })

    test('TC-CHK-002: Customer checkout — complete happy path (manual/system payment provider)', async ({ storeRequest, page}) => {
        loggedIn = true;
        const customer = {
            email: 'john@test.com',
            password: 'JazacPz123!'
        };

        await cartPage.addSingleProductToCart('Medusa Shorts', 'L');
        const cookies = await page.context().cookies();
        const cartCookie = cookies.find(c => c.name === '_medusa_cart_id');
        cartId = cartCookie?.value;
        await customerPage.loginCustomer(customer.email, customer.password);
        await page.getByTestId('nav-cart-link').click();
        await page.waitForURL(/cart/);
        
        await checkoutPage.navigateToCheckoutPage();


        cartDiscountPrice = await checkoutPage.applyPromoCode('TEST10');


        const { shippingDetails, contactInfo, withoutDiscountTotal, cartFinalTotal, shippingPrice } = await checkoutPage.guestCheckout(loggedIn, customer.email);
        const [firstName, lastName] = shippingDetails.customerName.trim().split(" ");

        

        const res = await storeRequest.get(`/store/carts/${cartId}`);
        expect(res.ok()).toBeTruthy();
        const { cart } = await res.json();
        console.log('Ápi retrieved cart is: ', cart);
        expect(firstName.trim()).toBe(cart.shipping_address.first_name.trim());
        expect(lastName.trim()).toBe(cart.shipping_address.last_name.trim());
        // console.log(shippingDetails.postalCode);
        expect(shippingDetails.postalCode).toBe(cart.shipping_address.postal_code);
        expect(shippingDetails.city).toBe(cart.shipping_address.city);
        expect(shippingDetails.country.toLowerCase()).toBe(cart.shipping_address.country_code);
        expect(contactInfo).toBe(cart.customer.email);
        expect(cartFinalTotal).toBe(cart.total);
        expect(withoutDiscountTotal).toBe(cart.item_subtotal);
        expect(shippingPrice).toBe(cart.shipping_total);
        expect(cartDiscountPrice).toBe(cart.discount_total);
        expect(cart.promotions[0].code).toBe('TEST10');

        await checkoutPage.confirmOrder(contactInfo);

    })
})