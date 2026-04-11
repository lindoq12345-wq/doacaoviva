const express = require('express');
const { check, validationResult } = require('express-validator');
const userService = require('../services/userService');

const router = express.Router();

const registerValidators = [
  check('name').trim().notEmpty().withMessage('Nome é obrigatório.'),
  check('email').trim().isEmail().withMessage('Email inválido.'),
  check('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres.'),
  check('city').trim().notEmpty().withMessage('Cidade é obrigatória.'),
  check('type').trim().isIn(['doador', 'necessitado']).withMessage('Tipo deve ser doador ou necessitado.'),
  check('pixKey').trim().notEmpty().withMessage('Chave Pix é obrigatória.')
];

const loginValidators = [
  check('email').trim().isEmail().withMessage('Email inválido.'),
  check('password').notEmpty().withMessage('Senha é obrigatória.')
];

router.post('/register', registerValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, city, type, pixKey, bio } = req.body;

  try {
    const user = await userService.createUser({
      name,
      email,
      password,
      city,
      type,
      pixKey,
      bio: bio || ''
    });

    res.status(201).json({ success: true, user, message: 'Cadastro realizado com sucesso.' });
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ success: false, error: 'Este email já está cadastrado.' });
    }
    next(error);
  }
});

router.post('/login', loginValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await userService.authenticate({ email, password });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou senha inválidos.' });
    }

    res.json({ success: true, user, message: 'Login realizado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
