const { test, expect } = require('../../fixtures/base');
const AdminPage = require('../../pages/admin/AdminPage');

test.describe('SUITE 5 — Admin Dashboard', () => {
    let adminPage;
    let testCustomer = {
        email: 'john@test.com',
        password: 'JazacPz123!'
    }
    test.beforeEach(async ({page}) => {
        adminPage = new AdminPage(page);
        await page.goto('/app');
    })

    test('TC-ADM-001: Assert orders placed by a customer are consistent in storefront and admin', async ({ request, getCustomerToken, adminRequest}) => {
        
        const token = await getCustomerToken(testCustomer.email, testCustomer.password);

        const uiResponse = await request.get(
            `${process.env.BACKEND_URL}/store/orders`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
                }
            }
        );

        expect(uiResponse.ok()).toBeTruthy();
        const storeData = await uiResponse.json();
        const storeOrders = storeData?.orders;
        // console.log('UI orders are: ',storeOrders);

        const adminResponse = await adminRequest.get('/admin/orders?customer_id=cus_01KVD730ZW7B0NKNPZ6C4CKP8G');
        expect(adminResponse.ok()).toBeTruthy();
        const adminData = await adminResponse.json();
        const adminOrders = adminData?.orders;
        // console.log('DB orders are: ',adminOrders);

        expect(storeOrders.length).toBe(adminOrders.length);

        for (let i = 0; i < adminOrders.length; i++) {
            const adminOrder = adminOrders[i];
            const storeOrder = storeOrders[i];

            expect(storeOrder.id).toBe(adminOrder.id);
            expect(storeOrder.status).toBe(adminOrder.status);
            expect(storeOrder.total).toBe(adminOrder.total);
            expect(storeOrder.payment_status).toBe(adminOrder.payment_status);
            expect(storeOrder.fulfillment_status).toBe(adminOrder.fulfillment_status);
        }
        


    })

    test('TC-ADM-002: Verify customer registration visible in admin customers list', async ({ adminRequest }) => {
        
        const adminResponse = await adminRequest.get('/admin/customers');
        expect(adminResponse.ok()).toBeTruthy();

        const data = await adminResponse.json();
        const customers = data?.customers;
        expect(customers.some(customer => customer.email === testCustomer.email)).toBeTruthy();
        
    })

    test.skip('Verify inventory decrements after order placed', () => {})
})