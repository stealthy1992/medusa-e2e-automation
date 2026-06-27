const { test, expect } = require('../../fixtures/base');
const CustomerPage = require('../../pages/storefront/CustomerPage');

test.describe('SUITE 4 — Storefront: Customer Account', () => {
    let customerPage;
    const customerCreds = {
            firstName: 'Hung',
            lastName: 'Nguyen',
            email: 'Hung@testing.com',
            password: 'JazacPz123!',
            phone: '+92-322-33111445',
            billingAddress: '96th Hongqi St, Phnom Penh, Vietnam'
    };
    test.beforeEach(async ({page}) => {
        customerPage = new CustomerPage(page);
        await page.goto('/');
    })

    test('TC-AUTH-001: Customer registration', async ({ request, getCustomerToken }) => {
        
        await customerPage.registerCustomer(customerCreds);

        const token = await getCustomerToken(customerCreds.email, customerCreds.password);

         const res = await request.get(
            `${process.env.BACKEND_URL}/store/customers/me`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                }
            }
        );
        const { customer } = await res.json();
        console.log(customer)
        expect(customer.email).toBe(customerCreds.email);

    })

    test('TC-AUTH-002: Customer Login and Logout process', async ({ request, getCustomerToken  }) => {
        
        await test.step('TC-AUTH-002A: Customer login', async () => {
    
            await customerPage.loginCustomer(customerCreds.email, customerCreds.password);

            const token = await getCustomerToken(customerCreds.email, customerCreds.password);

            const res = await request.get(
                `${process.env.BACKEND_URL}/store/customers/me`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                    }
                }
            );
            const { customer } = await res.json();
            expect(customer.email).toBe(customerCreds.email);
        })

        await test.step('TC-AUTH-002B: Customer logout', async () => {
            await customerPage.logoutAssertion();
        })
    })

    test('TC-AUTH-003: Verify saved address(es) as per API response', async ({ request, getCustomerToken}) => {
        
        await customerPage.loginCustomer(customerCreds.email, customerCreds.password);

        // await customerPage.verifyOrderList();

        const uiAddresses = await customerPage.fetchAddresses();

         const token = await getCustomerToken(customerCreds.email, customerCreds.password);

         const res = await request.get(
            `${process.env.BACKEND_URL}/store/customers/me`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                }
            }
        );
        const { customer } = await res.json();
        console.log(customer);
        expect(customer.email).toBe(customerCreds.email);
        const apiAddresses = customer?.addresses;
        console.log(`UI count is ${uiAddresses.length} and API count is ${apiAddresses.length}`);
        expect(apiAddresses.length).toBe(uiAddresses.length);

        for (let i = 0; i < apiAddresses.length; i++) {
            const expected = apiAddresses[i];
            const actual = uiAddresses[i];

            expect(actual.firstName).toBe(expected.first_name.trim());
            expect(actual.lastName).toBe(expected.last_name.trim());
            expect(actual.postalCode).toBe(expected.postal_code);
            expect(actual.city).toBe(expected.city);
            expect(actual.country.toLowerCase()).toBe(expected.country_code);
        }
    })

    test('TC-AUTH-004: Update user profile and cross-check against API response', async ({ request, getCustomerToken}) => {
        
        await customerPage.loginCustomer(customerCreds.email, customerCreds.password);
        const updatedPhone = await customerPage.updateProfile(customerCreds.phone, customerCreds.billingAddress);
        const token = await getCustomerToken(customerCreds.email, customerCreds.password);
        const res = await request.get(
                `${process.env.BACKEND_URL}/store/customers/me`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                    }
                }
        );
        const { customer } = await res.json();
        console.log(customer);
        expect(updatedPhone).toBe(customer.phone);
        // console.log(customer.addresses);
    })

    test('TC-AUTH-005: Account — add and manage saved address', async () => {

        const address = {
            firstName: 'Hung',
            lastName: 'Nguyen',
            address_line_1: '26th James St.',
            postalCode: '11201',
            city: 'Copenhagen',
            country: 'dk'
        }
        await customerPage.loginCustomer(customerCreds.email, customerCreds.password);
        await customerPage.addAddress(address);
    })

    test('TC-AUTH-006: Account — Verify UI orders of a logged in customer against API response', async ({ request, getCustomerToken}) => {
       
        
        await customerPage.loginCustomer(customerCreds.email, customerCreds.password);

         const token = await getCustomerToken(customerCreds.email, customerCreds.password);

         const res = await request.get(
            `${process.env.BACKEND_URL}/store/orders`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                }
            }
        );

        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        const apiOrders = data?.orders;
        for(let order of apiOrders){
            console.log('API order item is: ', order);
        }

        const orders = await customerPage.verifyOrderList();
        for(let order of orders){
            console.log(order);
        }
        // const { customer } = await res.json();
        
    })
})