const { test, expect } = require('@playwright/test');
const { query, close } = require('../../helpers/dbClient');

test.describe('Suite 10 — DB Assertions', () => {

  test.afterAll(async () => {
    await close();
  });

  test('TC-DB-001: order row exists in DB after checkout', async () => {
    const rows = await query(
      `SELECT o.id, o.email, o.status, o.currency_code
       FROM "order" o
       WHERE o.email = $1
       ORDER BY o.id DESC
       LIMIT 1`,
      ['john@test.com']
    );

    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe('john@test.com');
    expect(rows[0].status).toBeTruthy();
    expect(rows[0].currency_code).toBeTruthy();
    console.log('TC-DB-001: order row =>', rows[0]);
  });

  test('TC-DB-002: cart_line_item rows exist for most recent order', async () => {
    const cartRows = await query(
      `SELECT id FROM "cart"
       WHERE email = $1
       ORDER BY id DESC
       LIMIT 1`,
      ['john@test.com']
    );
    expect(cartRows.length).toBe(1);

    const cartId = cartRows[0].id;

    const lineItems = await query(
      `SELECT id, title, quantity, unit_price
       FROM cart_line_item
       WHERE cart_id = $1`,
      [cartId]
    );

    expect(lineItems.length).toBeGreaterThan(0);
    expect(lineItems[0].title).toBeTruthy();
    expect(lineItems[0].quantity).toBeGreaterThan(0);
    console.log('TC-DB-002: line items =>', lineItems);
  });

  test('TC-DB-003: customer row exists in DB after registration', async () => {
    const rows = await query(
      `SELECT id, email, has_account
       FROM customer
       WHERE email = $1`,
      ['john@test.com']
    );

    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe('john@test.com');
    expect(rows[0].has_account).toBe(true);
    console.log('TC-DB-003: customer row =>', rows[0]);
  });

  test('TC-DB-004: cart has completed_at populated after checkout', async () => {
    const rows = await query(
      `SELECT id, email, completed_at
       FROM cart
       WHERE email = $1
         AND completed_at IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 1`,
      ['john@test.com']
    );

    expect(rows.length).toBe(1);
    expect(rows[0].completed_at).not.toBeNull();
    console.log('TC-DB-004: completed cart =>', rows[0]);
  });

  test('TC-DB-005: inventory_level stocked_quantity is non-negative after order', async () => {
    const rows = await query(
      `SELECT il.id, il.stocked_quantity, il.reserved_quantity
      FROM inventory_level il
      INNER JOIN inventory_item ii ON ii.id = il.inventory_item_id
      INNER JOIN product_variant_inventory_item pvii ON pvii.inventory_item_id = ii.id
      INNER JOIN product_variant pv ON pv.id = pvii.variant_id
      INNER JOIN product p ON p.id = pv.product_id
      WHERE p.handle = $1
        AND pvii.deleted_at IS NULL
      LIMIT 1`,
      [process.env.TEST_PRODUCT_HANDLE || 'sweatshirt']
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].stocked_quantity).toBeGreaterThanOrEqual(0);
    console.log('TC-DB-005: inventory level =>', rows[0]);
  });

});
