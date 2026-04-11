const express = require('express');
const userService = require('../services/userService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
