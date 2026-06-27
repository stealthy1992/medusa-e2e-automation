const BasePage = require("./BasePage");
const { expect } = require('@playwright/test');

class ProductsPage extends BasePage{
    constructor(page){
        super(page);
        this.page = page;
        this.sortOptions =  page.getByTestId('radio-label');
        this.products = page.getByTestId('product-wrapper');
        this.productTitle = page.getByTestId('product-title');
        this.productDescription = page.getByTestId('product-description');
        this.productPrice = page.getByTestId('product-price');
        this.sizeOptions = page.getByTestId('option-button');
        this.productList = page.getByTestId('products-list');
        this.listingPrice = page.getByTestId('price');

    }

    async sortByPrice(order){
        const sortOptionCount = await this.sortOptions.count();
        for(let i=0; i<sortOptionCount; i++){
            const sortOption = await this.sortOptions.nth(i).innerText();
            if(sortOption == 'Price: Low -> High' && order === 'asc'){
                await this.sortOptions.nth(i).click();
                break;
            }
            else if(sortOption == 'Price: High -> Low' && order === 'desc'){
                await this.sortOptions.nth(i).click();
                break;
            }
        }
        await this.page.waitForURL(new RegExp(`sortBy=price_${order}`));
        const productWrappers = await this.page.locator('[data-testid="product-wrapper"]').all();

        // Extract prices into an array of numbers
        const prices = [];
        for (const wrapper of productWrappers) {
            const priceText = await wrapper.locator('[data-testid="price"]').innerText();
            const numericPrice = parseFloat(priceText.replace(/[^\d.]/g, '')); // strip € and commas
            prices.push(numericPrice);
        }

        // Check sorting based on order argument
        if (order === 'asc') {
            for (let i = 1; i < prices.length; i++) {
                if (prices[i] < prices[i - 1]) {
                    return false;
                }
            }
            return true;
        } else if (order === 'desc') {
            for (let i = 1; i < prices.length; i++) {
                if (prices[i] > prices[i - 1]) {
                    return false;
                }
            }
            return true;
        } else {
            throw new Error(`Invalid order argument: ${order}. Use 'asc' or 'desc'.`);
        }
    }

    async sortByLatest(){
        await this.sortOptions.first().click();
        await this.page.waitForURL(/created_at/);
        return await this.page.url();

    }

    async verifyVariantDetails(){
        await this.products.first().click();
        await this.page.waitForURL(/products/);
        console.log('Current URL:', this.page.url());
        const title = await this.productTitle.first().innerText();
        const description = await this.productDescription.first().innerText();
        const price = await this.productPrice.first().innerText();
        return { title, description, price };

    }

    async verifyPriceChangeForVariants(){
        const sizeOptionCount = await this.sizeOptions.count();
        for(let i=0; i<sizeOptionCount; i++){
            const currentSize = await this.sizeOptions.nth(i);
            const currentSizeValue = await this.sizeOptions.nth(i).innerText();
            const previousPrice = await this.page.locator('[data-testid="product-price"]').innerText();
            expect(previousPrice.trim()).not.toBe('');
            await currentSize.click();
            const changedPrice = await this.page.locator('[data-testid="product-price"]').innerText();
            console.log(`Price for ${currentSizeValue} was previously ${previousPrice}, but now is ${changedPrice}`);
            expect(changedPrice.trim()).not.toBe('');
        }
    }

    async isCartButtonEnabled(size){
        const sizeOptionCount = await this.sizeOptions.count();
        // console.log('option count is: ',sizeOptionCount)
        for(let i=0; i<sizeOptionCount; i++){
            const currentSizeValue = await this.sizeOptions.nth(i).innerText();
            // console.log(`UI Size is ${currentSizeValue}`);
            if(currentSizeValue == size){
                console.log(`Entered ${currentSizeValue}`);
                await this.sizeOptions.nth(i).click();
                // await this.page.waitForTimeout(1000);
                const cartButton = await this.page.locator('[data-testid="add-product-button"]');
                const buttonStatus = await cartButton.isEnabled();
                if(buttonStatus){
                    return true;
                }
                else return false;
                
            }
        }
    }

