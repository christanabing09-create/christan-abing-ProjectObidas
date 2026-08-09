'use strict';

const express = require('express');
const router  = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');

// GET    /api/users        – return all users
router.get('/',     getAllUsers);

// GET    /api/users/:id    – return one user by user_id
router.get('/:id',  getUserById);

// POST   /api/users        – create a new user
router.post('/',    createUser);

// PUT    /api/users/:id    – update an existing user (full or partial)
router.put('/:id',  updateUser);

// DELETE /api/users/:id    – delete a user
router.delete('/:id', deleteUser);

module.exports = router;
