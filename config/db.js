'use strict';

const { createClient } = require('@libsql/client');

// Validate required env vars early so the error is obvious
if (!process.env.TURSO_DATABASE_URL) {
  throw new Error('Missing environment variable: TURSO_DATABASE_URL');
}
if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Missing environment variable: TURSO_AUTH_TOKEN');
}

const db = createClient({
  url:       process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

module.exports = db;
