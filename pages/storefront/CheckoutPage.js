const BasePage = require("./BasePage");
const { expect } = require('@playwright/test');

class CheckoutPage extends BasePage {
    constructor(page) {
        super(page);
        this.page = page;
        this.checkoutButton = page.getByTestId('checkout-button');
        this.shippingEmail = page.getByTestId('shipping-email-input');
        this.firstName = page.getByTestId('shipping-first-name-input');
        this.lastName = page.getByTestId('shipping-last-name-input');
        this.shippingAddress = page.getByTestId('shipping-address-input');
        this.postalCode = page.getByTestId('shipping-postal-code-input');
        this.shippingCity = page.getByTestId('shipping-city-input');
        this.country = page.getByTestId('shipping-country-select');
        this.submitButton = page.getByTestId('submit-address-button');
        this.continueToPayment = page.getByTestId('submit-delivery-option-button');
        this.shippingOptions = page.getByTestId('delivery-option-radio');
        this.continueToReview = page.getByTestId('submit-payment-button');
        this.placeOrder = page.getByTestId('submit-order-button');
        this.orderCompletionStatus = page.getByTestId('order-complete-container');
        this.orderID = page.getByTestId('order-id');
        this.shippingEmailConfirmation = page.getByTestId('shipping-contact-summary');
        this.editAddress = page.getByTestId('edit-address-button');
        this.editDelivery = page.getByTestId('edit-delivery-button');
        this.paymentOptions = page.getByRole('radiogroup');
        this.shippingAddressSummary = page.getByTestId('shipping-address-summary');
        this.shippingContactSummary = page.getByTestId('shipping-contact-summary');
        this.cartSubtotal = page.getByTestId('cart-subtotal');
        this.cartShipping = page.getByTestId('cart-shipping');
        this.cartTotal = page.getByTestId('cart-total');
        this.productRow = page.getByTestId('product-row');
        this.addDiscountButton = page.getByTestId('add-discount-button');
        this.discountInput = page.getByTestId('discount-input');
        this.discountApplyButton = page.getByTestId('discount-apply-button');
        this.discountRow = page.getByTestId('discount-row');
        this.appliedDiscountCode = page.getByTestId('discount-code');
        this.cartDiscount = page.getByTestId('cart-discount');
        this.selectShippingAddress = page.getByTestId('shipping-address-select');
        this.shippingAddressOption = page.getByTestId('shipping-address-radio');
        this.discountErrorMessage = page.getByTestId('discount-error-message')


    }

    async navigateToCheckoutPage() {
        await this.checkoutButton.click();
        await this.page.waitForURL(/checkout/);
    }

    async guestCheckout(isLoggedIn, shippingEmail) {

        const expectedCountries = ['Country', 'Denmark', 'France', 'Germany', 'Italy', 'Spain', 'Sweden', 'United Kingdom'];

        if (!isLoggedIn) {
            const isEditVisible = await this.editAddress.isVisible();
            if (!isEditVisible) {

                await this.firstName.fill('John');
                await this.lastName.fill('Meyer');
                await this.shippingAddress.fill('26th James St. New York City, NY');
                await this.postalCode.fill('11201');
                await this.shippingCity.fill('New York');
                const countryOptions = await this.country.locator('option');
                const countryCount = await this.country.locator('option').count();
                console.log('Country count is: ', countryCount);
                for (let i = 0; i < countryCount; i++) {
                    const countryText = await countryOptions.nth(i).innerText();
                    expect(expectedCountries).toContain(countryText);
                }
                await this.country.selectOption('dk');


            }
        }
        else {
            await this.selectShippingAddress.click();
            await this.shippingAddressOption.first().waitFor({ state: 'visible' });
            await this.shippingAddressOption.first().click();

        }

        // await this.page.waitForTimeout(1500);
        await this.shippingEmail.fill(shippingEmail);
        await this.submitButton.click();
        await this.page.waitForURL(/step=delivery/);
        const isDeliveryVisible = await this.editDelivery.isVisible();
        console.log(isDeliveryVisible);
        if (!isDeliveryVisible) {
            await this.shippingOptions.first().waitFor({ state: 'visible' });
            const shippingOptionCount = await this.shippingOptions.count();
            console.log(shippingOptionCount);
            expect(shippingOptionCount).toBeGreaterThan(0);
            await this.shippingOptions.first().click();
            await expect(this.continueToPayment).toBeEnabled();
            await this.continueToPayment.click();
            await this.page.waitForURL(/payment/);
        }

        await this.paymentOptions.locator('span').first().waitFor({ state: 'visible' });
        await this.paymentOptions.locator('span').first().click();
        await expect(this.continueToReview).toBeEnabled();
        await this.continueToReview.click();

        const shippingInfo = await this.shippingAddressSummary.innerText();
        const contactInfo = await this.shippingContactSummary.locator('p').last().innerText();
        console.log(shippingInfo)
        const shippingDetails = await this.reformatData(shippingInfo);
        const cartFinalTotal = parseFloat(await this.cartTotal.getAttribute('data-value'));
        const shippingPrice = parseFloat(await this.cartShipping.getAttribute('data-value'));
        const withoutDiscountTotal = parseFloat(await this.cartSubtotal.getAttribute('data-value'));


        return { shippingDetails, contactInfo, withoutDiscountTotal, cartFinalTotal, shippingPrice };

    }

    async applyPromoCode(promoCode) {

        if(!await this.discountInput.isVisible()){
            await this.addDiscountButton.click();
            await this.discountInput.waitFor({ state: 'visible' });
        }
        
        
        await this.discountInput.fill(promoCode);
        await this.discountApplyButton.click();
        await this.page.waitForTimeout(2000);
        // await expect(this.discountErrorMessage).toBeVisible({ timeout: 2000 });
        const isPromoInvalid = await this.discountErrorMessage.isVisible();
        if (!isPromoInvalid) {
            await this.discountRow.waitFor({ state: 'visible' });
            await expect(this.appliedDiscountCode).toContainText('TEST10');
            const cartDiscountPrice = parseFloat(await this.cartDiscount.getAttribute('data-value'));
            const withoutDiscountTotal = parseFloat(await this.cartSubtotal.getAttribute('data-value'));
            const cartFinalTotal = parseFloat(await this.cartTotal.getAttribute('data-value'));
            const shippingPrice = parseFloat(await this.cartShipping.getAttribute('data-value'));
            expect(cartFinalTotal).toBe(withoutDiscountTotal + shippingPrice - cartDiscountPrice);

            return cartDiscountPrice;
        }
        else return false;
    }

    async reformatData(rawText) {
        const lines = rawText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        // Split postal code and city from line[2]
        const [postalCode, city] = lines[3].split(',').map(part => part.trim());

        return {
            heading: lines[0],        // "Shipping Address"
            customerName: lines[1],   // "John Meyer"
            addressLine1: lines[2],
            postalCode,               // "11201"
            city,                     // "New York"
            country: lines[4]         // "DK"
        };
    }

    async confirmOrder(contactEmail) {

        // await expect(this.placeOrder).toBeEnabled();
        await this.placeOrder.waitFor({ state: 'visible' });
        await this.placeOrder.click();
        await this.page.waitForURL(/confirmed/);
        await expect(this.orderCompletionStatus).toBeVisible();
        await expect(this.orderID).toBeVisible();
        await expect(this.shippingEmailConfirmation).toBeVisible();
        await expect(this.shippingEmailConfirmation).toContainText(contactEmail);


    }


}

module.exports = CheckoutPage;