    async navigateToProduct(productName){
        
        let currentPage = 1;
        let hasNextPage = true;
        let isFound = false;
        let variants, buttonStatus;
        const sizeRange = [];
        let variantPrices = [];
        let uiProduct;
        while(hasNextPage){
            await this.productList.waitFor({state: 'visible'});
            await this.products.first().waitFor({state: 'visible'});
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.page.waitForLoadState('networkidle');
            const productCount = await this.products.count();

            for(let i=0; i<productCount; i++){
                await this.products.nth(i).scrollIntoViewIfNeeded();
                const currentProduct = await this.products.nth(i).getByTestId('product-title').innerText();
                if(currentProduct == productName){
                    await this.products.nth(i).click();
                    await this.page.waitForURL(/products/);
                    const productDescription = await this.productDescription.innerText();
                    const sizes = await this.sizeOptions.count();
                    // console.log('size count is: ',sizes)
                    for(let i=0; i<sizes; i++){
                        const size = await this.sizeOptions.nth(i).innerText();
                        await this.sizeOptions.nth(i).click();
                        await this.page.waitForTimeout(500);
                        const variantPrice = parseFloat((await this.productPrice.innerText()).replace(/[^0-9.]/g, ""));
                        sizeRange.push(size);
                        variantPrices.push(variantPrice);
                    }
                    // const productPrice = await this.productPrice.innerText();
                    uiProduct = {
                        name: currentProduct,
                        description: productDescription,
                        sizes: sizeRange,
                        price: variantPrices
                    }
                    // hasNextPage = false;
                    isFound = true;
                    break;
                }
            }
            if(isFound){
                const variantsCount = await this.sizeOptions.count();
                if(variantsCount == 0){
                    variants = await this.sizeOptions.isVisible();
                }
                else{
                    variants = await this.sizeOptions.first().isVisible();
                    await this.sizeOptions.first().click()
                }
                // variants = await this.sizeOptions.isVisible();
                const cartButton = await this.page.locator('[data-testid="add-product-button"]');
                buttonStatus = await cartButton.isEnabled();
                hasNextPage = false;
            }
            

            const nextPageButton = this.page.locator('button', { hasText: String(currentPage + 1) });
            const nextExists = await nextPageButton.count();

            if (nextExists > 0) {
            await nextPageButton.click();
            currentPage++;
            await this.page.waitForURL(new RegExp(`store\\?page=${currentPage}`));
            } else {
            hasNextPage = false;
            }
            
        }

        return { variants, buttonStatus, uiProduct };
    }

    async fetchUIProducts(){

        let currentPage = 1;
        let hasNextPage = true;
        let uiProducts = [];
        let variants, buttonStatus;
        while(hasNextPage){
            await this.productList.waitFor({state: 'visible'});
            await this.products.first().waitFor({state: 'visible'});
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.page.waitForLoadState('networkidle');
            const productCount = await this.products.count();

            for(let i=0; i<productCount; i++){
                await this.products.nth(i).scrollIntoViewIfNeeded();
                const productTitle = await this.products.nth(i).getByTestId('product-title').innerText();
                const productPrice = await this.products.nth(i).getByTestId('price').innerText();
                uiProducts.push({
                    title: productTitle,
                    price: productPrice
                })
            }
            
            const nextPageButton = this.page.locator('button', { hasText: String(currentPage + 1) });
            const nextExists = await nextPageButton.count();

            if (nextExists > 0) {
            await nextPageButton.click();
            currentPage++;
            await this.page.waitForURL(new RegExp(`store\\?page=${currentPage}`));
            } else {
            hasNextPage = false;
            }
            
        }

        return uiProducts;

    }
}

module.exports=ProductsPage;