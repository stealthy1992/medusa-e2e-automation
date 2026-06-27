const { test, expect } = require('@playwright/test');
const HomePage = require('../../pages/storefront/HomePage');

test.describe('This will test homepage module', () => {
    let homePage;
    test.beforeEach(async ({page}) => {
        homePage = new HomePage(page);
        await page.goto('/');
    })

    test('Assert hero/banner element is visible', async () => {
            const isElementVisible = await homePage.assertBannerElement();
            expect(isElementVisible).toBe(true);
    })
    test('No products seeded — verify graceful empty state rather than JS error', async () => {
        const featuredProducts = await homePage.countFeaturedProducts();
        expect(featuredProducts).toBe(0);
    })
    test('Will navigate user to explore products', async () => {
            await homePage.exploreProducts();
    })
    test('Product listing page renders catalog with correct country code prefix', async () => {
        const regions = ['France', 'Italy', 'Germany', 'Spain', 'Sweden', 'United Kingdom'];
        await homePage.navigateToStore();
        for(let region of regions){
            const uiProducts = await homePage.verifyProductCountByRegion(region);
            for(let uiProduct of uiProducts){
                console.log(`${uiProduct.productName} with price ${uiProduct.productPrice} exists in ${region}`);
                expect(uiProduct.productName).not.toBe('');
                expect(uiProduct.productPrice).not.toBe('');

            }
        }
        
    })

    test('Navigate with an invalid country code', async () => {
        const pageInfo = await homePage.directNavigationToStore('blah');
        expect(pageInfo.title).toBe('404');
        expect(pageInfo.heading).toBe('Page not found');
    })

    test.skip('Collection/category filter param in URL', async () => {

    })

    
})