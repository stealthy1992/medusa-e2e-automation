const { expect } = require("@playwright/test");
const BasePage = require("./BasePage");

class CustomerPage extends BasePage{
    constructor(page){
        super(page);
        this.page = page;
        this.navAccountLink = page.getByTestId('nav-account-link');
        this.loginForm = page.getByTestId('login-page');
        this.registerButton = page.getByTestId('register-button');
        this.registerForm = page.getByTestId('register-page');
        this.registerFormFirstName = page.getByTestId('first-name-input');
        this.registerFormLastName = page.getByTestId('last-name-input');
        this.formEmail = page.getByTestId('email-input');
        this.formPassword = page.getByTestId('password-input');
        this.registerButton = page.getByTestId('register-button');
        this.signInButtonOnRegisterForm = page.locator('button', { hasText: 'Sign in'});
        this.signInButton = page.getByTestId('sign-in-button');
        this.accountWelcomeMessage = page.getByTestId('welcome-message')
        this.errorRegistering = page.getByTestId('register-error');
        this.logoutButton = page.getByTestId('account-nav').getByTestId('logout-button');
        this.loginErrorMessage = page.getByTestId('login-error-message');
        this.loggedInUserEmail = page.getByTestId('customer-email');
        this.orderSection = page.getByTestId('order-wrapper');
        this.orders = page.getByTestId('order-card');
        this.orderEmail = page.getByTestId('order-email');
        this.addressesLink = page.getByTestId('account-nav').getByTestId('addresses-link');
        this.addAddressButton = page.getByTestId('add-address-button');
        this.addAddressModal = page.getByTestId('add-address-modal');
        this.addressContainer = page.getByTestId('address-container');
        this.addressPage = page.getByTestId('addresses-page-wrapper');
        this.savedAddressName = page.getByTestId('address-name');
        this.savedAddressLine = page.getByTestId('address-address');
        this.savedPostalCity = page.getByTestId('address-postal-city');
        this.savedAddressCountry = page.getByTestId('address-province-country');
        this.addressEditButton = page.getByTestId('address-edit-button');
        this.editAddressModal = page.getByTestId('edit-address-modal');
        this.ordersLink = page.getByTestId('account-nav').getByTestId('orders-link')
        this.ordersPage = page.getByTestId('orders-page-wrapper');
        this.orderFinalStatus = page.getByTestId('order-status');
        this.orderPaymentStatus = page.getByTestId('order-payment-status');
        this.orderDetailsContainer = page.getByTestId('order-details-container');
        this.profileLink = page.getByTestId('account-nav').getByTestId('profile-link');
        this.phoneField = page.getByTestId('phone-input');
        this.billingField = page.getByTestId('billing-first-name-input');
        this.saveButton = page.getByTestId('save-button');
        this.successMsg = page.getByTestId('success-message');
    }

    async updateProfile(phone, billingAddress){
        await this.profileLink.click();
        await this.page.waitForURL(/profile/);
        await this.phoneField.fill(phone);
        await this.saveButton.nth(2).click();
        await this.successMsg.nth(2).waitFor({state: 'visible'});
        await this.billingField.fill(billingAddress);
        await this.saveButton.nth(3).click();
        const uiPhoneNumber = await this.phoneField.inputValue();
        return uiPhoneNumber;
        // await this.successMsg.nth(3).waitFor({state: 'visible'});


    }

    async registerCustomer(customer){
        await this.navAccountLink.waitFor({state: 'visible'});
        await this.navAccountLink.click();
        await this.page.waitForURL(/account/);
        await this.loginForm.waitFor({state: 'visible'});
        await this.registerButton.click();
        await this.registerForm.waitFor({state: 'visible'});
        await this.registerFormFirstName.fill(customer.firstName);
        await this.registerFormLastName.fill(customer.lastName);
        await this.formEmail.fill(customer.email);
        await this.formPassword.fill(customer.password);
        await this.registerButton.click();
        await this.page.waitForTimeout(1000);
        const registrationError = await this.errorRegistering.isVisible();
        if(!registrationError){
            await this.accountWelcomeMessage.waitFor({state: 'visible'});
            await expect(this.accountWelcomeMessage).toBeVisible();
            
            await this.loggedInUserEmail.waitFor({state: 'visible'});
            const emailAddress = await this.loggedInUserEmail.innerText();
            await expect(emailAddress).toBe(customer.email);
            await this.logoutButton.click();
            await this.loginForm.waitFor({state: 'visible'});
        }
        else{
            const errorMessage = await this.errorRegistering.innerText();
            await expect(errorMessage).toMatch(/email already exists/);
        }
    }

