const express = require('express');
const { check, validationResult } = require('express-validator');
const postService = require('../services/postService');
const userService = require('../services/userService');

const router = express.Router();

const postValidators = [
  check('authorId').trim().notEmpty().withMessage('Autor é obrigatório.'),
  check('type').trim().isIn(['necessidade', 'doacao', 'depoimento']).withMessage('Tipo de post inválido.'),
  check('content').trim().notEmpty().withMessage('Conteúdo é obrigatório.')
];

router.get('/', async (req, res, next) => {
  try {
    const posts = await postService.getAllPosts();
    res.json({ success: true, posts });
  } catch (error) {
    next(error);
  }
});

router.post('/', postValidators, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { authorId, type, content, media } = req.body;

  try {
    const author = await userService.getUserById(authorId);
    if (!author) {
      return res.status(404).json({ success: false, error: 'Autor não encontrado.' });
    }

    const post = await postService.createPost({
      authorId,
      type,
      content,
      media: media || ''
    });

    res.status(201).json({ success: true, post, message: 'Post criado com sucesso.' });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId é obrigatório para curtir.' });
    }

    const updatedPost = await postService.togglePostLike(req.params.id, userId);
    if (!updatedPost) {
      return res.status(404).json({ success: false, error: 'Post não encontrado.' });
    }

    res.json({ success: true, post: updatedPost });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
