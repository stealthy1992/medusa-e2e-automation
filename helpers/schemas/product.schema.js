'use strict';

module.exports = {
  type: 'object',
  required: ['products', 'count', 'offset', 'limit'],
  properties: {
    products: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'title', 'handle', 'variants'],
        properties: {
          id:          { type: 'string' },
          title:       { type: 'string' },
          handle:      { type: 'string' },
          status:      { type: 'string' },
          description: { type: ['string', 'null'] },
          thumbnail:   { type: ['string', 'null'] },
          variants: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['id', 'title', 'sku'],
              properties: {
                id:                { type: 'string' },
                title:             { type: 'string' },
                sku:               { type: ['string', 'null'] },
                inventory_quantity: { type: 'number' },
                manage_inventory:  { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'title'],
              properties: {
                id:    { type: 'string' },
                title: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
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