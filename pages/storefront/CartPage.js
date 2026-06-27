const { expect} = require('@playwright/test');
const BasePage = require('./BasePage');

class CartPage extends BasePage{
    constructor(page){
        super(page);
        this.page = page;
        this.products = page.getByTestId('product-wrapper');
        this.sizeOptions = page.getByTestId('option-button');
        this.cartButton = page.getByTestId('add-product-button');
        this.navCartButton = page.getByTestId('nav-cart-link');
        this.navCartDropdown = page.getByTestId('nav-cart-dropdown');
        this.navDDCartButton = page.getByTestId('go-to-cart-button');
        this.quantityDropdown = page.getByTestId('product-select-button');
        this.ddProductInfo = page.getByTestId('product-link');
        this.cartItemVariant = page.getByTestId('cart-item-variant');
        this.productUnitPrice = page.getByTestId('product-unit-price');
        this.productTotalInRow = page.getByTestId('product-row').getByTestId('product-price');
        this.cartTotal = page.getByTestId('cart-total');
        this.quantityOverError = page.getByTestId('product-error-message');
        this.productTitle = page.getByTestId('product-title');
        this.productRow = page.getByTestId('product-row');
        this.emptyCartMessage = page.getByTestId('empty-cart-message');
        this.navMenuButton = page.getByTestId('nav-menu-button');
        this.navMenuPopup = page.getByTestId('nav-menu-popup');
        this.countryList = page.getByRole('listbox')
    }

    async addSingleProductToCart(productName, productSize){
        let qty = '3';
        let currentQuantity;
        const productsCount = await this.products.count();
        for(let i=0; i<productsCount; i++){
            const product = await this.products.nth(i).getByTestId('product-title').innerText();
            if(product == productName){
                await this.products.nth(i).click();
                break;
        
            }
        }
        await this.page.waitForURL(/products/);
        const sizeCount = await this.sizeOptions.count();
        for(let i=0; i<sizeCount; i++){
            const size = await this.sizeOptions.nth(i).innerText();
            if(size == productSize){
                await this.sizeOptions.nth(i).click();
                break;
            }
        }

        if(this.cartButton.isEnabled()){
            await this.cartButton.click();
        }
        else{
            return 'Product size is unavailable';
        }
        const cartBadge = await this.page.locator('[data-testid="nav-cart-link"]').innerText();
        
        await this.navCartButton.hover();                                                                                                              
        await this.navCartDropdown.waitFor({state: 'visible'});
        const productInDD = await this.ddProductInfo.innerText();
        const variantInDD = await this.cartItemVariant.innerText();
        expect(productInDD).toBe(productName);
        const variantValue = await variantInDD.split(':')[1].trim();
        expect(variantValue).toBe(productSize);
        const cartIconCount = (await this.navCartButton.innerText()).match(/\((\d+)\)/)[1];
        expect(cartIconCount).toBe('1');    
        await this.navDDCartButton.click();
        await this.page.waitForURL(/cart/);
        // currentQuantity = await this.quantityDropdown.locator('option:checked').innerText();
        // expect(currentQuantity).toBe('1');
        
        await this.quantityDropdown.selectOption(qty);
        await this.page.waitForTimeout(2000);
        // await this.page.waitForTimeout(100);
        // await this.page.locator('.animate-spin').waitFor({state: 'visible'});
        // await this.page.locator('.animate-spin').waitFor({state: 'hidden'});
        currentQuantity = await this.quantityDropdown.locator('option:checked').innerText();
        expect(currentQuantity).toBe("3");
        
        // expect(currentQuantity).toBe('3');
        // await this.page.locator('.animate-spin').waitFor({state: 'visible'});
        // await this.page.locator('.animate-spin').waitFor({state: 'hidden'});
        const unitPrice = await this.productUnitPrice.innerText();
        const totalPrice =  parseFloat((await this.productTotalInRow.innerText()).replace(/[^0-9.]/g, ""));
        const expectedTotalPrice =  parseFloat(unitPrice.replace(/[^0-9.]/g, "")) * qty;
        expect(totalPrice).toBe(expectedTotalPrice);
        const cartTotalAmount = await this.cartTotal.getAttribute('data-value');
        expect(parseFloat(cartTotalAmount)).toBe(expectedTotalPrice);
        console.log('Item quantity is: ',currentQuantity);
        return { productInDD, variantValue, currentQuantity, totalPrice, cartTotalAmount };
    }

    async updateCartItemQuantity(quantity){
        await this.quantityDropdown.selectOption(quantity);
        await this.page.locator('.animate-spin').waitFor({state: 'visible'});
        await this.page.locator('.animate-spin').waitFor({state: 'hidden'});
        await expect(this.quantityOverError).toBeVisible();
        // await expect(this.quantityOverError).toHaveText(
        //     'Error setting up the request: Some variant does not have the required inventory'
        // );

    }

    async updateCartWithSameProduct(productSize){
        await this.navCartButton.hover();                                                                                                              
        await this.navCartDropdown.waitFor({state: 'visible'});
        await this.ddProductInfo.click();
        await this.page.waitForURL(/products/);
        const sizeCount = await this.sizeOptions.count();
        const productName = await this.productTitle.first().innerText();
        console.log('Current on the product: ',productName, 'and variant count is: ',sizeCount);     
        for(let i=0; i<sizeCount; i++){
           const size = await this.sizeOptions.nth(i).innerText();
           if(size === productSize){
            await this.sizeOptions.nth(i).click();
            break;
           }
        }

        await this.cartButton.click();
        // await this.navCartButton.hover();                                                                                                              
        await this.navCartDropdown.waitFor({state: 'visible'});
        const ddProductCount = await this.ddProductInfo.count();
        console.log('Product in DD count is: ',ddProductCount);
        await expect(this.ddProductInfo).toHaveCount(1);

    }

