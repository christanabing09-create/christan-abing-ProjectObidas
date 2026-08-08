'use strict';

const db = require('../config/db');

// ─────────────────────────────────────────────────────────────────────────────
// Schema bootstrap — run once on cold start to ensure the table exists.
// Turso (libSQL) supports CREATE TABLE IF NOT EXISTS, so this is idempotent.
// ─────────────────────────────────────────────────────────────────────────────
const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS user (
    user_id              INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_login           TEXT     NOT NULL DEFAULT '',
    user_pass            TEXT     NOT NULL DEFAULT '',
    fname                TEXT     NOT NULL,
    lname                TEXT     NOT NULL,
    gender               TEXT     NOT NULL,
    user_level           INTEGER  NOT NULL DEFAULT 0,
    branch_cd            TEXT     NOT NULL DEFAULT '',
    email                TEXT     NOT NULL DEFAULT '',
    registered           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_activation_key  TEXT     NOT NULL DEFAULT '',
    isActive             INTEGER  NOT NULL DEFAULT 1
  )
`;

async function initTable() {
  await db.execute(CREATE_TABLE_SQL);
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch all users (password hash excluded).
 */
async function findAll() {
  const result = await db.execute(`
    SELECT
      user_id, user_login, fname, lname, gender,
      user_level, branch_cd, email, registered,
      user_activation_key, isActive
    FROM user
    ORDER BY user_id ASC
  `);
  return result.rows;
}

/**
 * Fetch a single user by primary key (password hash excluded).
 * @param {number|string} id
 */
async function findById(id) {
  const result = await db.execute({
    sql: `
      SELECT
        user_id, user_login, fname, lname, gender,
        user_level, branch_cd, email, registered,
        user_activation_key, isActive
      FROM user
      WHERE user_id = ?
    `,
    args: [id],
  });
  return result.rows[0] || null;
}

/**
 * Check whether a user_login already exists (used for uniqueness validation).
 * @param {string} userLogin
 * @param {number|null} excludeId  — pass a user_id to exclude that row (for PUT)
 */
async function findByLogin(userLogin, excludeId = null) {
  const sql = excludeId
    ? 'SELECT user_id FROM user WHERE user_login = ? AND user_id != ?'
    : 'SELECT user_id FROM user WHERE user_login = ?';

  const args = excludeId ? [userLogin, excludeId] : [userLogin];
  const result = await db.execute({ sql, args });
  return result.rows[0] || null;
}

/**
 * Insert a new user.
 * @param {object} data  — must include a pre-hashed user_pass
 * @returns {object} newly created user (without password)
 */
async function create(data) {
  const {
    user_login,
    user_pass,          // already hashed
    fname,
    lname,
    gender,
    user_level   = 0,
    branch_cd    = '',
    email        = '',
    user_activation_key = '',
    isActive     = 1,
  } = data;

  const result = await db.execute({
    sql: `
      INSERT INTO user
        (user_login, user_pass, fname, lname, gender,
         user_level, branch_cd, email, user_activation_key, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      user_login, user_pass, fname, lname, gender,
      user_level, branch_cd, email, user_activation_key, isActive,
    ],
  });

  const newId = Number(result.lastInsertRowid);
  return findById(newId);
}

/**
 * Update an existing user.
 * @param {number|string} id
 * @param {object} fields  — only the fields that should change
 * @returns {object|null} updated user or null if not found
 */
async function update(id, fields) {
  // Build SET clause dynamically from provided fields
  const allowed = [
    'user_login', 'user_pass', 'fname', 'lname', 'gender',
    'user_level', 'branch_cd', 'email', 'user_activation_key', 'isActive',
  ];

  const setClauses = [];
  const args       = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${key} = ?`);
      args.push(fields[key]);
    }
  }

  if (setClauses.length === 0) return findById(id); // nothing to update

  args.push(id); // for WHERE clause

  await db.execute({
    sql: `UPDATE user SET ${setClauses.join(', ')} WHERE user_id = ?`,
    args,
  });

  return findById(id);
}

/**
 * Delete a user by primary key.
 * @param {number|string} id
 * @returns {boolean} true if a row was deleted
 */
async function remove(id) {
  const result = await db.execute({
    sql:  'DELETE FROM user WHERE user_id = ?',
    args: [id],
  });
  return result.rowsAffected > 0;
}

module.exports = { initTable, findAll, findById, findByLogin, create, update, remove };
