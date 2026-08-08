'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/userController');
const userModel  = require('../models/userModel');

// Bootstrap the DB table the first time this module is loaded.
// Using an IIFE so we can await without making the whole module async.
(async () => {
  try {
    await userModel.initTable();
    console.log('✅  user table is ready');
  } catch (err) {
    console.error('❌  Failed to initialise user table:', err.message);
  }
})();

// ── CRUD routes ───────────────────────────────────────────────────────────────
router.get('/',      controller.getAllUsers);
router.get('/:id',   controller.getUserById);
router.post('/',     controller.createUser);
router.put('/:id',   controller.updateUser);
router.delete('/:id',controller.deleteUser);

module.exports = router;
