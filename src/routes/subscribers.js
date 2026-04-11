const express = require('express');
const { check, validationResult } = require('express-validator');
const subscriberService = require('../services/subscriberService');

const router = express.Router();

const subscriberValidators = [
  check('email').trim().isEmail().withMessage('Email inválido.')
];

router.get('/', async (req, res, next) => {
  try {
    const subscribers = await subscriberService.getAllSubscribers();
    res.json({ success: true, subscribers });
  } catch (error) {
    next(error);
  }
});

router.post('/', subscriberValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const subscriber = await subscriberService.createSubscriber({ email });
    res.status(201).json({ success: true, subscriber, message: 'Email cadastrado com sucesso. Obrigado!' });
  } catch (error) {
    if (
      error.code === 'DUPLICATE_EMAIL' ||
      error.code === 11000 ||
      error.name === 'MongoServerError' ||
      (error.message && error.message.includes('duplicate key'))
    ) {
      return res.status(409).json({ success: false, error: 'Este email já está cadastrado.' });
    }
    next(error);
  }
});

module.exports = router;
