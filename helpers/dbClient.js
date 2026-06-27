require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:Admin12345@localhost/medusa-medusa-store',
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function close() {
  await pool.end();
}

module.exports = { query, close };
