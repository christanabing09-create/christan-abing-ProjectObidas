'use strict';

const bcrypt = require('bcryptjs');
const db     = require('../config/database');

const SALT_ROUNDS = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a libsql Row (array-like with named props) to a plain JS object
 * and strip the password hash before sending to the client.
 */
const sanitizeUser = (row) => {
  // Spread into a plain object so destructuring works reliably
  const plain = Object.assign({}, row);
  // Remove the password hash – never expose it in API responses
  delete plain.user_pass;
  return plain;
};

/**
 * Quick field-presence check. Accepts 0 and false as valid values.
 */
const isMissing = (value) =>
  value === undefined || value === null || value === '';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const findUserByEmail = async (email, excludeId = null) => {
  const normalizedEmail = normalizeEmail(email);
  const sql = excludeId
    ? 'SELECT user_id FROM users WHERE email = ? AND user_id != ?'
    : 'SELECT user_id FROM users WHERE email = ?';
  const args = excludeId ? [normalizedEmail, excludeId] : [normalizedEmail];
  const result = await db.execute({ sql, args });
  return result.rows[0] || null;
};

// ─── Required fields for POST ─────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  'user_login',
  'user_pass',
  'fname',
  'lname',
  'gender',
  'user_level',
  'branch_cd',
  'email',
  'user_activation_key',
  'isActive',
];

// ─── GET /api/users ──────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM users ORDER BY user_id ASC');
    const users  = result.rows.map(sanitizeUser);

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data:    users,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── GET /api/users/:id ──────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.execute({
      sql:  'SELECT * FROM users WHERE user_id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data:    sanitizeUser(result.rows[0]),
    });
  } catch (err) {
    return next(err);
  }
};

// ─── POST /api/users ─────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const body = req.body;

    // ── Validate required fields ──────────────────────────────────────────────
    const missing = REQUIRED_FIELDS.filter((f) => isMissing(body[f]));
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    const {
      user_login,
      user_pass,
      fname,
      lname,
      gender,
      user_level,
      branch_cd,
      email,
      user_activation_key,
      isActive,
    } = body;

    const normalizedEmail = normalizeEmail(email);
    const existingEmail = await findUserByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email is already in use',
      });
    }

    // ── Hash the password before storing ─────────────────────────────────────
    const hashedPassword = await bcrypt.hash(String(user_pass), SALT_ROUNDS);

    // ── Insert ────────────────────────────────────────────────────────────────
    const insertResult = await db.execute({
      sql: `
        INSERT INTO users
          (user_login, user_pass, fname, lname, gender,
           user_level, branch_cd, email, user_activation_key, isActive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        String(user_login),
        hashedPassword,
        String(fname),
        String(lname),
        String(gender),
        Number(user_level),
        String(branch_cd),
        normalizedEmail,
        String(user_activation_key),
        Number(isActive),
      ],
    });

    // lastInsertRowid is a BigInt in newer libsql versions – convert safely
    const newId = Number(insertResult.lastInsertRowid);

    // ── Fetch the newly created row to return it ──────────────────────────────
    const newUserResult = await db.execute({
      sql:  'SELECT * FROM users WHERE user_id = ?',
      args: [newId],
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data:    sanitizeUser(newUserResult.rows[0]),
    });
  } catch (err) {
    return next(err);
  }
};

// ─── PUT /api/users/:id ──────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ── Confirm the user exists ───────────────────────────────────────────────
    const existing = await db.execute({
      sql:  'SELECT * FROM users WHERE user_id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const current = Object.assign({}, existing.rows[0]);
    const body    = req.body;

    // ── If a new password is supplied, hash it; otherwise keep the old hash ───
    let hashedPassword = current.user_pass;
    if (!isMissing(body.user_pass)) {
      hashedPassword = await bcrypt.hash(String(body.user_pass), SALT_ROUNDS);
    }

    // ── Use incoming value if provided, otherwise fall back to current value ──
    const updatedLogin           = !isMissing(body.user_login)           ? String(body.user_login)           : current.user_login;
    const updatedFname           = !isMissing(body.fname)                ? String(body.fname)                : current.fname;
    const updatedLname           = !isMissing(body.lname)                ? String(body.lname)                : current.lname;
    const updatedGender          = !isMissing(body.gender)               ? String(body.gender)               : current.gender;
    const updatedUserLevel       = !isMissing(body.user_level)           ? Number(body.user_level)           : current.user_level;
    const updatedBranchCd        = !isMissing(body.branch_cd)            ? String(body.branch_cd)            : current.branch_cd;
    const updatedEmailRaw       = !isMissing(body.email)                ? String(body.email)                : current.email;
    const updatedEmail          = normalizeEmail(updatedEmailRaw);
    const updatedActivationKey  = !isMissing(body.user_activation_key)  ? String(body.user_activation_key)  : current.user_activation_key;
    const updatedIsActive       = body.isActive !== undefined            ? Number(body.isActive)             : current.isActive;

    if (updatedEmail !== normalizeEmail(current.email)) {
      const existingEmail = await findUserByEmail(updatedEmail, id);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email is already in use',
        });
      }
    }

    await db.execute({
      sql: `
        UPDATE users SET
          user_login          = ?,
          user_pass           = ?,
          fname               = ?,
          lname               = ?,
          gender              = ?,
          user_level          = ?,
          branch_cd           = ?,
          email               = ?,
          user_activation_key = ?,
          isActive            = ?
        WHERE user_id = ?
      `,
      args: [
        updatedLogin,
        hashedPassword,
        updatedFname,
        updatedLname,
        updatedGender,
        updatedUserLevel,
        updatedBranchCd,
        updatedEmail,
        updatedActivationKey,
        updatedIsActive,
        id,
      ],
    });

    // ── Return the updated row ────────────────────────────────────────────────
    const updated = await db.execute({
      sql:  'SELECT * FROM users WHERE user_id = ?',
      args: [id],
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data:    sanitizeUser(updated.rows[0]),
    });
  } catch (err) {
    return next(err);
  }
};

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db.execute({
      sql:  'SELECT user_id, fname, lname FROM users WHERE user_id = ?',
      args: [id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await db.execute({
      sql:  'DELETE FROM users WHERE user_id = ?',
      args: [id],
    });

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data:    null,
    });
  } catch (err) {
    return next(err);
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
