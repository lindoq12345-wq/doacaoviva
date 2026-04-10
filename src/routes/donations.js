const express = require('express');
const { check, validationResult } = require('express-validator');
const donationService = require('../services/donationService');

const router = express.Router();

const donationValidators = [
  check('nome').trim().notEmpty().withMessage('Nome é obrigatório.'),
  check('email').trim().isEmail().withMessage('Email inválido.'),
  check('valor').trim().isFloat({ gt: 0 }).withMessage('Valor deve ser maior que zero.'),
  check('mensagem')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Mensagem deve ter no máximo 500 caracteres.')
];

router.get('/', async (req, res, next) => {
  try {
    const donations = await donationService.getAllDonations();
    res.json({ success: true, donations });
  } catch (error) {
    next(error);
  }
});

router.post('/', donationValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { nome, email, valor, mensagem } = req.body;

  try {
    const donation = await donationService.createDonation({
      nome,
      email,
      valor: parseFloat(valor),
      mensagem: mensagem || ''
    });
    res.status(201).json({ success: true, donation, message: 'Doação registrada com sucesso.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