    async addAnotherProduct(){
        const cartItems = [];
        await this.navCartButton.hover();                                                                                                              
        await this.navCartDropdown.waitFor({state: 'visible'});
        await this.ddProductInfo.click();
        await this.page.waitForURL(/products/);
        await this.productTitle.nth(1).click();
        await this.page.waitForURL(/products/);
        await this.sizeOptions.first().click();
        await this.page.waitForTimeout(1000);
        await this.cartButton.click();
        await this.page.waitForTimeout(2000);
        await this.navCartButton.hover();                                                                                                              
        await this.navCartDropdown.waitFor({state: 'visible'});
        const productTitles = await this.ddProductInfo.allInnerTexts();
        const uniqueTitles = new Set(productTitles.map(t => t.trim()));
        expect(uniqueTitles.size).toBe(productTitles.length);
        await this.navCartButton.click();
        await this.page.waitForURL(/cart/);
        await this.productRow.first().waitFor({state: 'visible'});
        const itemCount = await this.productRow.count();
        for(let i=0; i<itemCount; i++){
            const itemName = await this.productRow.nth(i).getByTestId('product-title').innerText();
            const itemSize = await this.productRow.nth(i).getByTestId('product-variant').innerText();
            const sizeValue = await itemSize.split(':')[1].trim();
            const currentQuantity = await this.productRow.nth(i).getByTestId('product-select-button').locator('option:checked').innerText();
            cartItems.push({
                name: itemName,
                size: sizeValue,
                quantity: currentQuantity
            }) 
        }

        return cartItems;


    }

    async removeProductsFromCart(){
        // await this.page.waitForTimeout(2000);
        await this.productRow.first().waitFor({state: 'visible'});
        const cartItemCount = await this.productRow.count();
        console.log('Product count is: ',cartItemCount);
       for (let i = cartItemCount - 1; i >= 0; i--) {
            await this.productRow.locator('button').first().click();
            // await expect(this.productRow.nth(i)).toHaveCount(0);
            await this.page.waitForTimeout(500);     
        }
        await this.emptyCartMessage.waitFor({state: 'visible'});
        await expect(this.emptyCartMessage).toBeVisible();
        const cartCount = (await this.navCartButton.innerText()).match(/\((\d+)\)/)[1];
        // expect(cartCount).toBe('0');
        return cartCount;


    }

    async verifyCartPersistence(cartItems){
        await this.page.goto('/');
        await this.page.waitForURL('https://store.solception.com/dk');
        // await this.page.waitForURL(new RegExp(`^${process.env.STORE_URL}.*`));
        await this.page.goto('/store');
        await this.page.waitForURL('https://store.solception.com/dk/store');
        // await this.page.waitForURL(new RegExp(`^${process.env.STORE_URL}.*`));
        await this.page.goto('/cart');
        await this.productRow.first().waitFor({state: 'visible'});
        const itemCount = await this.productRow.count();
        for(let i=0; i<itemCount; i++){
            const itemName = await this.productRow.nth(i).getByTestId('product-title').innerText();
            const itemSize = await this.productRow.nth(i).getByTestId('product-variant').innerText();
            const sizeValue = await itemSize.split(':')[1].trim();
            const currentQuantity = await this.productRow.nth(i).getByTestId('product-select-button').locator('option:checked').innerText();
            expect(itemName.trim()).toBe(cartItems[i].name);
            expect(sizeValue).toBe(cartItems[i].size);
            expect(currentQuantity.trim()).toBe(cartItems[i].quantity.toString());
        }

    }

    async switchCountry(){
        let productCurrency, currencySymbol;
        await this.page.goto('/store');
        await this.products.first().waitFor({state: 'visible'});
        productCurrency = await this.products.first().getByTestId('price').innerText();
        currencySymbol = await productCurrency.replace(/[0-9.,]/g, "").trim();
        expect(currencySymbol).toBe('€');
        await this.navMenuButton.click();
        await this.navMenuPopup.waitFor({state: 'visible'});
        await this.page.locator('div>span', { hasText: 'Shipping to:'}).locator('span').last().click();
        await this.countryList.waitFor({state: 'visible'});
        const regions = await this.countryList.getByRole('option');
        const regionCount = await regions.count();
        for(let i=0; i<regionCount; i++){
            const regionName = await regions.nth(i).innerText();
            // console.log('Country name is: ',regionName)
            if(regionName.toLowerCase() == 'united states'){
                // console.log('Matched region is: ',regionName);
                await regions.nth(i).click();
                break;
            }
        }
        await this.navMenuPopup.waitFor({state: 'hidden'});
        await this.page.waitForURL(/\/us\//);
        await this.products.first().waitFor({ state: 'visible' });
        productCurrency = await this.products.first().getByTestId('price').innerText();
        currencySymbol = await productCurrency.replace(/[0-9.,]/g, "").trim();
        expect(currencySymbol).toBe('$');
        const price = productCurrency.replace(/[^0-9.]/g, "");
        expect(price).not.toBe('0.00');
        expect(price).not.toBe('');

    }
}

module.exports=CartPage;