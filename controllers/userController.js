'use strict';

const userModel          = require('../models/userModel');
const { hashPassword }   = require('../utils/hash');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────────────────────
async function getAllUsers(req, res, next) {
  try {
    const users = await userModel.findAll();

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      count:   users.length,
      data:    users,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
async function getUserById(req, res, next) {
  try {
    const id   = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID — must be a positive integer',
      });
    }

    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data:    user,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// ─────────────────────────────────────────────────────────────────────────────
async function createUser(req, res, next) {
  try {
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
    } = req.body;

    // ── Required field validation ─────────────────────────────────────────────
    const missing = [];
    if (!user_login || String(user_login).trim() === '') missing.push('user_login');
    if (!user_pass  || String(user_pass).trim()  === '') missing.push('user_pass');
    if (!fname      || String(fname).trim()      === '') missing.push('fname');
    if (!lname      || String(lname).trim()      === '') missing.push('lname');
    if (!gender     || String(gender).trim()     === '') missing.push('gender');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
    }

    // ── Uniqueness check on user_login ────────────────────────────────────────
    const existing = await userModel.findByLogin(String(user_login).trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Username "${user_login}" is already taken`,
      });
    }

    // ── Hash password before storing ──────────────────────────────────────────
    const hashedPassword = await hashPassword(String(user_pass));

    // ── Persist ───────────────────────────────────────────────────────────────
    const newUser = await userModel.create({
      user_login:          String(user_login).trim(),
      user_pass:           hashedPassword,
      fname:               String(fname).trim(),
      lname:               String(lname).trim(),
      gender:              String(gender).trim(),
      user_level:          user_level  !== undefined ? Number(user_level)  : 0,
      branch_cd:           branch_cd   !== undefined ? String(branch_cd)   : '',
      email:               email       !== undefined ? String(email)       : '',
      user_activation_key: user_activation_key !== undefined
                             ? String(user_activation_key)
                             : '',
      isActive:            isActive !== undefined ? Number(isActive) : 1,
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data:    newUser,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID — must be a positive integer',
      });
    }

    // ── Check user exists ─────────────────────────────────────────────────────
    const existingUser = await userModel.findById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ── Build the update payload ──────────────────────────────────────────────
    const {
      user_login,
      user_pass,          // optional — only hash if provided
      fname,
      lname,
      gender,
      user_level,
      branch_cd,
      email,
      user_activation_key,
      isActive,
    } = req.body;

    const updateFields = {};

    if (user_login !== undefined) {
      const trimmed = String(user_login).trim();
      if (trimmed === '') {
        return res.status(400).json({
          success: false,
          message: 'user_login cannot be empty',
        });
      }
      // Uniqueness check (exclude current user's own row)
      const taken = await userModel.findByLogin(trimmed, id);
      if (taken) {
        return res.status(409).json({
          success: false,
          message: `Username "${trimmed}" is already taken`,
        });
      }
      updateFields.user_login = trimmed;
    }

    if (user_pass !== undefined) {
      if (String(user_pass).trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'user_pass cannot be empty',
        });
      }
      updateFields.user_pass = await hashPassword(String(user_pass));
    }

    if (fname               !== undefined) updateFields.fname               = String(fname).trim();
    if (lname               !== undefined) updateFields.lname               = String(lname).trim();
    if (gender              !== undefined) updateFields.gender              = String(gender).trim();
    if (user_level          !== undefined) updateFields.user_level          = Number(user_level);
    if (branch_cd           !== undefined) updateFields.branch_cd           = String(branch_cd);
    if (email               !== undefined) updateFields.email               = String(email);
    if (user_activation_key !== undefined) updateFields.user_activation_key = String(user_activation_key);
    if (isActive            !== undefined) updateFields.isActive            = Number(isActive);

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
      });
    }

    const updatedUser = await userModel.update(id, updateFields);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data:    updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID — must be a positive integer',
      });
    }

    const deleted = await userModel.remove(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
