'use strict';

const { test: base, request } = require('@playwright/test');
require('dotenv').config();

const test = base.extend({
  adminToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/user/emailpass', {
      data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
    });
    if (!res.ok()) throw new Error(`Admin auth failed: ${res.status()} ${await res.text()}`);
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },

  adminRequest: async ({ adminToken }, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  storeRequest: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  customerToken: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: process.env.BACKEND_URL });
    const res = await ctx.post('/auth/customer/emailpass', {
      data: { email: process.env.CUSTOMER_EMAIL, password: process.env.CUSTOMER_PASSWORD },
    });
    if (!res.ok()) throw new Error(`Customer auth failed: ${res.status()} ${await res.text()}`);
    const { token } = await res.json();
    await ctx.dispose();
    await use(token);
  },

  customerRequest: async ({ customerToken }, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BACKEND_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${customerToken}`,
        'x-publishable-api-key': process.env.PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
  getCustomerToken: async ({ request }, use) => {
        // Provide a factory function instead of a fixed token
        const getToken = async (email, password) => {
            const res = await request.post(
                `${process.env.BACKEND_URL}/auth/customer/emailpass`,
                { data: { email, password } }
            );
            const body = await res.json();
            return body.token;
        };
        await use(getToken);
    }
});

module.exports = { test, expect: base.expect };