    async loginCustomer(email, password){
        await this.navAccountLink.click();
        await this.loginForm.waitFor({state: 'visible'});
        await this.formEmail.fill(email);
        await this.formPassword.fill(password);
        await this.signInButton.click();
        await this.page.waitForTimeout(2000);
        // await this.loginErrorMessage.waitFor({ state: 'visible', timeout: 2000 });
        const isErrorVisible = await this.loginErrorMessage.isVisible();
        console.log('Error is visible? ',isErrorVisible);
        if(!isErrorVisible){
            await this.accountWelcomeMessage.waitFor({state: 'visible'});
            await expect(this.accountWelcomeMessage).toBeVisible();
            
        }
        else{
            const errorMessage = await this.loginErrorMessage.innerText();
            await expect(errorMessage).toMatch(/Invalid email or password/);
        }

    }

    async logoutAssertion(){
        await this.navAccountLink.click();
        await this.page.waitForURL(/account/);
        // await this.page.waitForTimeout(2000);
        await expect(this.accountWelcomeMessage).toBeVisible();
        // await this.accountWelcomeMessage.waitFor({state: 'visible'});
        await this.logoutButton.click();
        await this.loginForm.waitFor({state: 'visible'});
        await expect(this.loginForm).toBeVisible();
        await this.navAccountLink.click();
        await this.loginForm.waitFor({state: 'visible'});
        await expect(this.loginForm).toBeVisible();
        await this.page.goto('/account/orders');
        // const pageHeading = await this.page.locator('h1').innerText();
        // await expect(pageHeading).toBe('Page not found');
        expect(this.page.locator('h1')).toHaveText('Page not found')


    }

    async fetchAddresses(){
        let uiAddresses = [];
        await this.addressesLink.click();
        await this.page.waitForURL(/addresses/);
        await this.addressPage.waitFor({state: 'visible'});      
        const addressCount = await this.addressContainer.count();
        for(let i=0; i<addressCount; i++){
            const savedName = await this.addressContainer.nth(i).getByTestId('address-name').innerText();
            const [firstName, lastName] = savedName.split(" ");
            const savedAddressLine = await this.addressContainer.nth(i).getByTestId('address-address').innerText();
            const savedPostalCity = await this.addressContainer.nth(i).getByTestId('address-postal-city').innerText();
            const savedCountry = await this.addressContainer.nth(i).getByTestId('address-province-country').innerText();
            const [postCode, cityName] = savedPostalCity.split(",").map(part => part.trim());
            

            uiAddresses.push({
                firstName: firstName,
                lastName: lastName,
                addressLine1: savedAddressLine,
                postalCode: postCode,
                city: cityName,
                country: savedCountry
            })
        }

        return uiAddresses;
    }

    async verifyOrderList(){
        let uiOrders = [];
        await this.ordersLink.click();
        await this.page.waitForURL(/orders/);
        await this.ordersPage.waitFor({state: 'visible'});
        const orderCount = await this.orders.count();
        for(let i=0; i<orderCount; i++){
            await this.ordersPage.waitFor({state: 'visible'});
            const orderDisplayID = await this.orders.nth(i).getByTestId('order-display-id').innerText();
            const orderCreated = await this.orders.nth(i).getByTestId('order-created-at').innerText();
            const orderTotal = await this.orders.nth(i).getByTestId('order-amount').innerText();
            const itemTitle = await this.orders.nth(i).getByTestId('item-title').innerText();
            await this.orders.nth(i).getByTestId('order-details-link').click();
            await this.page.waitForURL(/\/account\/orders\/details\/order_[A-Z0-9]+/);
            await this.orderDetailsContainer.waitFor({state: 'visible'});
            // await expect(this.page.locator('[data-testid="order-id"]')).toHaveText(orderDisplayID);
            
            const orderStatus = await this.orderFinalStatus.innerText();
            const paymentStatus = await this.page.locator('p', { hasText: 'Payment status:'}).locator('span').innerText();
            uiOrders.push({
                // id: orderDisplayID,
                date_created: orderCreated,
                orderTotal: orderTotal,
                itemName: itemTitle,
                orderStatus: orderStatus,
                paymentStatus: paymentStatus
            })
            await this.ordersLink.click();
        }

        return uiOrders;
    }

