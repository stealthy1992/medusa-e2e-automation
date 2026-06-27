'use strict';

module.exports = {
  type: 'object',
  required: ['orders', 'count', 'offset', 'limit'],
  properties: {
    orders: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'status', 'total', 'currency_code', 'payment_status', 'fulfillment_status', 'items', 'created_at'],
        properties: {
          id:                  { type: 'string' },
          status:              { type: 'string' },
          total:               { type: 'number' },
          currency_code:       { type: 'string' },
          payment_status:      { type: 'string' },
          fulfillment_status:  { type: 'string' },
          created_at:          { type: 'string' },
          subtotal:            { type: 'number' },
          discount_total:      { type: 'number' },
          shipping_total:      { type: 'number' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['id', 'title', 'quantity', 'unit_price'],
              properties: {
                id:         { type: 'string' },
                title:      { type: 'string' },
                quantity:   { type: 'number' },
                unit_price: { type: 'number' },
              },
              additionalProperties: true,
            },
          },
          shipping_address: { type: ['object', 'null'] },
        },
        additionalProperties: true,
      },
    },
    count:  { type: 'number' },
    offset: { type: 'number' },
    limit:  { type: 'number' },
  },
  additionalProperties: true,
};