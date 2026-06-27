import { test } from '@applitools/eyes-playwright/fixture'

test('Playwright website', async ({ page, eyes }) => {
  await page.goto('https://playwright.dev/');

  /* Full page visual check */
  await eyes.check('Home page')

  const searchBox = page.getByLabel('Search')
  
  /* Region visual check - "Search" component in light theme */
  await eyes.check('Search box in system theme', { region: searchBox })

  await page.getByLabel('Switch between dark and light').click(); // Switch to light theme

  await eyes.check('Search box in light theme', {region: searchBox})

  await page.getByLabel('Switch between dark and light').click(); // Switch to dark theme
  
  /* Region visual check - "Search" component in dark theme */
  await eyes.check('Search box in dark theme', {region: searchBox})
});
