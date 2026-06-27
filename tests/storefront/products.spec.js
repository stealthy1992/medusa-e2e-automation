const { test, expect } = require('../../fixtures/base');
const ProductsPage = require('../../pages/storefront/ProductsPage')

test.describe('This will test the product listing module', () => {
    let productsPage;
    test.beforeEach(async ({page}) => {
        productsPage = new ProductsPage(page);
        await page.goto('/dk/store')      
    })

    test('This will test sort functions', async () => {
        await test.step('TC-CAT-003: Product listing page — sorting', async () => {
            const sorted = await productsPage.sortByPrice('asc');
            expect(sorted).toBe(true);
        })
        await test.step('TC-CAT-003-E2: Sort by "Newest" — verify URL param updates', async () => {
            const urlAttribute = await productsPage.sortByLatest();
            console.log('Page URL is: ',urlAttribute);
            expect(urlAttribute).toContain('created_at');

        })
    })

    test('TC-CAT-004: Product detail page — variant selection', async () => {
        await test.step('This will verify product attributes are not empty', async () => {
            const productDetails = await productsPage.verifyVariantDetails();
            console.log(productDetails);
            expect(productDetails.title).not.toBe('');
            expect(productDetails.price).not.toBe('');
    
        })
        await test.step('This will test size selection updates prices', async () => {
            await productsPage.verifyPriceChangeForVariants();
        })

        await test.step('Assert "Add to cart" button is enabled for an in-stock variant', async () => {
            
            const isEnabled = await productsPage.isCartButtonEnabled('Standard');
            expect(isEnabled).toBe(true);

        })
        await test.step('Assert "Add to cart" button is disabled for out-of-stock variant', async () => {
            
            const isEnabled = await productsPage.isCartButtonEnabled('XL');
            expect(isEnabled).toBe(false);
     
        })
    })

    test('TC-CAT-004-E1: Product on next pages is navigated properly and clicked open', async () => {
        const productInfo = await productsPage.navigateToProduct('Nova Hoodie');                
        expect(productInfo.variants).toBe(true);
        expect(productInfo.buttonStatus).toBe(true);
    })

    test('TC-CAT-004-E2: Product with a single variant — assert no variant selector is shown and button is enabled by default', async () => {
        const productInfo = await productsPage.navigateToProduct('Medusa Sweatpants');                
        expect(productInfo.variants).toBe(false);
        expect(productInfo.buttonStatus).toBe(true);
    })

    test('Ground-truth cross-check', async ({storeRequest}) => {
        const res = await storeRequest.get('/store/products');
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        const apiProducts = data?.products;
        const apiTitles = apiProducts.map(p => p.title);
        const uiProducts = await productsPage.fetchUIProducts();
        const uiTitles = uiProducts.map(p => p.title);  
        for (const apiTitle of apiTitles) {
            expect(uiTitles).toContain(apiTitle);
        }

    })

    test('Ground-truth cross-check for product detail page', async ({storeRequest}) => {
        // const res = await storeRequest.get('/store/products?handle=sweatshirt')
        const res = await storeRequest.get(
            '/store/products?handle=sweatshirt&fields=*variants.calculated_price&region_id=reg_01KV377A82M48AP26SM5AAH3EB'
        );
        expect(res.ok()).toBeTruthy();
        const data = await res.json();
        const product = data?.products[0];
        // console.log('Product details are: ',product);
        const { uiProduct } = await productsPage.navigateToProduct('Medusa Sweatshirt');
        // console.log(uiProduct.price);
        expect(uiProduct.name.trim()).toBe(product.title.trim());
        expect(uiProduct.description.trim()).toBe(product.description.trim());
        for(let variant of product.variants){
            const variantPriceInfo = variant?.calculated_price;
            expect(uiProduct.sizes).toContain(variant.title);
            // console.log(variantPriceInfo.calculated_amount);
            expect(uiProduct.price).toContain(variantPriceInfo.calculated_amount);
        }
    })

    test('TC-CAT-004-E3: thumbnail structure', async () => {
        test.skip(true, 'Skipping due to UI containing no thumbnail structure');
    });
    
    
})