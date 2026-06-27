'use strict';

module.exports = {
  type: 'object',
  required: ['customer'],
  properties: {
    customer: {
      type: 'object',
      required: ['id', 'email', 'created_at'],
      properties: {
        id:         { type: 'string' },
        email:      { type: 'string' },
        first_name: { type: ['string', 'null'] },
        last_name:  { type: ['string', 'null'] },
        phone:      { type: ['string', 'null'] },   
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        addresses: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id'],
            properties: {
              id:         { type: 'string' },
              address_1:  { type: ['string', 'null'] },
              city:       { type: ['string', 'null'] },
              country_code: { type: ['string', 'null'] },
              postal_code:  { type: ['string', 'null'] },
            },
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};