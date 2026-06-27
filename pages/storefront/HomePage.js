const BasePage = require("./BasePage");

class HomePage extends BasePage{
    
    constructor(page){
        super(page);
        this.page = page;
        this.categoryContainer = page.getByTestId('category-container');
        this.productList = page.getByTestId('products-list');
        this.productCard = page.getByTestId('product-wrapper');
        this.menuButton = page.getByTestId('nav-menu-button');
        this.navMenuPopUp = page.getByTestId('nav-menu-popup');
        this.countryList = page.getByRole('listbox');
        this.pagination = page.getByTestId('product-pagination');
        this.selectors = {
            cartMenuButton: this.page.locator('button', { hasText: /Cart/ }),
            exploreProductsButton: this.page.locator('button', { hasText: 'Explore products'}),
        }
        this.countryPrefixMap = {
            "United Kingdom": "gb",
            "France": "fr",
            "Germany": "de",
            "Spain": "es",
            "Sweden": "se",
            "Denmark": "dk",
            "Italy": "it"
        };
    }

    async navigateToStore(){
        await this.menuButton.click();
        await this.navMenuPopUp.waitFor({state: 'visible'});
        const navItems = await this.navMenuPopUp.locator('li');
        const navItemsCount = await navItems.count();
        for(let i=0; i<navItemsCount; i++){
            const item = await navItems.nth(i).innerText();
            if(item == 'Store'){
                await navItems.nth(i).click();
                break;
            }
        }
        await this.page.waitForURL(/.*store.*/);
    }
    

    async exploreProducts(){
        await this.selectors.cartMenuButton.click();
        await this.selectors.exploreProductsButton.waitFor({state: 'visible'});
        await this.selectors.exploreProductsButton.click();
        await this.categoryContainer.waitFor({state: 'visible'});
        const products = await this.productCard.count();
        console.log('Listed products are: ',products);
        // await this.page.pause(2000);

    }

    async assertBannerElement(){
        
        const isVisible = await this.page.locator('div>div', { has: this.page.locator('h1', { hasText: 'Ecommerce Starter Template'})}).isVisible();
        return isVisible;
    }

    async countFeaturedProducts(){
        const featuredProducts = await this.page.locator('.py-12 ul li').count();
        return featuredProducts;
    }

    async verifyProductCountByRegion(region) {
        let countryPrefix;
        let uiProducts = [];

        await this.menuButton.click();
        await this.page.locator('div>span', { hasText: 'Shipping to:' }).locator('span').last().click();
        await this.countryList.waitFor({ state: 'visible' });
        const regions = await this.countryList.getByRole('option');
        const regionCount = await regions.count();
        for (let i = 0; i < regionCount; i++) {
            const regionName = await regions.nth(i).innerText();
            if (regionName.toLowerCase() === region.toLowerCase()) {
            await regions.nth(i).click();
            break;
            }
        }

        countryPrefix = this.countryPrefixMap[region];
        await this.page.waitForURL(`https://store.solception.com/${countryPrefix}/store`);

        let currentPage = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            // Wait for product list to render on current page
            await this.productList.waitFor({ state: 'visible' });
            await this.productCard.first().waitFor({ state: 'visible', timeout: 10000 });

            // Scroll to bottom to ensure all cards on this page are rendered
            await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.page.waitForLoadState('networkidle');

            // Collect all products on current page
            const productCount = await this.productCard.count();
            for (let i = 0; i < productCount; i++) {
            await this.productCard.nth(i).scrollIntoViewIfNeeded();
            const productName = await this.productCard.nth(i).getByTestId('product-title').innerText();
            const productPrice = await this.productCard.nth(i).getByTestId('price').innerText();
            uiProducts.push({ productName, productPrice });
            }

            // Check if a next page button exists and is enabled
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

    async directNavigationToStore(region){
            await this.page.goto(`https://store.solception.com/${region}/store`);
            const title = await this.page.title();
            console.log(`Page title is ${title}`);
            const heading = await this.page.locator('h1').innerText();
            return { title, heading };
    }
}

module.exports=HomePage;