'use strict';

const { test, expect } = require('../../fixtures/base');
const seedData = require('../../fixtures/seed-data.json');

test.describe('Suite 7 — Admin API', () => {
    let productID;
    const dbProducts = seedData.products;
    const dbCollections = seedData.collections;
    const dbCategories = seedData.categories;
    test('TC-ADM-API-001', async ({adminRequest}) => {
        const res = await adminRequest.post('/auth/user/emailpass', {
            data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
        })

        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('token');
        expect(data.token).not.toBe('');

    })

    test('TC-ADM-API-002', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/products');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('products');
        expect(data.products.length).toBeGreaterThanOrEqual(14);
        const products = data?.products;
        productID = dbProducts[0].id;
        for(let product of products){
            expect(product).toHaveProperty('id');
            expect(product).toHaveProperty('title');
            expect(product).toHaveProperty('handle');
            expect(product).toHaveProperty('status');
            expect(product.id).not.toBeNull();
            expect(product.title).not.toBeNull();
            expect(product.handle).not.toBeNull();
            expect(product.status).not.toBeNull();
            // console.log(`ID for ${product.title} is ${product.id}`);
        }

    })

    test('TC-ADM-API-003', async ({adminRequest}) => {
        const res = await adminRequest.get(`/admin/products/${productID}`);
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        const product = data?.product;
        expect(product).toHaveProperty('title');
        expect(product.title).toBe(dbProducts[0].title);
    })

    test('TC-ADM-API-004', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/customers');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        // console.log(data?.customers);
        const customers = data?.customers;
        for(let customer of customers){
            expect(customer).toHaveProperty('id');
            expect(customer).toHaveProperty('first_name');
            expect(customer).toHaveProperty('first_name');
            expect(customer).toHaveProperty('email');
            expect(customer.email).not.toBe('');

        }
    })

    test('TC-ADM-API-005', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/orders');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('count');
        expect(data).toHaveProperty('orders');
        expect(Array.isArray(data.orders)).toBe(true);
    })

    test('TC-ADM-API-006', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/collections');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        const collections = data?.collections;
        // console.log('Seeded collections are: ',dbCollections);
        const collectionTitles = Object.keys(dbCollections);
        for(let collection of collections){
            expect(collection).toHaveProperty('id');
            expect(collection).toHaveProperty('title');
            expect(collection).toHaveProperty('handle');
            expect(collection.id).not.toBe('');
            expect(collection.title).not.toBe('');
            expect(collectionTitles).toContain(collection.title.toLowerCase());
        }


    })

    test('TC-ADM-API-007', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/product-categories');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('product_categories');
        expect(data.product_categories.length).toBeGreaterThanOrEqual(0);
        const prodCategories = data?.product_categories;
        const categoriesTitles = Object.keys(dbCategories);
        // console.log(prodCategories);
        for(let prodCategory of prodCategories){
            expect(prodCategory).toHaveProperty('name');
            expect(prodCategory).toHaveProperty('id');
            expect(prodCategory).toHaveProperty('is_active');
            expect(prodCategory.name).not.toBe('');
            expect(prodCategory.id).not.toBe('');
            expect(prodCategory.is_active).not.toBeNull();
        }
    })

    test('TC-ADM-API-008', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/promotions');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('promotions');
        expect(data.promotions.length).toBeGreaterThanOrEqual(1) 
        const promotions = data?.promotions;
        console.log(promotions)
        for(let promotion of promotions){
            expect(promotion).toHaveProperty('id');
            expect(promotion).toHaveProperty('status');
            expect(promotion).toHaveProperty('code');
            if(promotion.code == 'TEST10'){
                expect(promotion.status).toBe('active');
            }
            expect(promotion.id).not.toBeNull();
        }
    })

    test('TC-ADM-API-009', async ({adminRequest}) => {
        const res = await adminRequest.get('/admin/inventory-items');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        expect(data).toHaveProperty('inventory_items');
        expect(data.inventory_items.length).toBeGreaterThanOrEqual(0);
        const inventoryItems = data?.inventory_items;
        for(let inventoryItem of inventoryItems){
            expect(inventoryItem).toHaveProperty('id');
            expect(inventoryItem).toHaveProperty('stocked_quantity');
        }

        
    })
})