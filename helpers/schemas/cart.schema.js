'use strict';

module.exports = {
  type: 'object',
  required: ['cart'],
  properties: {
    cart: {
      type: 'object',
      required: ['id', 'items', 'subtotal', 'discount_total', 'shipping_total', 'total', 'currency_code', 'region'],
      properties: {
        id:               { type: 'string' },
        currency_code:    { type: 'string' },
        subtotal:         { type: 'number' },
        discount_total:   { type: 'number' },
        shipping_total:   { type: 'number' },
        total:            { type: 'number' },
        email:            { type: ['string', 'null'] },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title', 'quantity', 'unit_price'],
            properties: {
              id:         { type: 'string' },
              title:      { type: 'string' },
              quantity:   { type: 'number' },
              unit_price: { type: 'number' },
              subtotal:   { type: 'number' },
              thumbnail:  { type: ['string', 'null'] },
              variant_id: { type: ['string', 'null'] },
            },
            additionalProperties: true,
          },
        },
        region: {
          type: 'object',
          required: ['id', 'name', 'currency_code'],
          properties: {
            id:            { type: 'string' },
            name:          { type: 'string' },
            currency_code: { type: 'string' },
          },
          additionalProperties: true,
        },
        shipping_address: { type: ['object', 'null'] },
        billing_address:  { type: ['object', 'null'] },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};