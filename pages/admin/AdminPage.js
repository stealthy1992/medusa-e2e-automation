const { expect } = require('@playwright/test');

class AdminPage{
    constructor(page){
        this.page = page;
        this.adminEmail = page.getByRole('button', { name: 'admin@medusa-test.com' });
        this.productsSection = page.getByRole('link', { name: 'Products '});
        this.createProductButton = page.getByRole('link', { name: 'Create'});
;       this.createProductForm = page.locator('div', { hasText: 'Create a new product.'}).locator('form').first();
        this.productTitle = page.getByPlaceholder('Winter jacket').first();
        this.organizeSection = page.locator('[id$="-trigger-organize"]:not([disabled])').first();
        this.continueButton = page.getByText('Continue').nth(1);
        this.organizeSectionHeading = page.getByRole('heading', { name: 'Organize'});


    }

    async assertingLoggedIn(){
        await this.adminEmail.waitFor({state: 'visible'});

    }

    async createProduct(){
        // await this.page.goto('/app/products');
        await this.productsSection.click();
        await this.page.waitForURL(/\/app\/products/);
        await this.createProductButton.click();
        await this.createProductForm.waitFor({state: 'visible'});
        await this.productTitle.fill('Nike Shoes');
        // await this.continueButton.click();
        // await this.page.waitForTimeout(2000);
        await this.organizeSection.click();
        
        const activeTabCount = await this.organizeSection.count();
        console.log('Active tab count is: ',activeTabCount);
        await this.organizeSectionHeading.waitFor({state: 'visible'});
    }

    
}

module.exports=AdminPage;