    async orderStatus(email){
        await expect(this.orderSection).not.toHaveCount(0);
        const orderCount = await this.orderSection.count();
        for(let i=0; i<orderCount; i++){
            const orderDate = await this.orderSection.nth(i).getByTestId('order-created-date').innerText();
            const orderId = await this.orderSection.nth(i).getByTestId('order-id').innerText();
            const orderAmount = await this.orderSection.nth(i).getByTestId('order-amount').innerText();
            // Example format: Fri Jun 19 2026
            expect(orderDate).toMatch(
                /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}\s\d{4}\b/
            );
            expect(orderId).not.toBe('');
            expect(orderAmount).not.toBe('');
            await this.orderSection.nth(i).getByTestId('open-order-button').click();
            await this.page.waitForURL(/.*orders\/details.*/);
            const cleanOrderId = orderId.replace('#', '');
            await expect(this.page.locator('[data-testid="order-id"]')).toHaveText(cleanOrderId);
            await expect(this.orderEmail).toHaveText(email);


        }
    }

    async addAddress(address){
        await this.addressesLink.click();
        await this.page.waitForURL(/addresses/);
        await this.addAddressButton.click();
        await this.addAddressModal.waitFor({state: 'visible'});
        await this.addAddressModal.getByTestId('first-name-input').fill(address.firstName)
        await this.addAddressModal.getByTestId('last-name-input').fill(address.lastName);
        await this.addAddressModal.getByTestId('address-1-input').fill(address.address_line_1);
        await this.addAddressModal.getByTestId('postal-code-input').fill(address.postalCode);
        await this.addAddressModal.getByTestId('city-input').fill(address.city);
        await this.addAddressModal.getByTestId('country-select').selectOption(address.country);
        await this.addAddressModal.getByTestId('save-button').click();
        await this.addAddressModal.waitFor({state: 'hidden'});
        await this.addressPage.waitFor({state: 'visible'});
        await expect(this.addressContainer).not.toHaveCount(0);
        const addressCount = await this.addressContainer.count();
        for (let i = addressCount - 1; i >= 0; i--){
            const addressName = await this.addressContainer.nth(i).getByTestId('address-name').innerText();
            
            const fullName = address.firstName+" "+address.lastName;
            console.log(`Saved address is ${addressName} and user address is ${fullName}`);
            if(addressName == fullName){
                await expect(this.addressContainer.nth(i).getByTestId('address-address')).toHaveText(address.address_line_1);
                await expect(this.addressContainer.nth(i).getByTestId('address-postal-city')).toHaveText(`${address.postalCode}, ${address.city}`);
                await expect(this.addressContainer.nth(i).getByTestId('address-province-country')).toHaveText(address.country.toUpperCase());
                await this.addressContainer.nth(i).getByTestId('address-edit-button').click();
                await this.editAddressModal.waitFor({state: 'visible'});
                await this.editAddressModal.getByTestId('city-input').fill('Aarhus');
                await this.editAddressModal.getByTestId('save-button').click();
                await this.editAddressModal.waitFor({state: 'hidden'});
                await expect(this.addressContainer.nth(i).getByTestId('address-postal-city')).toHaveText(`${address.postalCode}, Aarhus`);
                await this.addressContainer.nth(i).getByTestId('address-delete-button').click();
                await this.page.waitForTimeout(3000);
                break;
            }
        }
        const remainingAddresses = await this.addressContainer.count();
        console.log('Saved address count is: ',remainingAddresses)
        if(remainingAddresses > 0){
            for (let i = remainingAddresses - 1; i >= 0; i--){
                const addressName = await this.addressContainer.nth(i).getByTestId('address-name').innerText();
                const fullName = address.firstName+" "+address.lastName;
                expect(addressName).not.toBe(fullName);

            }
        }


    }
}

module.exports=CustomerPage;