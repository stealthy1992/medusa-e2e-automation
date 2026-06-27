const { test, expect } = require('../../fixtures/base');
const CartPage = require('../../pages/storefront/CartPage');
const ProductsPage = require('../../pages/storefront/ProductsPage');

test.describe('This will test cart-related functionality', () => {
    let cartPage;
    let cartId;
    test.beforeEach(async ({page}) => {
        cartPage = new CartPage(page);
        await page.goto('/dk/store');
    })

    test('TC-CAT-005: Product detail page — quantity controls', async ({page, storeRequest}) => {
        
        let cartItems = [];

        const { productInDD, variantValue, currentQuantity, totalPrice, cartTotalAmount } = await cartPage.addSingleProductToCart('Medusa Shorts', 'L');
        
        const cookies = await page.context().cookies();
        const cartCookie = cookies.find(c => c.name === '_medusa_cart_id');
        // console.log('Cart ID from cookie:', cartCookie?.value);
        cartId = cartCookie?.value;

        const res = await storeRequest.post(`/store/carts/${cartId}/line-items`);
        expect(res.ok()).toBeTruthy();
        const { cart } = await res.json();
        // console.log('Retrieved Cart is: ',cart);
        expect(parseFloat(cartTotalAmount)).toBe(cart.total);
        expect(parseFloat(totalPrice)).toBe(cart.item_total);
        expect(Number(currentQuantity)).toBe(cart.items[0].quantity);
        expect(productInDD).toBe(cart.items[0].product_title);
        expect(variantValue).toBe(cart.items[0].variant_title);



        await test.step('TC-CAT-005-E2: Type a value exceeding stock quantity → verify validation message', async () => {
            await cartPage.updateCartItemQuantity('10');
            const res = await storeRequest.get(`/store/carts/${cartId}`);
            expect(res.ok()).toBeTruthy();
            const { cart } = await res.json();
            expect(cart.items[0].quantity).toBe(3);  
        });

        await test.step('TC-CART-001-E1: Add same item twice → assert quantity in cart increments to 2 rather than creating duplicate line items', async () => {
            // test.skip();
            await cartPage.updateCartWithSameProduct('L');
            const res = await storeRequest.get(`/store/carts/${cartId}`);
            expect(res.ok()).toBeTruthy();
            const { cart } = await res.json();
            expect(cart.items[0].quantity).toBe(4);  

        })

        await test.step('TC-CART-001-E2: Add two different products → assert both appear as separate line items', async () => {
            cartItems = await cartPage.addAnotherProduct();
            const res = await storeRequest.get(`/store/carts/${cartId}`);
            expect(res.ok()).toBeTruthy();
            const { cart } = await res.json();
            for (const item of cartItems) {
                const match = cart.items.find(i => i.product_title === item.name);

                // Assert that a match exists
                expect(match, `No match found for ${item.name}`).toBeTruthy();

                // Compare values
                if (match) {
                expect(match.variant_title).toBe(item.size);
                // If you want to check quantity too (if obj.items had it):
                expect(match.quantity).toBe(Number(item.quantity));
                }
            }
        })

        await test.step('TC-CART-004: Cart persists across page navigation', async () => {
            await cartPage.verifyCartPersistence(cartItems);
        })

        
        await test.step('TC-CART-003: Remove item from cart', async () => {
            const cartCount = await cartPage.removeProductsFromCart();
            const res = await storeRequest.get(`/store/carts/${cartId}`);
            expect(res.ok()).toBeTruthy();
            const { cart } = await res.json();
            expect(Number(cartCount)).toBe(cart.items.length);

        })

        await test.step('TC-CART-005: Cart region/currency awareness', async () => {
            await cartPage.switchCountry();
            const res = await storeRequest.get(`/store/carts/${cartId}`);
            expect(res.ok()).toBeTruthy();
            const { cart } = await res.json();
            console.log(cart);
            expect(cart.total).toBe(0);
            expect(cart.item_total).toBe(0);
            expect(cart.items.length).toBe(0);
        })

        
    })
    

    

    
})