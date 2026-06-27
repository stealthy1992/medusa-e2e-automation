'use strict';

const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

/**
 * Validates a response body against a JSON schema.
 * Throws a descriptive error listing all violations if validation fails.
 *
 * @param {object} body     - Parsed JSON response body
 * @param {object} schema   - ajv-compatible JSON Schema object
 * @param {string} label    - Human-readable label for error messages
 */
function validateSchema(body, schema, label) {
  const valid = ajv.validate(schema, body);
  if (!valid) {
    const errors = ajv.errors
      .map((e) => `  • ${e.instancePath || '(root)'} ${e.message}`)
      .join('\n');
    throw new Error(`Schema validation failed for [${label}]:\n${errors}`);
  }
}

module.exports = { validateSchema };